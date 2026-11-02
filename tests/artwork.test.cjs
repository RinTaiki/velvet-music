const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createArtworkFinder, matchingReleases, knownArtist } = require('../src/services/artworkSearch.cjs');
const { isAudioFile, qualityLabel, qualityDescription } = require('../src/audioFormats.cjs');
const id = '01234567-89ab-cdef-0123-456789abcdef';
const otherId = '11234567-89ab-cdef-0123-456789abcdef';
const track = { title: 'Night walk', artist: 'Artist', album: 'Midnight' };
const recording = { title: 'Night walk', 'artist-credit': [{ name: 'Artist' }], releases: [{ id, title: 'Midnight', status: 'Official' }] };
const response = value => ({ ok: true, status: 200, json: async () => value });
test('artwork matching rejects other artists and alternate song versions', () => {
  const wrongArtist = { ...recording, 'artist-credit': [{ name: 'Cover band' }] };
  const live = { ...recording, title: 'Night walk (live)' };
  assert.deepEqual(matchingReleases(track, [wrongArtist, live, recording]).map(r => r.id), [id]);
  assert.equal(knownArtist('Unknown artist'), false);
});
test('artwork matching handles non-Latin names and prefers the tagged album', () => {
  const r = { title: '霞光', 'artist-credit': [{ name: '江嘎组合' }], releases: [{ id: otherId, title: 'Compilation' }, { id, title: 'Album' }] };
  assert.equal(matchingReleases({ title: '霞光', artist: '江嘎组合', album: 'Album' }, [r])[0].id, id);
});
test('successful cover lookup caches the local image, not a remote dependency', async () => {
  const urls = [], saved = [];
  const finder = createArtworkFinder({
    fetchImpl: async url => { urls.push(url); return response(url.includes('musicbrainz.org') ? { recordings: [recording] } : { images: [{ front: true, thumbnails: { 500: 'https://archive.org/front.jpg' } }] }); },
    saveImage: async url => { saved.push(url); return 'Artwork/cached.jpg'; },
  });
  const result = await finder.find(track);
  assert.equal(result.artwork, 'Artwork/cached.jpg');
  assert.equal(result.artworkSource.url, `https://musicbrainz.org/release/${id}`);
  assert.deepEqual(await finder.find(track), result);
  assert.equal(urls.length, 2);
  assert.equal(saved.length, 1);
});
test('missing front cover leaves a track without guessed artwork', async () => {
  let saved = false;
  const finder = createArtworkFinder({ fetchImpl: async url => response(url.includes('musicbrainz.org') ? { recordings: [recording] } : { images: [{ front: false, image: 'https://archive.org/back.jpg' }] }), saveImage: async () => { saved = true; } });
  assert.equal(await finder.find(track), null);
  assert.equal(saved, false);
});
test('missing artist makes no network request', async () => {
  const finder = createArtworkFinder({ fetchImpl: async () => { throw new Error('Unexpected request'); }, saveImage: async () => {} });
  assert.equal(await finder.find({ title: 'Song', artist: 'Unknown artist' }), null);
});
test('canonical artist names and HTTP archive thumbnails are handled', async () => {
  const credits = [{ name: 'Alias', artist: { name: 'Artist' } }];
  let saved;
  const finder = createArtworkFinder({ fetchImpl: async url => response(url.includes('musicbrainz.org') ? { recordings: [{ ...recording, 'artist-credit': credits }] } : { images: [{ front: true, thumbnails: { large: 'http://archive.org/front.png' } }] }), saveImage: async url => { saved = url; return 'Artwork/front.png'; } });
  assert.ok(await finder.find(track));
  assert.equal(saved, 'https://archive.org/front.png');
});
test('lookups serialize, respect search rate limits, and recover after network errors', async () => {
  let clock = 0, calls = 0;
  const waits = [];
  const finder = createArtworkFinder({
    fetchImpl: async () => { if (++calls === 1) throw new Error('Offline'); return response({ recordings: [] }); },
    saveImage: async () => {}, now: () => clock, wait: async ms => { waits.push(ms); clock += ms; },
  });
  const first = finder.find(track);
  const second = finder.find({ ...track, title: 'Second' });
  await assert.rejects(first, /Offline/);
  assert.equal(await second, null);
  assert.equal(calls, 2);
  assert.deepEqual(waits, [1100]);
});
test('FLAC, MP3 and WAV imports accept case-insensitive extensions', () => {
  for (const file of ['Song.FLAC', 'track.mp3', 'Recording.WaV']) assert.equal(isAudioFile(file), true);
  assert.equal(isAudioFile('cover.jpg'), false);
  assert.equal(isAudioFile('song.flac.zip'), false);
});
test('quality labels do not present MP3 or compressed WAV as lossless', () => {
  assert.equal(qualityLabel({ filename: 'Song.mp3' }), 'MP3 · ORIGINAL FILE');
  assert.equal(qualityLabel({ filename: 'Song.flac' }), 'FLAC · LOSSLESS SOURCE');
  assert.equal(qualityLabel({ filename: 'Song.wav' }), 'WAV · ORIGINAL FILE');
  assert.equal(qualityLabel({ filename: 'Song.wav', codec: 'PCM' }), 'WAV · LOSSLESS SOURCE');
  assert.equal(qualityLabel({ filename: 'Renamed.flac', codec: 'MP3' }), 'FLAC · ORIGINAL FILE');
  const details = qualityDescription({ format: 'FLAC', sampleRate: 96000, bitDepth: 24 }, 1.25);
  assert.match(details, /96 kHz/);
  assert.match(details, /24-bit/);
  assert.match(details, /1.25×/);
  assert.match(details, /Bit-perfect output is not guaranteed/);
});
