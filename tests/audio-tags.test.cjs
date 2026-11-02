const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readAudioTags, imageExtension } = require('../src/services/audioTags.cjs');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=', 'base64');
const be = value => { const b = Buffer.alloc(4); b.writeUInt32BE(value); return b; };
const le = value => { const b = Buffer.alloc(4); b.writeUInt32LE(value); return b; };
const ss = value => Buffer.from([value >> 21 & 127, value >> 14 & 127, value >> 7 & 127, value & 127]);
function id3(version = 3) {
  const frame = (id, data) => Buffer.concat([Buffer.from(id), version === 4 ? ss(data.length) : be(data.length), Buffer.alloc(2), data]);
  const content = Buffer.concat([
    frame('TIT2', Buffer.concat([Buffer.from([3]), Buffer.from('霞光')])),
    frame('TPE1', Buffer.concat([Buffer.from([1, 255, 254]), Buffer.from('江嘎组合', 'utf16le')])),
    frame('TALB', Buffer.concat([Buffer.from([3]), Buffer.from('Album')])),
    frame('APIC', Buffer.concat([Buffer.from([0]), Buffer.from('image/png\0'), Buffer.from([3, 0]), png])),
  ]);
  return Buffer.concat([Buffer.from('ID3'), Buffer.from([version, 0, 0]), ss(content.length), content]);
}
async function inspect(buffer) {
  const reads = [];
  const tags = await readAudioTags(async (offset, size) => { reads.push({ offset, size }); return buffer.subarray(offset, offset + size); }, buffer.length);
  return { tags, reads };
}
for (const version of [3, 4]) test(`MP3 ID3v2.${version} recovers UTF-8/UTF-16 tags and embedded front cover`, async () => {
  const { tags } = await inspect(Buffer.concat([id3(version), Buffer.alloc(500)]));
  assert.equal(tags.title, '霞光');
  assert.equal(tags.artist, '江嘎组合');
  assert.equal(tags.album, 'Album');
  assert.deepEqual(Buffer.from(tags.picture), png);
});
test('FLAC reads Vorbis comments and the PICTURE block', async () => {
  const comments = ['TITLE=Song', 'ARTIST=The Artist', 'ALBUM=Album'].map(s => Buffer.concat([le(Buffer.byteLength(s)), Buffer.from(s)]));
  const vorbis = Buffer.concat([le(0), le(comments.length), ...comments]);
  const picture = Buffer.concat([be(3), be(9), Buffer.from('image/png'), be(0), be(1), be(1), be(24), be(0), be(png.length), png]);
  const block = (type, data) => Buffer.concat([Buffer.from([type, data.length >> 16 & 255, data.length >> 8 & 255, data.length & 255]), data]);
  const { tags } = await inspect(Buffer.concat([Buffer.from('fLaC'), block(0, Buffer.alloc(34)), block(4, vorbis), block(0x86, picture), Buffer.alloc(500)]));
  assert.equal(tags.artist, 'The Artist');
  assert.equal(tags.title, 'Song');
  assert.deepEqual(Buffer.from(tags.picture), png);
});
test('WAV skips the audio payload to recover a trailing ID3 cover', async () => {
  const audio = Buffer.alloc(500000), metadata = id3();
  const chunks = Buffer.concat([Buffer.from('data'), le(audio.length), audio, Buffer.from('id3 '), le(metadata.length), metadata]);
  const { tags, reads } = await inspect(Buffer.concat([Buffer.from('RIFF'), le(chunks.length + 4), Buffer.from('WAVE'), chunks]));
  assert.equal(tags.artist, '江嘎组合');
  assert.deepEqual(Buffer.from(tags.picture), png);
  assert.ok(reads.reduce((total, r) => total + r.size, 0) < 2000, 'must not read WAV audio into JS');
});
test('M4A reads iTunes title, artist and covr atoms without reading mdat', async () => {
  const atom = (name, data) => Buffer.concat([be(data.length + 8), Buffer.from(name, 'latin1'), data]);
  const value = (name, bytes, type = 1) => atom(name, atom('data', Buffer.concat([be(type), be(0), bytes])));
  const ilst = atom('ilst', Buffer.concat([value('©nam', Buffer.from('Song')), value('©ART', Buffer.from('Artist')), value('covr', png, 14)]));
  const buffer = Buffer.concat([atom('ftyp', Buffer.from('M4A ')), atom('mdat', Buffer.alloc(500000)), atom('moov', atom('udta', atom('meta', Buffer.concat([Buffer.alloc(4), ilst]))))]);
  const { tags, reads } = await inspect(buffer);
  assert.equal(tags.artist, 'Artist');
  assert.equal(tags.title, 'Song');
  assert.deepEqual(Buffer.from(tags.picture), png);
  assert.ok(reads.reduce((total, r) => total + r.size, 0) < 2000);
});
test('WAV INFO tags provide the artist when there is no picture or ID3 chunk', async () => {
  const chunk = (id, value) => { const bytes = Buffer.from(`${value}\0`); return Buffer.concat([Buffer.from(id), le(bytes.length), bytes, Buffer.alloc(bytes.length % 2)]); };
  const info = Buffer.concat([Buffer.from('INFO'), chunk('IART', 'Artist'), chunk('INAM', 'Song')]);
  const body = Buffer.concat([Buffer.from('WAVE'), Buffer.from('LIST'), le(info.length), info]);
  const { tags } = await inspect(Buffer.concat([Buffer.from('RIFF'), le(body.length), body]));
  assert.equal(tags.artist, 'Artist');
  assert.equal(tags.title, 'Song');
});
test('truncated and oversized tags are bounded and do not crash', async () => {
  const data = Buffer.concat([Buffer.from('ID3'), Buffer.from([3, 0, 0]), ss(0xfffffff)]);
  const { tags, reads } = await inspect(data);
  assert.deepEqual(tags, {});
  assert.ok(reads.every(r => r.size <= 16 * 1024 * 1024));
  assert.equal(imageExtension(Buffer.from('<html>error</html>')), null);
});
