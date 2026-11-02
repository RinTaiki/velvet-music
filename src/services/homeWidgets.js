import { nativeMusic, localUri } from './importMusic';
export const homeWidgetsAvailable = nativeMusic?.widgetsEnabled === true && typeof nativeMusic?.updateWidgetState === 'function';
export async function updateHomeWidgets(track, playing, trackCount) {
  if (!homeWidgetsAvailable) return false;
  await nativeMusic.updateWidgetState({
    title: track?.title || 'Your own frequency', artist: track?.artist || 'Add music to get started',
    trackId: track?.id || '', artworkUri: track?.artwork ? localUri(track.artwork) : '',
    playing: !!playing, trackCount,
  });
  return true;
}
