import assert from 'node:assert/strict';
import test from 'node:test';
import { extractIssueFacts, normalizeIssueKey } from '../src/backend/jira.js';

test('normalizes a valid Jira issue key and rejects malformed input', () => {
  assert.equal(normalizeIssueKey(' vwo-140 '), 'VWO-140');
  assert.throws(() => normalizeIssueKey('VWO-0'), { status: 400 });
  assert.throws(() => normalizeIssueKey('not-an-issue'), { status: 400 });
});

test('extracts criteria by Jira field name and preserves the source field ID', () => {
  const facts = extractIssueFacts({
    key: 'VWO-140',
    fields: {
      summary: 'Save profile',
      description: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'As a user, I can save my profile.' }] }]
      },
      customfield_10400: 'Profile changes are saved.'
    }
  }, [
    { id: 'summary', name: 'Summary' },
    { id: 'description', name: 'Description' },
    { id: 'customfield_10400', name: 'Acceptance Criteria' }
  ]);

  assert.equal(facts.key, 'VWO-140');
  assert.equal(facts.title, 'Save profile');
  assert.deepEqual(facts.acceptanceCriteria, [{
    fieldId: 'customfield_10400',
    fieldName: 'Acceptance Criteria',
    value: 'Profile changes are saved.'
  }]);
  assert.equal(
    facts.sourceFields.find((field) => field.fieldId === 'description').value,
    'As a user, I can save my profile.'
  );
});
