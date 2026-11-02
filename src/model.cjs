// Pure library/queue operations, also used by the Node tests.
const emptyLibrary = () => ({ version: 1, tracks: [], playlists: [], favorites: [], settings: { rate: 1, volume: 1, autoArtwork: true } });
const unique = (items) => [...new Set(items)];
function mergeImport(library, incoming, name, playlistId) {
  const tracks = [...library.tracks];
  const known = new Set(tracks.map(t => t.id));
  for (const track of incoming) if (!known.has(track.id)) { tracks.push(track); known.add(track.id); }
  const existing = library.playlists.find(p => p.id === playlistId);
  const playlist = existing
    ? { ...existing, trackIds: unique([...existing.trackIds, ...incoming.map(t => t.id)]) }
    : { id: playlistId, title: name, trackIds: unique(incoming.map(t => t.id)), createdAt: Date.now() };
  return { ...library, tracks, playlists: existing ? library.playlists.map(p => p.id === playlistId ? playlist : p) : [...library.playlists, playlist] };
}
function nextIndex(index, length, repeat, manual = false) {
  if (!length) return -1;
  if (repeat === 'one' && !manual) return index;
  if (index + 1 < length) return index + 1;
  return repeat === 'all' || manual ? 0 : -1;
}
function shuffled(items, first, random = Math.random) {
  const result = [...items];
  const currentIndex = result.indexOf(first);
  if (currentIndex >= 0) result.splice(currentIndex, 1);
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return currentIndex >= 0 ? [first, ...result] : result;
}
function parseFilename(name) {
  const title = name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
  const split = title.indexOf(' - ');
  return split > 0 ? { artist: title.slice(0, split), title: title.slice(split + 3) } : { artist: 'Unknown artist', title };
}
function albumGroups(tracks) {
  const groups = new Map();
  tracks.forEach(t => { const key = `${t.album || 'Unknown album'}\u0000${t.artist}`; if (!groups.has(key)) groups.set(key, { id: key, title: t.album || 'Unknown album', artist: t.artist, trackIds: [], artwork: t.artwork }); groups.get(key).trackIds.push(t.id); });
  return [...groups.values()];
}
module.exports = { emptyLibrary, mergeImport, nextIndex, shuffled, parseFilename, albumGroups };
