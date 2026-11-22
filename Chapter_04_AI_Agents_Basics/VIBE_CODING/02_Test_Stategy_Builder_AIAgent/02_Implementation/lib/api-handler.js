import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const template = fs.readFileSync(path.join(here, '..', 'TestStrategy_Template.md'), 'utf8');
const MISSING = 'Insufficient information to determine.';

function sendJson(res, status, value) {
  if (typeof res.status === 'function') return res.status(status).json(value);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(value));
}

async function readBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
    return req.body || {};
  }
  let body = '';
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

function clean(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  if (typeof value.text === 'string') return value.text;
  if (Array.isArray(value.content)) return value.content.map(clean).filter(Boolean).join('\n');
  return '';
}

async function jiraFetch(pathname, jira) {
  const response = await fetch(`${jira.baseUrl}${pathname}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${jira.email}:${jira.token}`).toString('base64')}`,
      Accept: 'application/json'
    }
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (response.status === 401) throw Object.assign(new Error('Jira authentication failed.'), { status: 401 });
  if (response.status === 403) throw Object.assign(new Error('Jira permission denied.'), { status: 403 });
  if (response.status === 404) throw Object.assign(new Error('Jira issue was not found.'), { status: 404 });
  if (!response.ok) throw Object.assign(new Error(data.errorMessages?.join(' ') || 'Jira request failed.'), { status: response.status });
  return data;
}

function extractIssue(raw) {
  const fields = raw.fields || {};
  const acceptance = {};
  for (const [name, value] of Object.entries(fields)) {
    if (/acceptance|criteria|requirement/i.test(name) && value != null) acceptance[name] = clean(value);
  }
  return {
    key: raw.key,
    issueType: clean(fields.issuetype?.name) || MISSING,
    summary: clean(fields.summary) || MISSING,
    description: clean(fields.description) || MISSING,
    acceptanceCriteria: acceptance,
    status: clean(fields.status?.name) || MISSING,
    priority: clean(fields.priority?.name) || MISSING,
    components: Array.isArray(fields.components) ? fields.components.map(x => x.name) : [],
    labels: Array.isArray(fields.labels) ? fields.labels : [],
    parent: fields.parent ? { key: fields.parent.key, summary: clean(fields.parent.fields?.summary) } : null,
    subTasks: Array.isArray(fields.subtasks) ? fields.subtasks.map(x => ({ key: x.key, summary: clean(x.fields?.summary) })) : [],
    linkedIssues: Array.isArray(fields.issuelinks)
      ? fields.issuelinks.map(x => ({
          type: clean(x.type?.name),
          key: x.outwardIssue?.key || x.inwardIssue?.key,
          summary: clean(x.outwardIssue?.fields?.summary || x.inwardIssue?.fields?.summary)
        })).filter(x => x.key)
      : [],
    attachments: Array.isArray(fields.attachment) ? fields.attachment.map(x => x.filename) : [],
    comments: Array.isArray(fields.comment?.comments) ? fields.comment.comments.map(x => clean(x.body)) : []
  };
}

function resolveJira(body) {
  return {
    baseUrl: (body.jira?.baseUrl || process.env.JIRA_BASE_URL || '').replace(/\/+$/, ''),
    email: body.jira?.email || process.env.JIRA_EMAIL || '',
    token: body.jira?.token || process.env.JIRA_TOKEN || ''
  };
}

async function generateStrategy(issue, key) {
  if (!key) throw Object.assign(new Error('Groq API key is missing.'), { status: 400 });
  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        temperature: 0,
        messages: [
          { role: 'system', content: 'You are a senior QA architect. Generate only a test strategy draft using the exact supplied template section names and order. Never invent requirements or details. Use exact missing text: "Insufficient information to determine." Label recommendations "Proposed". Cite Jira fields.' },
          { role: 'user', content: `JIRA ISSUE:\n${JSON.stringify(issue, null, 2)}\n\nEXACT TEMPLATE:\n${template}\n\nReturn only the completed Markdown document.` }
        ]
      })
    });
  } catch {
    throw Object.assign(new Error('Could not reach Groq.'), { status: 502 });
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw Object.assign(new Error(`Groq request failed (HTTP ${response.status}). ${data.error?.message || ''}`.trim()), { status: 502 });
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw Object.assign(new Error('Groq returned an empty strategy.'), { status: 502 });
  return text;
}

export default async function handler(req, res) {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'GET' && pathname === '/api/health') return sendJson(res, 200, { ok: true });

    if (req.method === 'POST' && pathname === '/api/test/jira') {
      const body = await readBody(req);
      const jira = resolveJira({ jira: body });
      if (!jira.baseUrl || !jira.email || !jira.token) throw Object.assign(new Error('Jira configuration is missing.'), { status: 400 });
      await jiraFetch('/rest/api/3/myself', jira);
      return sendJson(res, 200, { message: 'Jira connection successful.' });
    }

    if (req.method === 'POST' && pathname === '/api/test/groq') {
      const body = await readBody(req);
      const key = body.groqKey || process.env.GROQ_API_KEY;
      if (!key) throw Object.assign(new Error('Groq API key is missing.'), { status: 400 });
      const response = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` } });
      if (!response.ok) throw Object.assign(new Error(`Groq connection failed (HTTP ${response.status}).`), { status: 502 });
      return sendJson(res, 200, { message: 'Groq connection successful.' });
    }

    if (req.method === 'POST' && pathname === '/api/test/ollama') {
      const body = await readBody(req);
      const base = (body.ollamaUrl || '').replace(/\/+$/, '');
      if (!base) throw Object.assign(new Error('Ollama URL is missing.'), { status: 400 });
      const response = await fetch(`${base}/api/tags`);
      if (!response.ok) throw Object.assign(new Error('Ollama connection failed.'), { status: 502 });
      return sendJson(res, 200, { message: 'Ollama connection successful.' });
    }

    if (req.method === 'POST' && pathname === '/api/test-strategy') {
      const body = await readBody(req);
      const issueId = String(body.issueId || '').trim().toUpperCase();
      if (!/^[A-Z][A-Z0-9]*-[1-9][0-9]*$/.test(issueId)) {
        throw Object.assign(new Error('Enter a valid Jira issue ID, for example QA-123.'), { status: 400 });
      }
      const jira = resolveJira(body);
      if (!jira.baseUrl || !jira.email || !jira.token) throw Object.assign(new Error('Jira configuration is missing.'), { status: 400 });
      const raw = await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(issueId)}?fields=*all&expand=changelog`, jira);
      const issue = extractIssue(raw);
      const strategy = await generateStrategy(issue, body.llm?.groqKey || process.env.GROQ_API_KEY);
      return sendJson(res, 200, { issueKey: issue.key, strategy, source: 'groq' });
    }

    return sendJson(res, 404, { error: 'API route not found.' });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'Test strategy request failed.' });
  }
}
