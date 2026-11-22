import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  const [page, setPage] = useState('main');
  const [issue, setIssue] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [jira, setJira] = useState({ baseUrl: '', email: '', token: '' });
  const [llm, setLlm] = useState({ groqKey: '', groqUrl: 'https://api.groq.com/openai/v1', ollamaUrl: '' });

  async function generate(event) {
    event.preventEvent?.();
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setStatus('Loading Jira issue...');
    setPlan('');
    try {
      const response = await fetch('/api/test-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId: issue, jira, llm })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not generate test plan.');
      setPlan(data.plan);
      setStatus(data.source === 'groq'
        ? `DRAFT — ${data.issueKey} (Groq-generated)`
        : `DRAFT — ${data.issueKey} (template fallback; not AI-generated)`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function testConnection(type) {
    setStatus('Testing connection...');
    try {
      const response = await fetch(`/api/test/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type === 'jira' ? jira : llm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Connection failed.');
      setStatus(data.message);
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <main className="shell">
      {page === 'main' ? (
        <section className="card main-card">
          <h1>AI Test Plan Generator</h1>
          <form onSubmit={generate}>
            <label htmlFor="issue">Jira ticket</label>
            <input id="issue" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="QA-123" />
            <button className="primary" type="submit" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Test Plan'}
            </button>
          </form>
          {status && <p className="status">{status}</p>}
          {plan && (
            <article className="plan">
              <pre>{plan}</pre>
            </article>
          )}
          <button className="secondary" onClick={() => setPage('settings')}>Settings</button>
        </section>
      ) : (
        <section className="card settings-card">
          <div className="settings-head">
            <h1>Settings</h1>
            <button className="secondary" onClick={() => setPage('main')}>Back</button>
          </div>
          <div className="settings-grid">
            <fieldset>
              <legend>Jira Connection</legend>
              <input aria-label="Jira URL" value={jira.baseUrl} onChange={(e) => setJira({ ...jira, baseUrl: e.target.value })} placeholder="Jira URL" />
              <input aria-label="Jira email" value={jira.email} onChange={(e) => setJira({ ...jira, email: e.target.value })} placeholder="Email" />
              <input aria-label="Jira token" type="password" value={jira.token} onChange={(e) => setJira({ ...jira, token: e.target.value })} placeholder="API token" />
              <button type="button" onClick={() => testConnection('jira')}>Test Connection</button>
            </fieldset>
            <fieldset>
              <legend>LLM Configuration</legend>
              <input aria-label="Groq API key" type="password" value={llm.groqKey} onChange={(e) => setLlm({ ...llm, groqKey: e.target.value })} placeholder="Groq API key" />
              <input aria-label="Ollama URL" value={llm.ollamaUrl} onChange={(e) => setLlm({ ...llm, ollamaUrl: e.target.value })} placeholder="Ollama URL (optional)" />
              <button type="button" onClick={() => testConnection('groq')}>Test Groq</button>
              <button type="button" onClick={() => testConnection('ollama')} disabled={!llm.ollamaUrl}>Test Ollama</button>
              {status && <p className="status">{status}</p>}
            </fieldset>
          </div>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
