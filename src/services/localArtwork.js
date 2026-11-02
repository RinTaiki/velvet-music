import { File, Paths, Directory } from 'expo-file-system';
import { Image } from 'react-native';
import { readAudioTags, imageExtension } from './audioTags.cjs';
import { localUri } from './importMusic';

export const canReadArtwork = path => {
  if (!path) return false;
  try { const uri = localUri(path); return /^https?:/.test(uri) || new File(uri).exists; } catch { return false; }
};
export async function saveArtwork(bytes, prefix = 'cover') {
  const ext = imageExtension(bytes);
  if (!ext) throw new Error('The downloaded file is not a supported cover image.');
  new Directory(Paths.document, 'Artwork').create({ intermediates: true, idempotent: true });
  const path = `Artwork/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const file = new File(Paths.document, path);
  await file.write(bytes);
  try {
    await new Promise((resolve, reject) => Image.getSize(file.uri, (width, height) => width && height ? resolve() : reject(new Error('Empty image.')), reject));
    return path;
  } catch { try { file.delete(); } catch {} throw new Error('iOS could not decode this cover image. Choose a different image.'); }
}
export async function readLocalTrackTags(track) {
  const file = new File(localUri(track.uri));
  if (!file.exists) return {};
  const handle = file.open();
  try {
    const tags = await readAudioTags((offset, length) => { handle.offset = offset; return handle.readBytes(length); }, file.size);
    const { picture, pictureType, ...metadata } = tags;
    if (picture && !canReadArtwork(track.artwork)) {
      try { metadata.artwork = await saveArtwork(picture, 'embedded'); metadata.artworkSource = null; metadata.artworkOrigin = 'embedded'; } catch { /* fall back to online artwork */ }
    }
    return metadata;
  } finally { handle.close(); }
}
