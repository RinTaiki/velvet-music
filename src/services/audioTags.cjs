// Bounded metadata reads only: never load or modify a song's audio payload.
const MAX_TAG = 16 * 1024 * 1024;
const ascii = bytes => Array.from(bytes, b => String.fromCharCode(b)).join('');
const u32 = (b, o = 0, little = false) => o + 4 <= b.length ? new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(o, little) : 0;
const syncsafe = (b, o = 0) => ((b[o] & 127) * 2097152 + (b[o + 1] & 127) * 16384 + (b[o + 2] & 127) * 128 + (b[o + 3] & 127));
function text(bytes, encoding = 3) {
  let result = '';
  if (encoding === 1 || encoding === 2) {
    const little = encoding === 1 && !(bytes[0] === 254 && bytes[1] === 255);
    let offset = bytes[0] === 255 && bytes[1] === 254 || bytes[0] === 254 && bytes[1] === 255 ? 2 : 0;
    for (; offset + 1 < bytes.length; offset += 2) {
      const code = little ? bytes[offset] | bytes[offset + 1] << 8 : bytes[offset] << 8 | bytes[offset + 1];
      result += String.fromCharCode(code);
    }
  } else result = encoding === 0 ? ascii(bytes) : new TextDecoder('utf-8').decode(bytes);
  return result.replace(/\0/g, ' ').trim();
}
function terminator(bytes, offset, encoding = 0) {
  const step = encoding === 1 || encoding === 2 ? 2 : 1;
  for (let i = offset; i + step <= bytes.length; i += step) if (!bytes[i] && (step === 1 || !bytes[i + 1])) return i + step;
  return bytes.length;
}
function deunsync(bytes) {
  const out = new Uint8Array(bytes.length); let length = 0;
  for (let i = 0; i < bytes.length; i++) { out[length++] = bytes[i]; if (bytes[i] === 255 && bytes[i + 1] === 0) i++; }
  return out.subarray(0, length);
}
function imageExtension(b) {
  if (b?.[0] === 255 && b[1] === 216 && b[2] === 255) return 'jpg';
  if (b?.[0] === 137 && ascii(b.subarray(1, 4)) === 'PNG') return 'png';
  if (b && ascii(b.subarray(0, 3)) === 'GIF') return 'gif';
  if (b && ascii(b.subarray(0, 4)) === 'RIFF' && ascii(b.subarray(8, 12)) === 'WEBP') return 'webp';
  return null;
}
function picture(result, bytes, type) {
  if (bytes.length && imageExtension(bytes) && (!result.picture || type === 3 && result.pictureType !== 3)) { result.picture = bytes.slice(); result.pictureType = type; }
}
function parseID3(bytes) {
  const result = {};
  if (ascii(bytes.subarray(0, 3)) !== 'ID3' || ![2, 3, 4].includes(bytes[3]) || bytes.length < 10) return result;
  const version = bytes[3], flags = bytes[5];
  if (version === 2 && flags & 0x40) return result; // v2.2 tag compression
  let data = bytes.subarray(10, 10 + syncsafe(bytes, 6));
  if (version < 4 && flags & 0x80) data = deunsync(data);
  let offset = version > 2 && flags & 0x40 ? (version === 4 ? syncsafe(data) : u32(data) + 4) : 0;
  const keys = { TIT2: 'title', TT2: 'title', TPE1: 'artist', TP1: 'artist', TALB: 'album', TAL: 'album' };
  for (let frames = 0; frames < 2048; frames++) {
    const headerSize = version === 2 ? 6 : 10;
    if (offset + headerSize > data.length) break;
    const id = ascii(data.subarray(offset, offset + (version === 2 ? 3 : 4)));
    if (!/^[A-Z0-9]{3,4}$/.test(id)) break;
    const size = version === 2 ? data[offset + 3] * 65536 + data[offset + 4] * 256 + data[offset + 5] : version === 4 ? syncsafe(data, offset + 4) : u32(data, offset + 4);
    if (!size || offset + headerSize + size > data.length) break;
    const frameFlags = version > 2 ? data[offset + 9] : 0;
    let frame = data.subarray(offset + headerSize, offset + headerSize + size);
    offset += headerSize + size;
    if (version === 3 && frameFlags & 0xc0 || version === 4 && frameFlags & 0x0c) continue;
    if (version === 3 && frameFlags & 0x20 || version === 4 && frameFlags & 0x40) frame = frame.subarray(1);
    if (version === 4 && frameFlags & 0x01) frame = frame.subarray(4);
    if (version === 4 && (frameFlags & 0x02 || flags & 0x80)) frame = deunsync(frame);
    if (keys[id]) { const value = text(frame.subarray(1), frame[0]); if (value) result[keys[id]] = value; }
    if (id === 'APIC' || id === 'PIC') {
      const encoding = frame[0];
      const afterMime = id === 'PIC' ? 4 : terminator(frame, 1);
      const type = frame[afterMime];
      const imageStart = terminator(frame, afterMime + 1, encoding);
      picture(result, frame.subarray(imageStart), type);
    }
  }
  return result;
}
function parseFlacPicture(bytes, result) {
  const type = u32(bytes), mimeLength = u32(bytes, 4);
  const descriptionLengthOffset = 8 + mimeLength;
  if (descriptionLengthOffset + 4 > bytes.length) return;
  const imageLengthOffset = descriptionLengthOffset + 4 + u32(bytes, descriptionLengthOffset) + 16;
  if (imageLengthOffset + 4 > bytes.length) return;
  const size = u32(bytes, imageLengthOffset), start = imageLengthOffset + 4;
  if (start + size <= bytes.length) picture(result, bytes.subarray(start, start + size), type);
}
function parseVorbis(bytes, result) {
  let offset = 4 + u32(bytes, 0, true);
  const count = u32(bytes, offset, true); offset += 4;
  for (let i = 0; i < Math.min(count, 4096) && offset + 4 <= bytes.length; i++) {
    const size = u32(bytes, offset, true); offset += 4;
    if (offset + size > bytes.length) break;
    const value = text(bytes.subarray(offset, offset + size)); offset += size;
    const equal = value.indexOf('='), key = value.slice(0, equal).toLowerCase();
    if (equal > 0 && ['title', 'artist', 'album'].includes(key) && !result[key]) result[key] = value.slice(equal + 1);
  }
}
function parseWaveInfo(bytes, result) {
  if (ascii(bytes.subarray(0, 4)) !== 'INFO') return;
  const keys = { INAM: 'title', IART: 'artist', IPRD: 'album' };
  for (let offset = 4, count = 0; offset + 8 <= bytes.length && count < 256; count++) {
    const id = ascii(bytes.subarray(offset, offset + 4)), size = u32(bytes, offset + 4, true);
    if (offset + 8 + size > bytes.length) break;
    if (keys[id]) result[keys[id]] = text(bytes.subarray(offset + 8, offset + 8 + size), 0);
    offset += 8 + size + size % 2;
  }
}
async function parseMP4(read, fileSize, result) {
  const keys = { '\u00a9nam': 'title', '\u00a9ART': 'artist', aART: 'albumArtist', '\u00a9alb': 'album' };
  let count = 0;
  async function atoms(start, end, depth = 0, parent = '') {
    if (depth > 8) return;
    for (let offset = start; offset + 8 <= end && ++count < 4096;) {
      const header = await read(offset, 16);
      let size = u32(header), headerSize = 8;
      const name = ascii(header.subarray(4, 8));
      if (size === 1) { size = u32(header, 8) * 4294967296 + u32(header, 12); headerSize = 16; }
      if (size === 0) size = end - offset;
      if (!Number.isSafeInteger(size) || size < headerSize || offset + size > end) break;
      if (['moov', 'udta', 'ilst', 'meta'].includes(name) || keys[name] || name === 'covr') {
        await atoms(offset + headerSize + (name === 'meta' ? 4 : 0), offset + size, depth + 1, name);
      } else if (name === 'data' && (keys[parent] || parent === 'covr') && size - headerSize <= MAX_TAG) {
        const bytes = await read(offset + headerSize, size - headerSize);
        if (bytes.length >= 8) {
          if (parent === 'covr') picture(result, bytes.subarray(8), 3);
          else { const value = text(bytes.subarray(8), u32(bytes) === 2 ? 2 : 3); if (value) result[keys[parent]] = value; }
        }
      }
      offset += size;
    }
  }
  await atoms(0, fileSize);
  if (!result.artist && result.albumArtist) result.artist = result.albumArtist;
  delete result.albumArtist;
}
async function readAudioTags(readAt, fileSize) {
  const result = {};
  const read = async (offset, size) => offset >= 0 && offset < fileSize && size <= MAX_TAG ? readAt(offset, Math.min(size, fileSize - offset)) : new Uint8Array();
  let header = await read(0, 12), base = 0;
  if (ascii(header.subarray(0, 3)) === 'ID3') {
    const tagSize = syncsafe(header, 6) + 10;
    if (tagSize <= MAX_TAG) Object.assign(result, parseID3(await read(0, tagSize)));
    base = tagSize + (header[3] === 4 && header[5] & 0x10 ? 10 : 0);
    header = await read(base, 12);
  }
  if (ascii(header.subarray(0, 4)) === 'fLaC') {
    let offset = base + 4;
    for (let blocks = 0; blocks < 1024; blocks++) {
      const block = await read(offset, 4);
      if (block.length < 4) break;
      const last = block[0] & 128, type = block[0] & 127, size = block[1] * 65536 + block[2] * 256 + block[3];
      offset += 4;
      if (offset + size > fileSize) break;
      if (type === 6) parseFlacPicture(await read(offset, size), result);
      if (type === 4) parseVorbis(await read(offset, size), result);
      offset += size;
      if (last) break;
    }
  } else if (ascii(header.subarray(0, 4)) === 'RIFF' && ascii(header.subarray(8, 12)) === 'WAVE') {
    let offset = base + 12;
    for (let chunks = 0; chunks < 2048 && offset + 8 <= fileSize; chunks++) {
      const chunk = await read(offset, 8), name = ascii(chunk.subarray(0, 4)).toLowerCase(), size = u32(chunk, 4, true);
      if (offset + 8 + size > fileSize) break;
      if (name.trim() === 'id3' && size <= MAX_TAG) Object.assign(result, parseID3(await read(offset + 8, size)));
      if (name === 'list' && size <= MAX_TAG) parseWaveInfo(await read(offset + 8, size), result);
      offset += 8 + size + size % 2; // seek past PCM data without reading it
    }
  } else if (ascii(header.subarray(4, 8)) === 'ftyp') {
    await parseMP4(read, fileSize, result);
  }
  if ((!result.title || !result.artist) && fileSize >= 128) {
    const tail = await read(fileSize - 128, 128);
    if (ascii(tail.subarray(0, 3)) === 'TAG') {
      for (const [key, start] of [['title', 3], ['artist', 33], ['album', 63]]) if (!result[key]) { const value = text(tail.subarray(start, start + 30), 0); if (value) result[key] = value; }
    }
  }
  return result;
}
module.exports = { readAudioTags, parseID3, imageExtension };
