import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, implementationDirectory } from './config.js';
import { fetchJiraIssue, normalizeIssueKey, testJiraConnection } from './jira.js';
import { generateTestCases, testGroqConnection, testOllamaConnection } from './groq.js';

const app = express();
const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const distributionDirectory = path.join(implementationDirectory, 'dist');

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/config-status', (_req, res) => {
  res.json({
    jiraConfigured: Boolean(config.jiraBaseUrl && config.jiraEmail && config.jiraToken),
    groqConfigured: Boolean(config.groqApiKey),
    ollamaConfigured: Boolean(config.ollamaBaseUrl)
  });
});

app.post('/api/test/jira', async (_req, res, next) => {
  try {
    await testJiraConnection();
    res.json({ message: 'Jira connection successful.' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/test/groq', async (_req, res, next) => {
  try {
    await testGroqConnection();
    res.json({ message: 'Groq connection successful.' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/test/ollama', async (_req, res, next) => {
  try {
    await testOllamaConnection();
    res.json({ message: 'Ollama connection successful.' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/generate', async (req, res, next) => {
  try {
    const issueKey = normalizeIssueKey(req.body?.issueId);
    const issue = await fetchJiraIssue(issueKey);
    const testCases = await generateTestCases(issue);
    res.json({ issueKey: issue.key, title: issue.title, testCases, status: 'DRAFT' });
  } catch (error) {
    next(error);
  }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

if (fs.existsSync(distributionDirectory)) {
  app.use(express.static(distributionDirectory));
  app.get('*', (_req, res) => res.sendFile(path.join(distributionDirectory, 'index.html')));
}

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500;
  const message = status === 500 ? 'The request could not be completed.' : error.message;
  res.status(status).json({ error: message });
});

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  app.listen(config.apiPort, '127.0.0.1', () => {
    console.log(`Jira Test Case Generator API listening on http://127.0.0.1:${config.apiPort}`);
  });
}

export default app;
