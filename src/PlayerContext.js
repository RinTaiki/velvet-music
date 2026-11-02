import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync, useAudioPlaylist, useAudioPlaylistStatus } from 'expo-audio';
import { File } from 'expo-file-system';
import { emptyLibrary, mergeImport, nextIndex, shuffled } from './model.cjs';
import { importFiles, importFolder, localUri, lockScreenArtwork, nativeMusic, pickArtwork } from './services/importMusic';
import { fetchCover } from './services/artwork';
import { knownArtist } from './services/artworkSearch.cjs';
import { readLocalTrackTags, canReadArtwork } from './services/localArtwork';
import { restoreSession, parsePlayerLink, nativeLoop } from './session.cjs';
import { updateHomeWidgets } from './services/homeWidgets';

const Context = createContext(null);
const STORAGE_KEY = '@velvet/library/v1';
const SESSION_KEY = '@velvet/session/v1';
function metadataForTrack(track) {
  // In Expo Go let AVFoundation read the original asset's embedded picture.
  // Supplying our own text-only metadata otherwise suppresses that fallback.
  if (!nativeMusic && track.artworkOrigin === 'embedded') return null;
  return { title: track.title, artist: track.artist, albumTitle: track.album || 'Velvet', artworkUrl: lockScreenArtwork(track.artwork, track.artworkSource?.imageUrl) };
}
export const useMusic = () => useContext(Context);
export function PlayerProvider({ children }) {
  const [library, setLibrary] = useState(emptyLibrary);
  const [ready, setReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [openPlayerRequest, setOpenPlayerRequest] = useState(0);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState({ queue: [], index: 0 });
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off');
  const [error, setError] = useState(null);
  const [artworkBusy, setArtworkBusy] = useState([]);
  const [artworkStatus, setArtworkStatus] = useState({});
  const artworkJobs = useRef(new Map());
  const originalQueue = useRef([]);
  const importLock = useRef(false);
  const latest = useRef(null);
  const mounted = useRef(true);
  const loadToken = useRef(0);
  const lockScreenActive = useRef(false);
  const writes = useRef(Promise.resolve());
  const sessionWrites = useRef(Promise.resolve());
  const savedSession = useRef(null);
  const restored = useRef(false);
  const restoring = useRef(false);
  const rebuilding = useRef(false);
  const pendingCommand = useRef(null);
  const player = useAudioPlaylist({ updateInterval: 250 });
  const status = useAudioPlaylistStatus(player);
  const current = library.tracks.find(t => t.id === session.queue[session.index]);

  useEffect(() => {
    let alive = true;
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(SESSION_KEY).catch(() => null)]).then(([raw, sessionRaw]) => {
      if (!alive) return;
      try { savedSession.current = sessionRaw ? JSON.parse(sessionRaw) : null; } catch { savedSession.current = null; }
      if (raw) {
        const data = JSON.parse(raw);
        if (data.version !== 1 || !Array.isArray(data.tracks) || !Array.isArray(data.playlists)) throw new Error('Invalid library data');
        setLibrary({ ...emptyLibrary(), ...data, settings: { ...emptyLibrary().settings, ...data.settings } });
      }
    }).catch(() => {
      if (alive) setError('Your saved library could not be read. Nothing will be overwritten. Restart the app or restore your data.');
    }).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  // Serialize writes so a slow earlier save cannot overwrite a later edit.
  const storageBroken = useRef(false);
  useEffect(() => {
    if (!ready) return;
    if (error?.startsWith('Your saved library')) { storageBroken.current = true; return; }
    if (storageBroken.current) return;
    const raw = JSON.stringify(library);
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEY, raw)).catch(() => setError('Could not save your library. Check free storage on your phone.'));
  }, [library, ready]);

  async function loadQueue(ids, index, autoplay = true, position = 0) {
    const track = library.tracks.find(t => t.id === ids[index]);
    if (!track) return;
    const token = ++loadToken.current;
    rebuilding.current = true;
    setError(null);
    try {
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix', allowsRecording: false });
      if (token !== loadToken.current) return;
      const uri = localUri(track.uri);
      if (uri.startsWith('file:') && !new File(uri).exists) throw new Error('This audio file is missing. Import it again from Files.');
      player.pause();
      player.clear();
      for (const id of ids) {
        const item = library.tracks.find(t => t.id === id);
        if (!item) throw new Error('A queued track is missing from your library.');
        player.add({ uri: localUri(item.uri), name: item.title });
      }
      player.skipTo(index);
      player.loop = nativeLoop(repeat);
      player.volume = library.settings.volume;
      player.playbackRate = library.settings.rate;
      const metadata = metadataForTrack(track);
      if (!lockScreenActive.current) { player.setActiveForLockScreen(true, metadata, { showNextTrack: true, showPreviousTrack: true }); lockScreenActive.current = true; }
      else player.updateLockScreenMetadata(metadata);
      if (position > 0) await player.seekTo(position);
      if (token !== loadToken.current) return;
      if (autoplay) player.play();
    } catch (e) { if (token === loadToken.current) setError(e.message || 'This file could not be played.'); }
    finally { if (token === loadToken.current) rebuilding.current = false; }
  }
  function play(track, ids = library.tracks.map(t => t.id), mix = false) {
    const valid = [...new Set(ids)].filter(id => library.tracks.some(t => t.id === id));
    if (!valid.includes(track.id)) valid.unshift(track.id);
    originalQueue.current = valid;
    const queue = mix || shuffle ? shuffled(valid, track.id) : valid;
    if (mix) setShuffle(true);
    setSession({ queue, index: queue.indexOf(track.id) });
    loadQueue(queue, queue.indexOf(track.id));
  }
  function advance(direction = 1, manual = true) {
    if (!current) return;
    if (direction === -1 && player.currentTime > 3) { player.seekTo(0).catch(e => setError(e.message)); return; }
    const index = direction === -1 ? (session.index - 1 + session.queue.length) % session.queue.length : nextIndex(session.index, session.queue.length, repeat, manual);
    if (index < 0) { player.pause(); return; }
    setSession(s => ({ ...s, index }));
    player.skipTo(index);
    player.play();
  }
  useEffect(() => {
    // Native AVQueuePlayer advances tracks and handles lock-screen next/previous.
    // JavaScript mirrors the index; it no longer starts the next song.
    const subscription = player.addListener('trackChanged', ({ currentIndex }) => {
      if (!rebuilding.current && currentIndex >= 0) setSession(s => currentIndex < s.queue.length ? { ...s, index: currentIndex } : s);
    });
    return () => subscription.remove();
  }, [player]);
  useEffect(() => {
    if (!rebuilding.current && status.currentIndex >= 0 && status.currentIndex < session.queue.length && status.currentIndex !== session.index) setSession(s => ({ ...s, index: status.currentIndex }));
  }, [status.currentIndex]);
  useEffect(() => { player.loop = nativeLoop(repeat); }, [repeat]);
  useEffect(() => { player.volume = library.settings.volume; player.playbackRate = library.settings.rate; }, [library.settings.rate, library.settings.volume]);
  useEffect(() => {
    if (current) {
      player.updateLockScreenMetadata(metadataForTrack(current));
    }
  }, [current?.artwork, current?.title, current?.artist, current?.album, current?.artworkOrigin]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; ++loadToken.current; }; }, []);

  function findCover(track, manual = false) {
    if (artworkJobs.current.has(track.id)) return artworkJobs.current.get(track.id);
    const report = (kind, message) => setArtworkStatus(state => ({ ...state, [track.id]: { kind, message } }));
    setArtworkBusy(ids => [...ids, track.id]);
    report('loading', 'Reading song tags and embedded artwork…');
    const job = (async () => {
      const tags = await readLocalTrackTags(track).catch(() => ({}));
      const { artwork: embeddedArtwork, artworkSource: ignoredSource, artworkOrigin: tagOrigin, ...details } = tags;
      const validCover = canReadArtwork(track.artwork);
      const recovered = { ...track, ...(!track.metadataEdited ? details : {}), tagsVersion: 1,
        artwork: validCover ? track.artwork : embeddedArtwork,
        artworkOrigin: validCover ? track.artworkOrigin : tagOrigin,
        artworkSource: validCover ? track.artworkSource : null };
      setLibrary(l => ({ ...l, tracks: l.tracks.map(t => t.id === track.id && t.artwork === track.artwork && t.title === track.title && t.artist === track.artist ? { ...t, ...(!t.metadataEdited ? details : {}), tagsVersion: 1, artwork: recovered.artwork, artworkOrigin: recovered.artworkOrigin, artworkSource: recovered.artworkSource } : t) }));
      if (recovered.artwork && (!manual || !validCover)) {
        report('ready', embeddedArtwork ? 'Cover recovered from your audio file.' : 'Cover ready.');
        return { artwork: recovered.artwork };
      }
      if (!manual && !library.settings.autoArtwork) { report('disabled', 'No embedded cover. Enable online covers in Settings or choose an image.'); return null; }
      if (!knownArtist(recovered.artist)) {
        report('missing-metadata', 'This file has no artist tag or embedded picture. Edit song details to add the artist, or choose an image.');
        if (manual) Alert.alert('Artist needed', 'No artist tag was found in this audio file. Use Edit song details, then try again, or choose an image.');
        return null;
      }
      report('loading', `Searching for ${recovered.artist} — ${recovered.title}…`);
      const found = await fetchCover(recovered, manual);
      setLibrary(l => {
        if (!manual && !l.settings.autoArtwork) return l;
        return { ...l, tracks: l.tracks.map(t => {
          // Preserve a manual cover or metadata edit made while the request ran.
          if (t.id !== track.id || t.artwork !== recovered.artwork || t.title !== recovered.title || t.artist !== recovered.artist) return t;
          return { ...t, ...(found || {}), artworkCheckedAt: Date.now(), artworkLookupVersion: 2 };
        }) };
      });
      report(found ? 'ready' : 'not-found', found ? 'Cover downloaded for offline use.' : 'No matching cover found. Check the artist/title, retry, or choose an image.');
      if (manual && !found) Alert.alert('No matching cover', 'No front cover matched this artist and title. Check Edit song details or choose an image manually.');
      return found;
    })().catch(e => {
      // A failed lookup must never stop music or become a playback error.
      const message = e.name === 'AbortError' ? 'Cover lookup timed out. Check your connection and retry.' : e.message || 'Could not find artwork. Check your connection and retry.';
      report('error', message);
      if (manual) Alert.alert('Cover lookup', message);
      return null;
    }).finally(() => {
      artworkJobs.current.delete(track.id);
      setArtworkBusy(ids => ids.filter(id => id !== track.id));
    });
    artworkJobs.current.set(track.id, job);
    return job;
  }
  useEffect(() => {
    const checkedRecently = current?.artworkLookupVersion === 2 && current.artworkCheckedAt && Date.now() - current.artworkCheckedAt < 7 * 86400000;
    if (current && (!current.tagsVersion || !canReadArtwork(current.artwork) && !checkedRecently && library.settings.autoArtwork)) findCover(current);
  }, [current?.id, current?.title, current?.artist, current?.artwork, library.settings.autoArtwork]);

  async function runImport(kind, playlistId) {
    if (importLock.current || storageBroken.current) return;
    importLock.current = true; setBusy(true);
    try {
      const result = await (kind === 'folder' ? importFolder() : importFiles());
      if (!result) return;
      if (!nativeMusic) {
        for (let i = 0; i < result.tracks.length; i++) {
          const tags = await readLocalTrackTags(result.tracks[i]).catch(() => ({}));
          result.tracks[i] = { ...result.tracks[i], ...tags, tagsVersion: 1 };
        }
      }
      if (result.tracks.length) setLibrary(l => mergeImport(l, result.tracks, result.name, playlistId || result.folderId || `playlist-${Date.now()}`));
      Alert.alert(result.tracks.length ? 'Music added' : 'No music found', `${result.tracks.length} tracks imported.${result.errors?.length ? `\n${result.errors.length} files could not be imported.\n${result.errors.slice(0, 3).join('\n')}` : '\nYour music is stored offline on this iPhone.'}`);
    } catch (e) { Alert.alert('Import music', e.message); }
    finally { importLock.current = false; setBusy(false); }
  }
  function updatePlaylist(id, patch) { setLibrary(l => ({ ...l, playlists: l.playlists.map(p => p.id === id ? { ...p, ...patch } : p) })); }
  function toggleFavorite(id) { setLibrary(l => ({ ...l, favorites: l.favorites.includes(id) ? l.favorites.filter(x => x !== id) : [...l.favorites, id] })); }
  function toggleShuffle() {
    const next = !shuffle; setShuffle(next);
    const queue = next ? shuffled(session.queue, current?.id) : originalQueue.current;
    setSession({ queue, index: Math.max(0, queue.indexOf(current?.id)) });
    if (current) loadQueue(queue, Math.max(0, queue.indexOf(current.id)), player.playing, player.currentTime);
  }
  async function changeCover(id, isTrack = false) {
    try {
      const artwork = await pickArtwork();
      if (!artwork) return;
      if (isTrack) setLibrary(l => ({ ...l, tracks: l.tracks.map(t => t.id === id ? { ...t, artwork, artworkSource: null, artworkOrigin: 'manual' } : t) }));
      else updatePlaylist(id, { artwork });
    } catch (e) { Alert.alert('Artwork', e.message); }
  }
  function toggle() {
    if (!current) return;
    if (error) { loadQueue(session.queue, session.index); return; }
    if (player.playing) player.pause();
    else if (player.duration && player.currentTime >= player.duration - 0.15) { player.skipTo(session.index); player.play(); }
    else player.play();
  }
  function saveSession() {
    if (!sessionReady || restoring.current || rebuilding.current || !session.queue.length) return;
    const raw = JSON.stringify({ queue: session.queue, index: Math.max(0, player.currentIndex), position: player.currentTime,
      originalQueue: originalQueue.current, repeat, shuffle });
    sessionWrites.current = sessionWrites.current.catch(() => {}).then(() => AsyncStorage.setItem(SESSION_KEY, raw)).catch(() => {});
  }
  function runCommand(action) {
    if (!current) {
      if (action !== 'open') Alert.alert('Your library is ready', 'Import and play a song once to create a queue you can resume from the widget.');
      return;
    }
    if (action === 'toggle') toggle();
    if (action === 'resume' && !player.playing) toggle();
    if (action === 'next') advance(1);
    if (action === 'previous') { advance(-1); player.play(); }
    setOpenPlayerRequest(request => request + 1);
  }
  latest.current = { saveSession, runCommand, sessionReady };

  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true; restoring.current = true;
    const saved = restoreSession(savedSession.current, library.tracks);
    if (!saved) { restoring.current = false; setSessionReady(true); return; }
    originalQueue.current = saved.originalQueue;
    setRepeat(saved.repeat); setShuffle(saved.shuffle);
    setSession({ queue: saved.queue, index: saved.index });
    // Restore paused: only an explicit app/widget/lock-screen action starts audio.
    loadQueue(saved.queue, saved.index, false, saved.position).finally(() => {
      if (!mounted.current) return;
      player.loop = nativeLoop(saved.repeat);
      restoring.current = false; setSessionReady(true);
    });
  }, [ready]);
  useEffect(() => {
    if (!sessionReady) return;
    saveSession();
    if (pendingCommand.current) { const action = pendingCommand.current; pendingCommand.current = null; runCommand(action); }
  }, [sessionReady, session.queue, session.index, repeat, shuffle, status.playing]);
  useEffect(() => {
    const timer = setInterval(() => latest.current.saveSession(), 5000);
    const subscription = AppState.addEventListener('change', () => {
      latest.current.saveSession();
      if (!rebuilding.current && player.currentIndex >= 0) setSession(s => player.currentIndex < s.queue.length ? { ...s, index: player.currentIndex } : s);
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [player]);
  useEffect(() => {
    const handle = url => {
      const action = parsePlayerLink(url);
      if (!action) return;
      if (!latest.current.sessionReady) pendingCommand.current = action;
      else latest.current.runCommand(action);
    };
    Linking.getInitialURL().then(url => { if (url) handle(url); }).catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (ready && sessionReady) updateHomeWidgets(current, status.playing, library.tracks.length).catch(() => {});
  }, [ready, sessionReady, current?.id, current?.title, current?.artist, current?.artwork, status.playing, library.tracks.length]);

  const value = {
    library, ready, busy, current, status, session, sessionReady, openPlayerRequest, shuffle, repeat, error, setError, artworkBusy, artworkStatus, findCover,
    reportArtworkError: (id, artwork) => {
      setArtworkStatus(state => ({ ...state, [id]: { kind: 'error', message: 'This cover could not be displayed. Recover the embedded cover or choose a different image.' } }));
      setLibrary(l => ({ ...l, tracks: l.tracks.map(t => t.id === id && t.artwork === artwork ? { ...t, artwork: null, artworkCheckedAt: null } : t) }));
    },
    play, toggle, next: () => advance(1), previous: () => advance(-1),
    seek: seconds => player.seekTo(seconds).then(() => latest.current.saveSession()).catch(e => setError(e.message)),
    toggleShuffle, cycleRepeat: () => setRepeat(r => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'),
    runImport, updatePlaylist, toggleFavorite, changeCover,
    updateTrack: (id, patch) => setLibrary(l => ({ ...l, tracks: l.tracks.map(t => t.id === id ? { ...t, ...patch, ...('title' in patch || 'artist' in patch ? { metadataEdited: true } : {}) } : t) })),
    setSettings: patch => setLibrary(l => ({ ...l, settings: { ...l.settings, ...patch } })),
    createPlaylist: title => { const id = `playlist-${Date.now()}`; setLibrary(l => ({ ...l, playlists: [...l.playlists, { id, title: title.trim() || 'Untitled playlist', trackIds: [], createdAt: Date.now() }] })); return id; },
    addToPlaylist: (id, trackId) => setLibrary(l => ({ ...l, playlists: l.playlists.map(p => p.id === id ? { ...p, trackIds: [...new Set([...p.trackIds, trackId])] } : p) })),
    enqueue: id => { const track = library.tracks.find(t => t.id === id); if (!track) return; originalQueue.current = [...originalQueue.current, id]; player.add({ uri: localUri(track.uri), name: track.title }); setSession(s => ({ ...s, queue: [...s.queue, id] })); },
    playQueueIndex: index => { setSession(s => ({ ...s, index })); player.skipTo(index); player.play(); },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
