import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraft, validateDraft } from '../src/server.js';

test('local draft boundary validates input and marks output as non-executing', () => {
  assert.ok(validateDraft({}));
  const input = { title: 'Weekly product review', participants: ['pm@example.com'] };
  assert.equal(validateDraft(input), null);
  const draft = createDraft(input);
  assert.equal(draft.status, 'draft');
  assert.ok(draft.id);
  assert.ok(draft.createdAt);
});
