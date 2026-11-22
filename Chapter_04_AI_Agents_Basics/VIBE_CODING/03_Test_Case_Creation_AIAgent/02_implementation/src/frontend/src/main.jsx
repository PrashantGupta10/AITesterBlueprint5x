import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
  }
  if (!response.ok) throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
  return data;
}

function App() {
  const [page, setPage] = useState('main');
  const [issueId, setIssueId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mainMessage, setMainMessage] = useState('');
  const [configStatus, setConfigStatus] = useState(null);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [testing, setTesting] = useState('');

  async function generate(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setResult(null);
    setMainMessage('Retrieving Jira issue and generating test cases…');
    try {
      const data = await requestJson('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId })
      });
      setResult(data);
      setMainMessage(`DRAFT — ${data.issueKey} (Groq-generated)`);
    } catch (error) {
      setMainMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function openSettings() {
    setPage('settings');
    setSettingsMessage('');
    try {
      setConfigStatus(await requestJson('/api/config-status'));
    } catch (error) {
      setSettingsMessage(error.message);
    }
  }

  async function testConnection(provider) {
    setTesting(provider);
    setSettingsMessage(`Testing ${provider} connection…`);
    try {
      const data = await requestJson(`/api/test/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      setSettingsMessage(data.message);
    } catch (error) {
      setSettingsMessage(error.message);
    } finally {
      setTesting('');
    }
  }

  return (
    <main className="shell">
      {page === 'main' ? (
        <section className="card main-page">
          <div className="page-heading">
            <h1>Main page</h1>
            <button className="secondary settings-button" type="button" onClick={openSettings}>Settings</button>
          </div>
          <section className={`result-panel${result ? ' has-result' : ''}`} aria-live="polite">
            {result ? (
              <>
                <div className="draft-banner">DRAFT — {result.issueKey} | Source: Jira</div>
                <pre>{result.testCases}</pre>
              </>
            ) : (
              <p>{loading ? 'Retrieving Jira issue and generating test cases…' : 'Reply with Test Cases'}</p>
            )}
          </section>
          <form className="issue-form" onSubmit={generate}>
            <label htmlFor="issueId">Jira issue ID</label>
            <input
              id="issueId"
              value={issueId}
              onChange={(event) => setIssueId(event.target.value)}
              placeholder="For example, VWO-140"
              autoComplete="off"
              required
              disabled={loading}
            />
            <button className="primary" type="submit" disabled={loading}>
              {loading ? 'Generating…' : 'Prompt (JIRA Ticket)'}
            </button>
          </form>
          <p className={`status${mainMessage && !loading && !result ? ' error' : ''}`} role="status">{mainMessage}</p>
        </section>
      ) : (
        <section className="card settings-page">
          <div className="page-heading settings-heading">
            <h1>Settings</h1>
            <button className="secondary settings-button" type="button" onClick={() => setPage('main')}>Back</button>
          </div>
          <div className="settings-grid">
            <fieldset>
              <legend>Jira Connection</legend>
              <ConfigRow label="Jira URL" configured={configStatus?.jiraConfigured} />
              <ConfigRow label="Email" configured={configStatus?.jiraConfigured} />
              <ConfigRow label="API token" configured={configStatus?.jiraConfigured} />
              <button type="button" onClick={() => testConnection('jira')} disabled={Boolean(testing)}>
                {testing === 'jira' ? 'Testing…' : 'Test Connection'}
              </button>
            </fieldset>
            <fieldset>
              <legend>LLM Configuration</legend>
              <div className="provider">
                <h2>Ollama Connection</h2>
                <ConfigRow label="Local LLM" configured={configStatus?.ollamaConfigured} />
                <button type="button" onClick={() => testConnection('ollama')} disabled={Boolean(testing)}>
                  {testing === 'ollama' ? 'Testing…' : 'Test Local LLM'}
                </button>
              </div>
              <div className="provider">
                <div className="groq-heading">
                  <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Groq.com</a>
                  <span> (API key)</span>
                </div>
                <ConfigRow label="Groq API key" configured={configStatus?.groqConfigured} />
                <button type="button" onClick={() => testConnection('groq')} disabled={Boolean(testing)}>
                  {testing === 'groq' ? 'Testing…' : 'Test Groq'}
                </button>
              </div>
            </fieldset>
          </div>
          <p className={`status${settingsMessage && !settingsMessage.includes('Testing') && !settingsMessage.includes('successful') ? ' error' : ''}`} role="status">
            {settingsMessage}
          </p>
          <p className="privacy-note">Credentials are read from the server environment and are never shown in this page.</p>
        </section>
      )}
    </main>
  );
}

function ConfigRow({ label, configured }) {
  const value = configured === undefined ? 'Checking…' : configured ? 'Configured on server' : 'Not configured';
  return (
    <div className="config-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
