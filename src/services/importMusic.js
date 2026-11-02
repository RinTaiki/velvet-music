import { requireOptionalNativeModule } from 'expo-modules-core';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { parseFilename } from '../model.cjs';
import { extension, isAudioFile } from '../audioFormats.cjs';

export const nativeMusic = Platform.OS === 'ios' ? requireOptionalNativeModule('MusicLibrary') : null;
export const localUri = (path) => !path || /^(file:|https?:|content:)/.test(path) ? path : new File(Paths.document, path).uri;
// The installed iOS module serves local artwork to Expo's URLSession loader.
export const lockScreenArtwork = (path, remoteUrl) => nativeMusic
  ? `velvet-artwork://image?uri=${encodeURIComponent(path ? localUri(path) : '')}`
  : remoteUrl || (path ? localUri(path) : undefined);

export async function importFolder() {
  if (!nativeMusic) throw new Error('Folder scanning needs the installed iPhone build. Use Import files in Expo Go, or install a development/preview build (see README).');
  return nativeMusic.pickFolder();
}

export async function importFiles() {
  // Some Files providers don't classify FLAC/WAV as public.audio. Show all
  // files, then validate extensions ourselves rather than greying music out.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
  if (result.canceled) return null;
  if (nativeMusic) return nativeMusic.importFiles(result.assets.map(a => a.uri));
  const directory = new Directory(Paths.document, 'Music');
  directory.create({ intermediates: true, idempotent: true });
  const tracks = [], errors = [];
  for (const asset of result.assets) {
    try {
      if (!isAudioFile(asset.name)) { errors.push(`${asset.name}: unsupported format. Choose FLAC, MP3, WAV, M4A, AAC, AIFF, or CAF.`); continue; }
      const source = new File(asset.uri);
      // Streaming native digest: no full audio file is loaded into JS memory.
      const id = await source.digest('SHA-256');
      const path = `Music/${id}.${extension(asset.name)}`;
      const destination = new File(Paths.document, path);
      if (!destination.exists) await source.copy(destination);
      tracks.push({ id, uri: path, ...parseFilename(asset.name), format: extension(asset.name).toUpperCase(), album: 'Imported music', addedAt: Date.now(), filename: asset.name });
      try { source.delete(); } catch { /* cache cleanup is best effort */ }
    } catch (error) { errors.push(`${asset.name}: ${error.message}`); }
  }
  return { name: 'Imported music', tracks, errors };
}

export async function pickArtwork() {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
  if (result.canceled) return null;
  const directory = new Directory(Paths.document, 'Artwork');
  directory.create({ intermediates: true, idempotent: true });
  const path = `Artwork/${Date.now()}.jpg`;
  await new File(result.assets[0].uri).copy(new File(Paths.document, path));
  return path;
}
