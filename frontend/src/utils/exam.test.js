import assert from 'node:assert/strict';
import test from 'node:test';
import { hasAnswer } from './exam.js';

test('recognizes saved zero and numeric responses as answered', () => {
  assert.equal(hasAnswer({ value: 0 }), true);
  assert.equal(hasAnswer({ value: '0' }), true);
  assert.equal(hasAnswer({ value: '  ' }), false);
});

test('recognizes selected options and empty answers', () => {
  assert.equal(hasAnswer({ value: 'A' }), true);
  assert.equal(hasAnswer({ values: ['B', 'D'] }), true);
  assert.equal(hasAnswer({ values: [] }), false);
  assert.equal(hasAnswer(undefined), false);
});
