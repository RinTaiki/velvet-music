import { createArtworkFinder } from './artworkSearch.cjs';
import { saveArtwork } from './localArtwork';

const finder = createArtworkFinder({
  fetchImpl: (...args) => fetch(...args),
  saveImage: async url => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`The cover image download failed (${response.status}).`);
      if (Number(response.headers.get('content-length')) > 6 * 1024 * 1024) throw new Error('Cover image is too large.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 6 * 1024 * 1024) throw new Error('Invalid cover image size.');
      // Some archive servers return application/octet-stream. Validate actual
      // image bytes and let iOS decode them instead of rejecting the MIME label.
      return await saveArtwork(bytes, 'online');
    } finally { clearTimeout(timer); }
  },
});
export const fetchCover = (track, force = false) => finder.find(track, { force });
