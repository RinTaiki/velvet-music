import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { MoreHorizontal, Heart, ListPlus, ImagePlus, Plus, Minus, Play, Search, Pencil, ExternalLink, AudioLines } from 'lucide-react-native';
import { qualityDescription } from '../audioFormats.cjs';
import { useMusic } from '../PlayerContext';
import { Cover, IconButton, useUI } from './UI';
import { colors as c } from '../theme';

export function useTrackActions() {
  const music = useMusic(), ui = useUI();
  const addToPlaylist = track => ui.sheet('Add to playlist', [
    { title: 'New playlist', icon: Plus, onPress: () => ui.prompt('New playlist', '', title => { const id = music.createPlaylist(title); music.addToPlaylist(id, track.id); }) },
    ...music.library.playlists.map(p => ({ title: p.title, detail: `${p.trackIds.length} tracks`, onPress: () => music.addToPlaylist(p.id, track.id) })),
  ]);
  const menu = (track, playlist) => ui.sheet(track.title, [
    { title: music.library.favorites.includes(track.id) ? 'Remove from favorites' : 'Add to favorites', icon: Heart, onPress: () => music.toggleFavorite(track.id) },
    { title: 'Add to playlist', icon: Plus, onPress: () => addToPlaylist(track) },
    { title: 'Play later', icon: ListPlus, disabled: !music.current, onPress: () => music.enqueue(track.id) },
    { title: 'Change artwork', icon: ImagePlus, onPress: () => music.changeCover(track.id, true) },
    { title: music.artworkBusy.includes(track.id) ? 'Finding cover…' : 'Find cover online', icon: Search, disabled: music.artworkBusy.includes(track.id), onPress: () => music.findCover(track, true) },
    { title: 'Edit song details', icon: Pencil, onPress: () => ui.prompt('Artist', track.artist === 'Unknown artist' ? '' : track.artist, artist => ui.prompt('Song title', track.title, title => music.updateTrack(track.id, { artist, title, artworkCheckedAt: null }))) },
    { title: 'Audio file quality', icon: AudioLines, onPress: () => Alert.alert('Original audio', qualityDescription(track, music.library.settings.rate)) },
    ...(track.artworkSource?.url ? [{ title: 'Cover source', icon: ExternalLink, onPress: () => Linking.openURL(track.artworkSource.url).catch(() => Alert.alert('Cover source', track.artworkSource.url)) }] : []),
    ...(playlist ? [{ title: 'Remove from playlist', icon: Minus, destructive: true, onPress: () => music.updatePlaylist(playlist.id, { trackIds: playlist.trackIds.filter(id => id !== track.id) }) }] : []),
  ], track.artist);
  return { menu, addToPlaylist };
}
export default function TrackRow({ track, onPress, playlist, editing, onRemove }) {
  const { current, status } = useMusic();
  const { menu } = useTrackActions();
  const active = current?.id === track.id;
  return <View style={styles.row}>
    {editing && <IconButton icon={Minus} color={c.accent} label={`Remove ${track.title}`} onPress={onRemove} />}
    <Pressable accessibilityRole="button" accessibilityLabel={`Play ${track.title} by ${track.artist}`} style={styles.track} onPress={onPress}>
      <View><Cover artwork={track.artwork} title={track.album || track.title} size={52} />{active && <View style={styles.playing}><Play size={17} color="#fff" fill="#fff" /></View>}</View>
      <View style={{ flex: 1, gap: 5 }}><Text numberOfLines={1} style={[styles.title, active && { color: c.accent }]}>{track.title}</Text><Text numberOfLines={1} style={styles.artist}>{track.artist}{active && status.playing ? '  •  Playing' : ''}</Text></View>
    </Pressable>
    <IconButton icon={MoreHorizontal} label={`Options for ${track.title}`} color={c.muted} onPress={() => menu(track, playlist)} />
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', height: 78, marginLeft: 24, paddingRight: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line }, track: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, paddingVertical: 12 }, title: { color: c.text, fontSize: 16, fontWeight: '500' }, artist: { color: c.muted, fontSize: 13 }, playing: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0007', borderRadius: 7, alignItems: 'center', justifyContent: 'center' } });
