import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Play, Pause, SkipForward, ListMusic } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMusic } from '../PlayerContext';
import { Cover, IconButton } from './UI';
import { colors as c } from '../theme';
export default function MiniPlayer({ navigation }) {
  const { current, status, toggle, next } = useMusic();
  const insets = useSafeAreaInsets();
  if (!current) return null;
  return <View style={[styles.wrap, { bottom: Math.max(12, insets.bottom) }]}>
    <BlurView intensity={80} tint="systemThickMaterialDark" style={styles.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open Now Playing" onPress={() => navigation.navigate('NowPlaying')} style={styles.info}>
        <Cover artwork={current.artwork} title={current.title} size={45} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.title}>{current.title}</Text><Text numberOfLines={1} style={styles.artist}>{current.artist}</Text></View>
      </Pressable>
      {status.isBuffering ? <ActivityIndicator color={c.text} style={{ width: 44 }} /> : <IconButton icon={status.playing ? Pause : Play} fill label={status.playing ? 'Pause' : 'Play'} onPress={toggle} />}
      <IconButton icon={SkipForward} size={21} fill label="Next track" onPress={next} />
      <IconButton icon={ListMusic} size={21} label="Open queue" onPress={() => navigation.navigate('Queue')} />
    </BlurView>
    <View style={styles.progress}><View style={{ height: 2, backgroundColor: c.accent, width: `${Math.min(100, (status.currentTime / (status.duration || 1)) * 100)}%` }} /></View>
  </View>;
}
const styles = StyleSheet.create({ wrap: { position: 'absolute', left: 12, right: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff17', backgroundColor: '#292028', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16 }, bar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingLeft: 11, paddingRight: 3 }, info: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }, title: { color: c.text, fontSize: 14, fontWeight: '600' }, artist: { color: '#bdb4be', fontSize: 11, marginTop: 4 }, progress: { height: 2, backgroundColor: '#ffffff13', marginHorizontal: 15 } });
