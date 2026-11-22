import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

const originalEnv = {
  JIRA_BASE_URL: process.env.JIRA_BASE_URL,
  JIRA_EMAIL: process.env.JIRA_EMAIL,
  JIRA_TOKEN: process.env.JIRA_TOKEN,
  GROQ_API_KEY: process.env.GROQ_API_KEY
};

before(() => {
  process.env.JIRA_BASE_URL = '';
  process.env.JIRA_EMAIL = '';
  process.env.JIRA_TOKEN = '';
  process.env.GROQ_API_KEY = '';
});

after(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const routes = [
  ['/api/test/jira', '../api/test/jira.js', 'Jira configuration is missing.'],
  ['/api/test/groq', '../api/test/groq.js', 'Groq API key is missing.'],
  ['/api/test/ollama', '../api/test/ollama.js', 'Ollama URL is missing.'],
  ['/api/test-strategy', '../api/test-strategy.js', 'Enter a valid Jira issue ID, for example QA-123.']
];

for (const [url, modulePath, expectedError] of routes) {
  test(`${url} resolves to the shared JSON API handler`, async () => {
    const { default: handler } = await import(modulePath);
    const response = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      }
    };

    await handler({ method: 'POST', url, body: {} }, response);

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, { error: expectedError });
  });
}
