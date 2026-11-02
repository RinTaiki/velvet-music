const { test } = require('node:test');
const assert = require('node:assert/strict');
const { restoreSession, parsePlayerLink, nativeLoop, shouldDismissPlayer } = require('../src/session.cjs');
const tracks = ['a', 'b', 'c'].map(id => ({ id }));
test('session restore preserves repeat, shuffle, position and the original queue', () => {
  const restored = restoreSession({ queue: ['c', 'a', 'b'], index: 1, position: 42.5, repeat: 'one', shuffle: true, originalQueue: ['a', 'b', 'c'] }, tracks);
  assert.equal(restored.queue[restored.index], 'a');
  assert.equal(restored.position, 42.5);
  assert.equal(restored.repeat, 'one');
  assert.equal(restored.shuffle, true);
  assert.deepEqual(restored.originalQueue, ['a', 'b', 'c']);
});
test('session restore filters removed songs without applying their seek position to another song', () => {
  const restored = restoreSession({ queue: ['missing', 'a', 'deleted', 'b'], index: 2, position: 120 }, tracks);
  assert.deepEqual(restored.queue, ['a', 'b']);
  assert.equal(restored.index, 1);
  assert.equal(restored.position, 0);
  assert.equal(restoreSession({ queue: ['missing'] }, tracks), null);
});
test('session restore retains a deliberately repeated queue entry', () => {
  const restored = restoreSession({ queue: ['a', 'b', 'a'], index: 2, position: 12 }, tracks);
  assert.equal(restored.index, 2);
  assert.equal(restored.position, 12);
});
test('malformed session fields receive safe defaults', () => {
  assert.equal(restoreSession(null, tracks), null);
  const restored = restoreSession({ queue: ['a'], index: -100, position: -2, repeat: 'bad', originalQueue: ['deleted'] }, tracks);
  assert.equal(restored.index, 0);
  assert.equal(restored.position, 0);
  assert.equal(restored.repeat, 'off');
  assert.deepEqual(restored.originalQueue, ['a']);
});
test('widget URLs accept only our player command allowlist', () => {
  assert.equal(parsePlayerLink('velvet://player?action=resume'), 'resume');
  assert.equal(parsePlayerLink('velvet://player?action=next'), 'next');
  assert.equal(parsePlayerLink('https://example.com/player?action=resume'), null);
  assert.equal(parsePlayerLink('velvet://player?action=delete'), null);
  assert.equal(parsePlayerLink('not a URL'), null);
});
test('repeat-one maps to the native single-track loop mode', () => {
  assert.equal(nativeLoop('one'), 'single');
  assert.equal(nativeLoop('all'), 'all');
  assert.equal(nativeLoop('off'), 'none');
});
test('downward dismiss accepts a deliberate pull or short flick, not an upward swipe or a tiny tap', () => {
  assert.equal(shouldDismissPlayer(120, 0), true);
  assert.equal(shouldDismissPlayer(40, 1.1), true);
  assert.equal(shouldDismissPlayer(8, 2), false);
  assert.equal(shouldDismissPlayer(-120, -1), false);
  assert.equal(shouldDismissPlayer(35, 0.1), false);
});
