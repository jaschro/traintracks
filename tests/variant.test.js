import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTag, normalizeVariant, sameVariant, hasAllTags, hasAnyTag, pickTag, variantSummary } from '../lib/variant.js';

test('cleanTag: trims, lowercases, collapses spaces', () => assert.equal(cleanTag('  Wide   Grip '), 'wide grip'));

test('normalizeVariant: sorts, de-duplicates, drops blanks', () => {
  assert.deepEqual(normalizeVariant(['wide', 'Incline', 'wide', ' ']), ['incline', 'wide']);
});
test('normalizeVariant: accepts the CSV form "a; b"', () => {
  assert.deepEqual(normalizeVariant('wide; incline'), ['incline', 'wide']);
});
test('normalizeVariant: missing → []', () => {
  assert.deepEqual(normalizeVariant(undefined), []);
  assert.deepEqual(normalizeVariant(null), []);
  assert.deepEqual(normalizeVariant(''), []);
});
test('normalizeVariant: machine defaults are not stored', () => {
  assert.deepEqual(normalizeVariant(['standard', 'flat'], ['standard', 'flat']), []);
  assert.deepEqual(normalizeVariant(['wide', 'flat'], ['standard', 'flat']), ['wide']);
});

test('sameVariant ignores order, case and absence vs empty', () => {
  assert.ok(sameVariant(['wide', 'incline'], ['Incline', 'wide']));
  assert.ok(sameVariant(undefined, []));
  assert.ok(!sameVariant(['wide'], []));
});

test('hasAllTags / hasAnyTag for goal filters', () => {
  assert.ok(hasAllTags(['decline', 'wide'], ['decline']));
  assert.ok(!hasAllTags(['wide'], ['decline']));
  assert.ok(hasAllTags([], []));
  assert.ok(hasAnyTag(['decline', 'wide'], ['incline', 'wide']));
  assert.ok(!hasAnyTag(['decline'], ['incline']));
});

const PUSH = { grip: ['narrow', 'standard', 'wide', 'diamond'], angle: ['flat', 'incline', 'decline'] };
const DEF = ['standard', 'flat'];

test('pickTag: one tag per group; picking it again clears it; defaults are never stored', () => {
  let v = pickTag([], PUSH, 'angle', 'incline', DEF);
  assert.deepEqual(v, ['incline']);
  v = pickTag(v, PUSH, 'grip', 'wide', DEF);
  assert.deepEqual(v, ['incline', 'wide']);
  v = pickTag(v, PUSH, 'angle', 'decline', DEF);
  assert.deepEqual(v, ['decline', 'wide']);
  assert.deepEqual(pickTag(v, PUSH, 'angle', 'decline', DEF), ['wide']);
  assert.deepEqual(pickTag(v, PUSH, 'angle', 'flat', DEF), ['wide']); // the default = plain
});

test('pickTag: free tags (no group) toggle on their own', () => {
  const v = pickTag(['incline'], PUSH, '', 'Slow Tempo', DEF);
  assert.deepEqual(v, ['incline', 'slow tempo']);
  assert.deepEqual(pickTag(v, PUSH, '', 'slow tempo', DEF), ['incline']);
});

test('variantSummary: machine group order, then free tags; empty for plain', () => {
  assert.equal(variantSummary(['incline', 'wide'], PUSH), 'wide · incline');
  assert.equal(variantSummary(['zz', 'decline', 'aa'], PUSH), 'decline · aa · zz');
  assert.equal(variantSummary([], PUSH), '');
  assert.equal(variantSummary('incline; wide', undefined), 'incline · wide');
});
