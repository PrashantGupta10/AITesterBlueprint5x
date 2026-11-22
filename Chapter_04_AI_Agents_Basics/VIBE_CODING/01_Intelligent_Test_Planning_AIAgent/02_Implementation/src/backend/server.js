import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../../../../.env'),
  path.resolve(here, '../../../../../../.env')
];
for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

const app = express();
app.use(express.json({ limit: '1mb' }));

const MISSING = 'Insufficient information to determine.';

function cleanText(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  if (typeof value.text === 'string') return value.text;
  if (Array.isArray(value.content)) return value.content.map(cleanText).filter(Boolean).join('\n');
  return '';
}

function issueKeyIsValid(value) {
  return /^[A-Z][A-Z0-9]*-[1-9][0-9]*$/i.test(String(value || '').trim());
}

function resolveJira(body) {
  return {
    baseUrl: (body?.jira?.baseUrl || process.env.JIRA_BASE_URL || '').replace(/\/+$/, ''),
    email: body?.jira?.email || process.env.JIRA_EMAIL || '',
    token: body?.jira?.token || process.env.JIRA_TOKEN || ''
  };
}

async function fetchJira(issueId, jira) {
  if (!jira.baseUrl || !jira.email || !jira.token) {
    throw Object.assign(new Error('Jira configuration is missing.'), { status: 400 });
  }
  const url = `${jira.baseUrl}/rest/api/3/issue/${encodeURIComponent(issueId)}?fields=*all`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${jira.email}:${jira.token}`).toString('base64')}`,
      Accept: 'application/json'
    }
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (response.status === 401) throw Object.assign(new Error('Jira authentication failed.'), { status: 401 });
  if (response.status === 403) throw Object.assign(new Error('Jira permission denied.'), { status: 403 });
  if (response.status === 404) throw Object.assign(new Error('Jira issue was not found.'), { status: 404 });
  if (!response.ok) throw Object.assign(new Error(data.errorMessages?.join(' ') || 'Could not retrieve Jira issue.'), { status: response.status });
  return data;
}

async function providerFailure(response, provider) {
  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }

  const detail = payload.error?.message || payload.message;
  const safeDetail = typeof detail === 'string'
    ? detail.replace(/gsk_[A-Za-z0-9_-]+/g, '[redacted]')
    : '';
  let message = `${provider} request failed (HTTP ${response.status})`;
  if (response.status === 401 || response.status === 403) {
    message = `${provider} rejected the API key. Check that the key is active and has access.`;
  } else if (response.status === 429) {
    message = `${provider} rate limit or quota reached. Check the account limits and try again.`;
  } else if (safeDetail) {
    message += `: ${safeDetail}`;
  }
  return Object.assign(new Error(message), { status: 502 });
}

function extractIssue(issue) {
  const fields = issue.fields || {};
  const custom = {};
  for (const [key, value] of Object.entries(fields)) {
    if (/acceptance|criteria|requirement/i.test(key) && value != null) custom[key] = cleanText(value);
  }
  return {
    key: issue.key,
    title: cleanText(fields.summary) || MISSING,
    description: cleanText(fields.description) || MISSING,
    status: cleanText(fields.status?.name) || MISSING,
    priority: cleanText(fields.priority?.name) || MISSING,
    issueType: cleanText(fields.issuetype?.name) || MISSING,
    labels: Array.isArray(fields.labels) ? fields.labels.join(', ') : MISSING,
    components: Array.isArray(fields.components) ? fields.components.map((item) => item.name).join(', ') : MISSING,
    fixVersions: Array.isArray(fields.fixVersions) ? fields.fixVersions.map((item) => item.name).join(', ') : MISSING,
    custom
  };
}

