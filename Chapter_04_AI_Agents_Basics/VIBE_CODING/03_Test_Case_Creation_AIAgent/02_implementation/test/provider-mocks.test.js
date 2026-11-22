import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchJiraIssue, testJiraConnection } from '../src/backend/jira.js';
import { generateTestCases, testGroqConnection } from '../src/backend/groq.js';

const jiraConfig = {
  jiraBaseUrl: 'https://example.atlassian.net',
  jiraEmail: 'qa@example.test',
  jiraToken: 'test-token'
};

test('mocked Jira connection and retrieval preserve issue fields and acceptance criteria', async () => {
  const requestedUrls = [];
  const mockedFetch = async (url) => {
    requestedUrls.push(url);
    if (url.endsWith('/rest/api/3/myself')) return Response.json({ accountId: 'mock-account' });
    if (url.endsWith('/rest/api/3/field')) {
      return Response.json([
        { id: 'summary', name: 'Summary' },
        { id: 'customfield_10400', name: 'Acceptance Criteria' }
      ]);
    }
    return Response.json({
      key: 'VWO-140',
      fields: {
        summary: 'Save profile',
        description: 'The profile can be saved.',
        customfield_10400: 'Profile changes are saved.'
      }
    });
  };

  await testJiraConnection(jiraConfig, mockedFetch);
  const issue = await fetchJiraIssue('VWO-140', jiraConfig, mockedFetch);

  assert.ok(requestedUrls.some((url) => url.endsWith('/rest/api/3/myself')));
  assert.ok(requestedUrls.some((url) => url.includes('/issue/VWO-140?')));
  assert.equal(issue.title, 'Save profile');
  assert.equal(issue.acceptanceCriteria[0].fieldName, 'Acceptance Criteria');
  assert.equal(issue.acceptanceCriteria[0].value, 'Profile changes are saved.');
});

test('mocked Groq connection and generation use deterministic settings and return the document', async () => {
  const groqConfig = { groqApiKey: 'test-key', groqModel: 'test-model' };
  let generationRequest;
  const mockedFetch = async (_url, options) => {
    if (options?.method === 'POST') {
      generationRequest = JSON.parse(options.body);
      return Response.json({
        choices: [{
          message: {
            content: [
              '# Test Cases — VWO-140: Save profile',
              '## 1. Ticket Summary & Scope',
              '## 2. Gaps & Questions for the author',
              '## 3. Test Cases',
              '## 4. Test Data & Environment',
              '## 5. Coverage Matrix',
              '## 6. Assumptions & Risks',
              '## HUMAN REVIEW GATE'
            ].join('\n\n')
          }
        }]
      });
    }
    return Response.json({ data: [] });
  };

  await testGroqConnection(groqConfig, mockedFetch);
  const document = await generateTestCases({
    key: 'VWO-140',
    title: 'Save profile',
    acceptanceCriteria: [],
    sourceFields: []
  }, groqConfig, mockedFetch);

  assert.equal(generationRequest.model, 'test-model');
  assert.equal(generationRequest.temperature, 0);
  assert.equal(document.includes('## 5. Coverage Matrix'), true);
});
