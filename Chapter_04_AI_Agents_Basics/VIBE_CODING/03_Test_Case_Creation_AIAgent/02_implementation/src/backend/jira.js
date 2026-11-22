import { config } from './config.js';

export const MISSING = 'Insufficient information to determine.';

export function normalizeIssueKey(value) {
  const issueKey = String(value || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]*-[1-9][0-9]*$/.test(issueKey)) {
    throw Object.assign(new Error('Enter a valid Jira issue ID, for example VWO-140.'), { status: 400 });
  }
  return issueKey;
}

export function toText(value) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join('\n');
  if (!value || typeof value !== 'object') return '';
  for (const key of ['text', 'name', 'displayName', 'value', 'filename']) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
  }
  if (typeof value.key === 'string') {
    const summary = toText(value.fields?.summary);
    return summary ? `${value.key}: ${summary}` : value.key;
  }
  if (Array.isArray(value.content)) return value.content.map(toText).filter(Boolean).join('\n');
  for (const key of ['body', 'comments', 'outwardIssue', 'inwardIssue', 'fields', 'subtasks']) {
    if (value[key] != null) {
      const text = toText(value[key]);
      if (text) return text;
    }
  }
  if (value.type?.name) return toText(value.type.name);
  return '';
}

function fieldValue(fields, fieldId, fieldNames) {
  const value = fields[fieldId];
  return {
    fieldId,
    fieldName: fieldNames[fieldId] || fieldId,
    value: toText(value) || MISSING
  };
}

export function extractIssueFacts(issue, fieldCatalog = []) {
  const fields = issue.fields || {};
  const fieldNames = Object.fromEntries(
    fieldCatalog.map(({ id, name }) => [id, name]).filter(([id, name]) => id && name)
  );
  const sourceFields = [
    { fieldId: 'key', fieldName: 'Issue key', value: issue.key || MISSING },
    fieldValue(fields, 'issuetype', fieldNames),
    fieldValue(fields, 'summary', fieldNames),
    fieldValue(fields, 'description', fieldNames),
    fieldValue(fields, 'status', fieldNames),
    fieldValue(fields, 'priority', fieldNames),
    fieldValue(fields, 'labels', fieldNames),
    fieldValue(fields, 'components', fieldNames),
    fieldValue(fields, 'fixVersions', fieldNames),
    fieldValue(fields, 'parent', fieldNames),
    fieldValue(fields, 'subtasks', fieldNames),
    fieldValue(fields, 'issuelinks', fieldNames),
    fieldValue(fields, 'attachment', fieldNames),
    fieldValue(fields, 'comment', fieldNames)
  ];
  const acceptanceCriteria = Object.entries(fields)
    .map(([fieldId, value]) => ({
      fieldId,
      fieldName: fieldNames[fieldId] || fieldId,
      value: toText(value)
    }))
    .filter(({ fieldName, value }) => value && /acceptance|criteria/i.test(fieldName));

  return {
    key: issue.key || MISSING,
    title: toText(fields.summary) || MISSING,
    acceptanceCriteria,
    sourceFields
  };
}

async function jiraRequest(pathname, jiraConfig, fetcher) {
  if (!jiraConfig.jiraBaseUrl || !jiraConfig.jiraEmail || !jiraConfig.jiraToken) {
    throw Object.assign(new Error('Jira configuration is missing from the parent .env file.'), { status: 400 });
  }

  let response;
  try {
    response = await fetcher(`${jiraConfig.jiraBaseUrl}${pathname}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${jiraConfig.jiraEmail}:${jiraConfig.jiraToken}`).toString('base64')}`,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(20000)
    });
  } catch {
    throw Object.assign(new Error('Could not reach Jira. Check the server network connection and base URL.'), { status: 502 });
  }

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (response.ok) throw Object.assign(new Error('Jira returned an invalid response.'), { status: 502 });
  }

  if (response.status === 401) throw Object.assign(new Error('Jira authentication failed.'), { status: 401 });
  if (response.status === 403) throw Object.assign(new Error('Jira permission denied.'), { status: 403 });
  if (response.status === 404) throw Object.assign(new Error('Jira issue or resource was not found.'), { status: 404 });
  if (!response.ok) {
    const detail = Array.isArray(data.errorMessages) ? data.errorMessages.join(' ') : '';
    throw Object.assign(new Error(detail || `Jira request failed (HTTP ${response.status}).`), { status: response.status });
  }
  return data;
}

export async function testJiraConnection(jiraConfig = config, fetcher = fetch) {
  await jiraRequest('/rest/api/3/myself', jiraConfig, fetcher);
}

export async function fetchJiraIssue(issueKey, jiraConfig = config, fetcher = fetch) {
  const encodedKey = encodeURIComponent(issueKey);
  const [issue, fieldCatalog] = await Promise.all([
    jiraRequest(`/rest/api/3/issue/${encodedKey}?fields=*all&expand=names`, jiraConfig, fetcher),
    jiraRequest('/rest/api/3/field', jiraConfig, fetcher)
  ]);
  return extractIssueFacts(issue, Array.isArray(fieldCatalog) ? fieldCatalog : []);
}
