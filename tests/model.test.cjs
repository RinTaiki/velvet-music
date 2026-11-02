const { test } = require('node:test');
const assert = require('node:assert/strict');
const { emptyLibrary, mergeImport, nextIndex, shuffled, parseFilename, albumGroups } = require('../src/model.cjs');
const a = { id: 'a', title: 'A', artist: 'One', album: 'Night' };
const b = { id: 'b', title: 'B', artist: 'Two', album: 'Night' };
test('rescanning a folder adds new tracks without duplicating or undoing playlist edits', () => {
  let library = mergeImport(emptyLibrary(), [a, a], 'Folder', 'folder-1');
  library.playlists[0].title = 'Renamed';
  library.tracks[0] = { ...a, artwork: 'Artwork/custom.jpg' };
  library = mergeImport(library, [a, b], 'Folder', 'folder-1');
  assert.equal(library.tracks.length, 2);
  assert.equal(library.tracks[0].artwork, 'Artwork/custom.jpg');
  assert.equal(library.playlists.length, 1);
  assert.equal(library.playlists[0].title, 'Renamed');
  assert.deepEqual(library.playlists[0].trackIds, ['a', 'b']);
});
test('importing into a selected playlist merges rather than creating another playlist', () => {
  let library = mergeImport(emptyLibrary(), [a], 'First', 'p');
  library = mergeImport(library, [b], 'Files', 'p');
  assert.equal(library.playlists.length, 1);
  assert.deepEqual(library.playlists[0].trackIds, ['a', 'b']);
});
test('natural queue completion respects repeat modes; manual next skips repeat-one', () => {
  assert.equal(nextIndex(0, 2, 'off'), 1);
  assert.equal(nextIndex(1, 2, 'off'), -1);
  assert.equal(nextIndex(1, 2, 'all'), 0);
  assert.equal(nextIndex(0, 2, 'one'), 0);
  assert.equal(nextIndex(0, 2, 'one', true), 1);
  assert.equal(nextIndex(1, 2, 'off', true), 0);
  assert.equal(nextIndex(0, 0, 'all'), -1);
});
test('shuffle preserves current track and every remaining queue member', () => {
  const source = ['a', 'b', 'c', 'd'];
  const result = shuffled(source, 'b', () => 0.2);
  assert.equal(result[0], 'b');
  assert.deepEqual([...result].sort(), source);
  assert.deepEqual(source, ['a', 'b', 'c', 'd']);
});
test('filename fallback keeps non-Latin titles and artist separators', () => {
  assert.deepEqual(parseFilename('江嘎组合 - 霞光.mp3'), { artist: '江嘎组合', title: '霞光' });
  assert.deepEqual(parseFilename('A - B - C.m4a'), { artist: 'A', title: 'B - C' });
  assert.deepEqual(parseFilename('Night_Walk.flac'), { artist: 'Unknown artist', title: 'Night Walk' });
});
test('shuffle retains deliberate duplicate songs in the queue', () => {
  const result = shuffled(['a', 'b', 'a'], 'a', () => 0.1);
  assert.equal(result[0], 'a');
  assert.deepEqual([...result].sort(), ['a', 'a', 'b']);
});
test('albums with matching titles by different artists remain separate', () => {
  const albums = albumGroups([a, b, { ...a, id: 'c' }]);
  assert.equal(albums.length, 2);
  assert.deepEqual(albums[0].trackIds, ['a', 'c']);
});
test('library updates do not mutate previous state', () => {
  const library = emptyLibrary();
  const snapshot = JSON.stringify(library);
  mergeImport(library, [a], 'New', 'p');
  assert.equal(JSON.stringify(library), snapshot);
});
