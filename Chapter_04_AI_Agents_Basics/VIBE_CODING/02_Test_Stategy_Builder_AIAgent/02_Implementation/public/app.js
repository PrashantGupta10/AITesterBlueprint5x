const mainPage = document.querySelector('#mainPage');
const settingsPage = document.querySelector('#settingsPage');
const status = document.querySelector('#status');
const settingsStatus = document.querySelector('#settingsStatus');

document.querySelector('#settingsButton').addEventListener('click', () => {
  mainPage.hidden = true;
  settingsPage.hidden = false;
});
document.querySelector('#backButton').addEventListener('click', () => {
  settingsPage.hidden = true;
  mainPage.hidden = false;
});

function getSettings() {
  return {
    jira: {
      baseUrl: document.querySelector('#jiraUrl').value,
      email: document.querySelector('#jiraEmail').value,
      token: document.querySelector('#jiraToken').value
    },
    llm: { groqKey: document.querySelector('#groqKey').value },
    ollamaUrl: document.querySelector('#ollamaUrl').value
  };
}

async function post(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const message = response.status === 404
      ? 'API route not found. Redeploy the application with its API functions.'
      : `Server returned an invalid response (HTTP ${response.status}).`;
    throw new Error(message);
  }
  if (!response.ok) throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
  return data;
}

document.querySelector('#strategyForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const issueId = document.querySelector('#issue').value.trim();
  document.querySelector('#strategy').hidden = true;
  status.textContent = 'Loading Jira issue...';
  try {
    const data = await post('/api/test-strategy', { issueId, ...getSettings() });
    document.querySelector('#strategyText').textContent = data.strategy;
    document.querySelector('#strategy').hidden = false;
    status.textContent = `DRAFT — ${data.issueKey}`;
  } catch (error) {
    status.textContent = error.message;
  }
});

async function testConnection(type) {
  settingsStatus.textContent = 'Testing connection...';
  try {
    const settings = getSettings();
    const body = type === 'jira' ? settings.jira : type === 'groq' ? settings.llm : { ollamaUrl: settings.ollamaUrl };
    const data = await post(`/api/test/${type}`, body);
    settingsStatus.textContent = data.message;
  } catch (error) {
    settingsStatus.textContent = error.message;
  }
}

document.querySelector('#testJira').addEventListener('click', () => testConnection('jira'));
document.querySelector('#testGroq').addEventListener('click', () => testConnection('groq'));
document.querySelector('#testOllama').addEventListener('click', () => testConnection('ollama'));

document.querySelector('#envFile').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const entries = new Map();
  for (const line of (await file.text()).split(/\r?\n/)) {
    const match = line.match(/^\s*(JIRA_BASE_URL|JIRA_EMAIL|JIRA_TOKEN|GROQ_API_KEY)\s*=\s*(.*)\s*$/);
    if (match) entries.set(match[1], match[2].replace(/^(['"])(.*)\1$/, '$2'));
  }
  const fields = {
    JIRA_BASE_URL: '#jiraUrl',
    JIRA_EMAIL: '#jiraEmail',
    JIRA_TOKEN: '#jiraToken',
    GROQ_API_KEY: '#groqKey'
  };
  for (const [key, selector] of Object.entries(fields)) {
    if (entries.has(key)) document.querySelector(selector).value = entries.get(key);
  }
  settingsStatus.textContent = entries.size
    ? 'Loaded configuration from the selected file. Values stay in this browser until used.'
    : 'No supported Jira or Groq settings found in that file.';
});
