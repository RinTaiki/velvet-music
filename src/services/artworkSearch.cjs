const normalize = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const knownArtist = artist => !!normalize(artist) && !['unknown', 'unknown artist', 'various artists'].includes(normalize(artist));
const escapeQuery = value => String(value).replace(/([+\-!(){}\[\]^"~*?:\\/|&])/g, '\\$1');
const mbid = value => /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value || '');

function matchingReleases(track, recordings) {
  const releases = new Map();
  for (const recording of recordings || []) {
    const credits = recording['artist-credit'] || [];
    const artists = [credits.map(c => `${c.name || c.artist?.name || ''}${c.joinphrase || ''}`).join(''), credits.map(c => `${c.artist?.name || c.name || ''}${c.joinphrase || ''}`).join('')];
    // Never use the first fuzzy result blindly, especially for covers and remixes.
    if (normalize(recording.title) !== normalize(track.title) || !artists.some(artist => normalize(artist) === normalize(track.artist))) continue;
    for (const release of recording.releases || []) if (mbid(release.id)) releases.set(release.id, release);
  }
  const album = normalize(track.album);
  const hasAlbum = album && !['imported music', 'unknown album'].includes(album);
  return [...releases.values()].filter(r => r.status !== 'Bootleg').sort((a, b) => {
    const score = r => (hasAlbum && normalize(r.title) === album ? 10 : 0) + (r.status === 'Official' ? 1 : 0);
    return score(b) - score(a);
  }).slice(0, 5);
}

function createArtworkFinder({ fetchImpl, saveImage, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now }) {
  let tail = Promise.resolve(), lastRequest = -Infinity;
  const cache = new Map();
  async function json(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetchImpl(url, { headers: { Accept: 'application/json', 'User-Agent': 'VelvetMusic/1.0 (personal local-library player)' }, signal: controller.signal });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(response.status === 429 || response.status === 503 ? 'Artwork service is busy. Try again later.' : 'Artwork service is unavailable.');
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  function find(track, { force = false } = {}) {
    if (!track.title?.trim() || !knownArtist(track.artist)) return Promise.resolve(null);
    const key = `${normalize(track.artist)}|${normalize(track.title)}|${normalize(track.album)}`;
    const task = tail.catch(() => {}).then(async () => {
      if (!force && cache.has(key)) return cache.get(key);
      const delay = Math.max(0, 1100 - (now() - lastRequest));
      if (delay) await wait(delay);
      lastRequest = now();
      const query = `recording:"${escapeQuery(track.title)}" AND artist:"${escapeQuery(track.artist)}"`;
      const result = await json(`https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=10`);
      const candidates = matchingReleases(track, result?.recordings);
      const targets = candidates.map(release => ({ type: 'release', id: release.id }));
      for (const release of candidates) if (mbid(release['release-group']?.id) && !targets.some(t => t.id === release['release-group'].id)) targets.push({ type: 'release-group', id: release['release-group'].id });
      for (const target of targets) {
        const cover = await json(`https://coverartarchive.org/${target.type}/${target.id}`);
        const image = cover?.images?.find(i => i.front);
        const url = (image?.thumbnails?.['500'] || image?.thumbnails?.large || image?.image)?.replace(/^http:\/\//i, 'https://');
        if (!url || !/^https:\/\//i.test(url)) continue;
        const artwork = await saveImage(url);
        const found = { artwork, artworkOrigin: 'online', artworkSource: { name: 'MusicBrainz / Cover Art Archive', imageUrl: url, url: `https://musicbrainz.org/${target.type}/${target.id}` } };
        cache.set(key, found);
        return found;
      }
      cache.set(key, null);
      return null;
    });
    tail = task;
    return task;
  }
  return { find };
}
module.exports = { normalize, knownArtist, matchingReleases, createArtworkFinder };
