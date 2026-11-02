import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Heart, Plus, MoreHorizontal, Pencil, ImagePlus, AudioLines, Settings2, ArrowDownWideNarrow, Shuffle, Play, Check, ArrowUp, ArrowDown } from 'lucide-react-native';
import { useMusic } from '../PlayerContext';
import { Cover, IconButton, Button, useUI, s } from '../components/UI';
import TrackRow from '../components/TrackRow';
import MiniPlayer from '../components/MiniPlayer';
import { useImportMenu } from './LibraryScreen';
import { colors as c } from '../theme';

export default function PlaylistScreen({ navigation, route }) {
  const music = useMusic(), ui = useUI();
  const [sort, setSort] = useState('Custom order');
  const [editing, setEditing] = useState(false);
  const playlist = route.params?.favorites ? { id: 'favorites', title: 'Favorites', trackIds: music.library.favorites } : route.params?.collection || music.library.playlists.find(p => p.id === route.params?.playlistId);
  const editable = playlist && !route.params?.favorites && !route.params?.collection;
  const importMenu = useImportMenu(editable ? playlist.id : undefined);
  if (!playlist) return <SafeAreaView style={s.page}><IconButton icon={ChevronLeft} label="Back" onPress={() => navigation.goBack()} /><Text style={[s.caption, s.padding]}>This playlist is no longer available.</Text></SafeAreaView>;
  const tracks = playlist.trackIds.map(id => music.library.tracks.find(t => t.id === id)).filter(Boolean);
  const sorted = sort === 'Custom order' ? tracks : [...tracks].sort((a, b) => sort === 'Recently added' ? b.addedAt - a.addedAt : (sort === 'Artist' ? a.artist.localeCompare(b.artist) : a.title.localeCompare(b.title)));
  const artwork = playlist.artwork || tracks[0]?.artwork;
  const play = (track = sorted[0], mix = false) => { if (!track) return; music.play(track, sorted.map(t => t.id), mix); navigation.navigate('NowPlaying'); };
  const menu = () => ui.sheet(playlist.title, [
    { title: 'Edit', icon: Pencil, disabled: !editable, onPress: () => { setSort('Custom order'); setEditing(true); } },
    { title: 'Rename', icon: Pencil, disabled: !editable, onPress: () => ui.prompt('Rename playlist', playlist.title, title => music.updatePlaylist(playlist.id, { title })) },
    { title: 'Change cover image', icon: ImagePlus, disabled: !editable, onPress: () => music.changeCover(playlist.id) },
    { title: 'Sound quality and effects', icon: AudioLines, onPress: () => navigation.navigate('Settings', { effects: true }) },
    { title: 'Settings', icon: Settings2, onPress: () => navigation.navigate('Settings') },
  ]);
  const move = (id, direction) => { const ids = [...playlist.trackIds]; const i = ids.indexOf(id); const j = i + direction; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; music.updatePlaylist(playlist.id, { trackIds: ids }); };
  return <SafeAreaView edges={['top']} style={s.page}>
    <View style={[s.row, { paddingHorizontal: 12 }]}><IconButton icon={ChevronLeft} label="Back to library" onPress={() => navigation.goBack()} /><View style={{ flexDirection: 'row' }}>
      <IconButton icon={Heart} active={!!playlist.favorite} fill={!!playlist.favorite} disabled={!editable} label="Favorite playlist" onPress={() => music.updatePlaylist(playlist.id, { favorite: !playlist.favorite })} />
      <IconButton icon={Plus} label="Add music" color={c.accent} onPress={importMenu} /><IconButton icon={MoreHorizontal} label="Playlist options" onPress={menu} />
    </View></View>
    <FlatList data={sorted} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 145 }} showsVerticalScrollIndicator={false}
      ListHeaderComponent={<>
        <View style={styles.hero}><View style={styles.shadow}><Cover artwork={artwork} title={playlist.title} size={220} /></View><Text style={styles.title}>{playlist.title}</Text><Text style={styles.subtitle}>{tracks.length} tracks · {tracks.length ? 'Made for your moments' : 'A world waiting to be heard'}</Text></View>
        <View style={styles.controls}>
          <Pressable accessibilityRole="button" onPress={() => ui.sheet('Sort tracks', ['Custom order', 'Title', 'Artist', 'Recently added'].map(title => ({ title, detail: sort === title ? 'Selected' : '', onPress: () => setSort(title) })))} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }}><ArrowDownWideNarrow size={18} color={c.muted} /><Text style={{ color: c.muted, fontWeight: '500', fontSize: 14 }}>{sort}</Text></Pressable>
          {editing && <Pressable onPress={() => setEditing(false)}><Text style={{ color: c.accent, fontWeight: '600' }}>Done</Text></Pressable>}
        </View>
        <View style={[s.row, s.padding, { marginBottom: 20 }]}><Button title="Play" icon={Play} disabled={!tracks.length} onPress={() => play()} /><Button title="Shuffle" icon={Shuffle} secondary disabled={!tracks.length} onPress={() => play(sorted[Math.floor(Math.random() * sorted.length)], true)} /></View>
      </>}
      ListEmptyComponent={<View style={{ padding: 32, alignItems: 'center', gap: 12 }}><Text style={s.sectionTitle}>Start with a song.</Text><Text style={[s.caption, { textAlign: 'center' }]}>Import a folder or choose audio files to make this playlist your own.</Text><Button title="Add music" icon={Plus} onPress={importMenu} style={{ flex: 0, paddingHorizontal: 24, marginTop: 8 }} /></View>}
      renderItem={({ item, index }) => <View><TrackRow track={item} playlist={editable ? playlist : null} editing={editing} onRemove={() => music.updatePlaylist(playlist.id, { trackIds: playlist.trackIds.filter(id => id !== item.id) })} onPress={() => play(item)} />{editing && <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 20 }}><IconButton icon={ArrowUp} size={17} disabled={index === 0} label={`Move ${item.title} up`} onPress={() => move(item.id, -1)} /><IconButton icon={ArrowDown} size={17} disabled={index === tracks.length - 1} label={`Move ${item.title} down`} onPress={() => move(item.id, 1)} /></View>}</View>}
    />
    <MiniPlayer navigation={navigation} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 30, paddingHorizontal: 24 }, shadow: { shadowColor: '#a12752', shadowOpacity: 0.15, shadowRadius: 40, shadowOffset: { width: 0, height: 16 } }, title: { color: c.text, fontSize: 29, letterSpacing: -0.9, fontWeight: '700', textAlign: 'center', marginTop: 26 }, subtitle: { color: c.muted, fontSize: 13, marginTop: 10 }, controls: { marginHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: c.line, paddingTop: 4, marginBottom: 8 } });