function fallbackPlan(issue) {
  const customDetails = Object.entries(issue.custom).map(([key, value]) => `- ${key}: ${value}`).join('\n') || '- ' + MISSING;
  return `# Test Plan — ${issue.key}: ${issue.title}

> Status: **DRAFT — pending human review.** Not approved until a QA owner signs off.

## 1. Scope & Objectives
- **In scope:** ${issue.description}
- **Out of scope:** ${MISSING}
- **Objective:** Verify the Jira issue requirements.

## 2. Gaps & Questions for the author
| # | Area | Finding (⚠️/❌) | Question to author |
|---|------|----------------|--------------------|
| 1 | Source requirements | ⚠️ | Is the acceptance criteria complete? |

### Source details
${customDetails}

## 3. Test Scenarios
| ID | Priority | Type (pos/neg/boundary) | Scenario | Maps to (AC / gap) |
|----|----------|-------------------------|----------|--------------------|
| TS-1 | P0 | positive | Proposal: verify the documented Jira description behavior. | Jira description |

## 4. Test Data & Environment
- **Data:** ${MISSING}
- **Environment / flags:** ${MISSING}
- **Roles / permissions:** ${MISSING}

## 5. Risks & Assumptions
- **Assumptions made:** None beyond the source Jira description.
- **Risks:** ${MISSING}

## 6. Entry / Exit criteria
- **Entry:** ${MISSING}
- **Exit:** ${MISSING}

## 7. Resource Allocation
${MISSING}

## 8. Timelines, Sprint Details
${MISSING}

---
## HUMAN REVIEW GATE
- **I assumed:** No implementation behavior beyond retrieved Jira source data.
- **I could not confirm:** Test environment, data, roles, criteria, resources, and timelines.
- **Open questions blocking sign-off:** Confirm acceptance criteria and execution details.
- **Approve, or edit, before I write test cases / automation.**`;
}

async function generateWithGroq(issue, key) {
  if (!key) return null;
  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'Generate only a test plan draft. Use the exact section structure provided. Do not invent requirements. Use this exact missing-value text: "Insufficient information to determine." Label proposed testing activities as proposals.'
          },
          {
            role: 'user',
            content: `JIRA ISSUE:\n${JSON.stringify(issue, null, 2)}\n\nREQUIRED TEMPLATE:\n${fs.readFileSync(path.resolve(here, '../../TestPlan_Template.md'), 'utf8')}`
          }
        ]
      })
    });
  } catch {
    throw Object.assign(new Error('Could not reach Groq. Check the server network connection and try again.'), { status: 502 });
  }
  if (!response.ok) throw await providerFailure(response, 'Groq');
  const data = await response.json();
  const plan = data.choices?.[0]?.message?.content;
  if (typeof plan !== 'string' || !plan.trim()) {
    throw Object.assign(new Error('Groq returned an empty test plan. Please retry.'), { status: 502 });
  }
  return plan;
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/test/jira', async (req, res) => {
  try {
    const jira = resolveJira({ jira: req.body });
    const base = jira.baseUrl.replace(/\/+$/, '');
    if (!base || !jira.email || !jira.token) throw Object.assign(new Error('Jira configuration is missing.'), { status: 400 });
    const response = await fetch(`${base}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${Buffer.from(`${jira.email}:${jira.token}`).toString('base64')}`, Accept: 'application/json' }
    });
    if (response.status === 401) throw Object.assign(new Error('Jira authentication failed.'), { status: 401 });
    if (response.status === 403) throw Object.assign(new Error('Jira permission denied.'), { status: 403 });
    if (!response.ok) throw Object.assign(new Error('Jira connection failed.'), { status: response.status });
    res.json({ message: 'Jira connection successful.' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/test/groq', async (req, res) => {
  const key = req.body.groqKey || process.env.GROQ_API_KEY;
  if (!key) return res.status(400).json({ error: 'Groq API key is missing.' });
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` }
    });
    if (!response.ok) throw await providerFailure(response, 'Groq');
    res.json({ message: 'Groq connection successful.' });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || 'Could not reach Groq.' });
  }
});

app.post('/api/test/ollama', async (req, res) => {
  const base = (req.body.ollamaUrl || '').replace(/\/+$/, '');
  if (!base) return res.status(400).json({ error: 'Ollama URL is missing.' });
  try {
    const response = await fetch(`${base}/api/tags`);
    if (!response.ok) throw new Error('Ollama connection failed.');
    res.json({ message: 'Ollama connection successful.' });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post('/api/test-plan', async (req, res) => {
  const issueId = String(req.body.issueId || '').trim();
  if (!issueKeyIsValid(issueId)) return res.status(400).json({ error: 'Enter a valid Jira issue ID, for example QA-123.' });
  try {
    const jira = resolveJira(req.body);
    const raw = await fetchJira(issueId.toUpperCase(), jira);
    const issue = extractIssue(raw);
    let plan;
    const groqKey = req.body?.llm?.groqKey || process.env.GROQ_API_KEY;
    try {
      plan = await generateWithGroq(issue, groqKey);
    } catch (error) {
      throw error;
    }
    const source = plan ? 'groq' : 'rule-based';
    res.json({ issueKey: issue.key, plan: plan || fallbackPlan(issue), source });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Test plan generation failed.' });
  }
});

const dist = path.resolve(here, '../../dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = Number(process.env.PORT || 3000);
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  app.listen(port, () => console.log(`Jira Test Plan Generator running on http://localhost:${port}`));
}

export default app;
