import React, { useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Settings2, FolderOpen, Files, Search, ChevronRight, Music2, Heart, ListMusic } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusic } from '../PlayerContext';
import { albumGroups } from '../model.cjs';
import { Cover, IconButton, SectionTitle, Button, useUI, s } from '../components/UI';
import TrackRow from '../components/TrackRow';
import MiniPlayer from '../components/MiniPlayer';
import { colors as c } from '../theme';

export function useImportMenu(playlistId) {
  const music = useMusic(), ui = useUI();
  return () => ui.sheet('Make it yours', [
    { title: 'Scan a folder', icon: FolderOpen, disabled: music.busy, onPress: () => music.runImport('folder', playlistId) },
    { title: 'Import audio files', icon: Files, disabled: music.busy, onPress: () => music.runImport('files', playlistId) },
    ...(!playlistId ? [{ title: 'Create playlist', icon: Plus, onPress: () => ui.prompt('New playlist', '', music.createPlaylist) }] : []),
  ], 'Choose music from Files. Yours, offline, always.');
}
export default function LibraryScreen({ navigation }) {
  const music = useMusic(), { library, busy, ready } = music;
  const [tab, setTab] = useState('Playlists');
  const [query, setQuery] = useState('');
  const [headerHeight, setHeaderHeight] = useState(0);
  const list = useRef(null);
  const importMenu = useImportMenu();
  const albums = useMemo(() => albumGroups(library.tracks), [library.tracks]);
  const collections = tab === 'Albums' ? albums : library.playlists;
  const data = useMemo(() => (tab === 'Tracks' ? library.tracks : collections).filter(item => `${item.title} ${item.artist || ''}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.title.localeCompare(b.title)), [tab, library.tracks, collections, query]);
  const recent = [...library.playlists].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  const openCollection = item => navigation.navigate('Playlist', tab === 'Albums' ? { collection: item } : { playlistId: item.id });
  const playTrack = track => { music.play(track, data.map(t => t.id)); navigation.navigate('NowPlaying'); };
  const artwork = item => item.artwork || library.tracks.find(t => t.id === item.trackIds[0])?.artwork;
  if (!ready) return <View style={[s.page, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={c.accent} /><Text style={[s.caption, { marginTop: 16 }]}>Opening your library…</Text></View>;
  return <SafeAreaView edges={['top']} style={s.page}>
    <View style={[s.row, s.padding, { paddingTop: 10, marginBottom: 14 }]}>
      <View><Text style={styles.eyebrow}>YOUR OWN FREQUENCY</Text><Text style={s.title}>Library</Text></View>
      <View style={{ flexDirection: 'row', gap: 4 }}><IconButton icon={Plus} color={c.accent} label="Import music or create playlist" onPress={importMenu} /><IconButton icon={Settings2} label="Settings" onPress={() => navigation.navigate('Settings')} /></View>
    </View>
    <View style={styles.tabs}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 25 }}>{['Playlists', 'Tracks', 'Albums'].map(label => <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: tab === label }} onPress={() => setTab(label)} style={[styles.tab, tab === label && styles.tabActive]}><Text style={[styles.tabText, tab === label && { color: c.text }]}>{label}</Text></Pressable>)}</ScrollView></View>
    {busy && <View style={styles.banner}><ActivityIndicator color={c.accent} /><Text style={s.caption}>Importing your music. Keep Velvet open…</Text></View>}
    {music.error && <Text accessibilityRole="alert" style={{ color: c.accent, paddingHorizontal: 24, paddingVertical: 12, fontSize: 13 }}>{music.error}</Text>}
    <FlatList ref={list} data={data} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      getItemLayout={(_, index) => ({ length: tab === 'Tracks' ? 78 : 87, offset: headerHeight + (tab === 'Tracks' ? 78 : 87) * index, index })}
      onScrollToIndexFailed={({ averageItemLength, index }) => { list.current?.scrollToOffset({ offset: averageItemLength * index, animated: true }); }}
      ListHeaderComponent={<View onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)}>
        <View style={[styles.search, { marginHorizontal: 24 }]}><Search color={c.muted} size={18} /><TextInput accessibilityLabel="Search library" placeholder="Search your library" placeholderTextColor={c.muted} value={query} onChangeText={setQuery} style={styles.searchInput} clearButtonMode="while-editing" /></View>
        {library.tracks.length === 0 && library.playlists.length === 0 ? <View style={{ padding: 24, paddingTop: 10 }}>
          <LinearGradient colors={['#52293d', '#241e30', '#13141c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.welcome}>
            <View style={styles.orbit} /><View style={[styles.orbit, { width: 260, height: 260, right: -120, top: -100 }]} />
            <View style={styles.welcomeIcon}><Music2 color="#ffdce2" size={29} strokeWidth={1.4} /></View>
            <Text style={styles.welcomeTitle}>Good music.{'\n'}No boundaries.</Text><Text style={styles.welcomeText}>A little space for your entire world of sound. Bring your music, we’ll bring the feeling.</Text>
            <Button title="Bring your music" icon={Plus} onPress={importMenu} style={{ flex: 0, alignSelf: 'flex-start', paddingHorizontal: 20, marginTop: 26 }} />
            <Text style={styles.localTag}>ON YOUR IPHONE. ON YOUR TERMS.</Text>
          </LinearGradient>
          <View style={[s.row, { marginTop: 20, justifyContent: 'center', gap: 8 }]}><FolderOpen size={14} color={c.muted} /><Text style={s.caption}>Local files · No subscription · All yours</Text></View>
        </View> : <>
          {recent.length > 0 && !query && <><View style={s.padding}><SectionTitle>Recently added</SectionTitle></View><FlatList horizontal data={recent} keyExtractor={item => item.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} style={{ width: 154 }} onPress={() => navigation.navigate('Playlist', { playlistId: item.id })}><Cover artwork={artwork(item)} title={item.title} size={154} /><Text numberOfLines={1} style={styles.recentTitle}>{item.title}</Text><Text style={s.caption}>{item.trackIds.length} tracks</Text></Pressable>} /></>}
          <Pressable onPress={() => navigation.navigate('Playlist', { favorites: true })} accessibilityRole="button" style={styles.favorites}><View style={styles.heartBox}><Heart size={23} fill={c.accent} color={c.accent} /></View><View style={{ flex: 1 }}><Text style={styles.collectionTitle}>Favorites</Text><Text style={s.caption}>{library.favorites.length} songs you love</Text></View><ChevronRight size={18} color={c.muted} /></Pressable>
        </>}
        <View style={s.padding}><SectionTitle detail={`${data.length}`}>{tab === 'Playlists' ? 'Your playlists' : tab === 'Tracks' ? 'All tracks' : 'Albums'}</SectionTitle></View>
      </View>}
      ListEmptyComponent={<View style={{ paddingHorizontal: 24, paddingVertical: 18 }}><Text style={s.caption}>{query ? 'No matches. Try another search.' : tab === 'Playlists' ? 'The next great playlist starts with you.' : 'Import your music to fill this space.'}</Text>{!query && <Pressable onPress={importMenu} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 18 }}><Plus color={c.accent} size={18} /><Text style={{ color: c.accent, fontSize: 15, fontWeight: '600' }}>Add music</Text></Pressable>}</View>}
      renderItem={({ item }) => tab === 'Tracks' ? <TrackRow track={item} onPress={() => playTrack(item)} /> : <Pressable accessibilityRole="button" style={styles.collectionRow} onPress={() => openCollection(item)}><Cover artwork={artwork(item)} title={item.title} size={62} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.collectionTitle}>{item.title}</Text><Text style={s.caption}>{item.artist ? `${item.artist} · ` : ''}{item.trackIds.length} tracks</Text></View><ChevronRight size={17} color={c.muted} /></Pressable>}
    />
    {data.length > 8 && <View style={styles.index}>{'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map(letter => <Pressable key={letter} hitSlop={2} onPress={() => { const index = data.findIndex(item => letter === '#' ? !/^[a-z]/i.test(item.title) : item.title[0]?.toUpperCase() === letter); if (index >= 0) list.current?.scrollToIndex({ index, viewPosition: 0.1, animated: true }); }}><Text style={styles.indexText}>{letter}</Text></Pressable>)}</View>}
    <MiniPlayer navigation={navigation} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  eyebrow: { color: c.accent, fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 5 },
  tabs: { borderBottomWidth: 1, borderColor: c.line }, tab: { paddingTop: 6, paddingBottom: 14, borderBottomWidth: 2, borderColor: 'transparent' }, tabActive: { borderColor: c.accent }, tabText: { fontSize: 18, fontWeight: '600', color: c.muted },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ffffff08', borderRadius: 12, marginTop: 20, minHeight: 43, paddingHorizontal: 13 }, searchInput: { flex: 1, color: c.text, fontSize: 15, paddingVertical: 11 },
  welcome: { borderRadius: 24, padding: 27, overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff12' }, welcomeIcon: { width: 58, height: 58, borderRadius: 17, backgroundColor: '#ffffff10', justifyContent: 'center', alignItems: 'center', marginBottom: 32 }, welcomeTitle: { color: c.text, fontSize: 36, lineHeight: 39, letterSpacing: -1.3, fontWeight: '700' }, welcomeText: { color: '#c5b7c4', fontSize: 14, lineHeight: 22, marginTop: 14, maxWidth: 260 }, orbit: { position: 'absolute', width: 340, height: 340, borderRadius: 200, borderWidth: 1, borderColor: '#ffffff0c', top: -140, right: -160 }, localTag: { color: '#a38b9d', fontSize: 8, letterSpacing: 2, fontWeight: '600', marginTop: 28 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#fa526e0c' }, recentTitle: { color: c.text, fontSize: 15, fontWeight: '500', marginTop: 10, marginBottom: 3 },
  favorites: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 26, backgroundColor: '#ffffff05', padding: 12, gap: 13, borderRadius: 15 }, heartBox: { width: 44, height: 44, backgroundColor: '#fa526e12', alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  collectionRow: { height: 87, marginLeft: 24, marginRight: 30, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 15 }, collectionTitle: { color: c.text, fontSize: 17, fontWeight: '500', marginBottom: 4 },
  index: { position: 'absolute', right: 3, top: '29%', bottom: 120, justifyContent: 'center' }, indexText: { fontSize: 9, lineHeight: 13, color: c.accent, fontWeight: '600', width: 16, textAlign: 'center' },
});
