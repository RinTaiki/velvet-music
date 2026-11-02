import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ListMusic } from 'lucide-react-native';
import { useMusic } from '../PlayerContext';
import { IconButton, Cover, s } from '../components/UI';
import { colors as c } from '../theme';
export default function QueueScreen({ navigation }) {
  const { session, library, playQueueIndex } = useMusic();
  return <SafeAreaView style={s.page}><View style={[s.row, s.padding]}><View><Text style={s.sectionTitle}>Playing next</Text><Text style={s.caption}>{session.queue.length} tracks in your queue</Text></View><IconButton icon={X} label="Close queue" onPress={() => navigation.goBack()} /></View>
    <FlatList data={session.queue} keyExtractor={(id, i) => `${id}-${i}`} contentContainerStyle={{ padding: 24 }} ListEmptyComponent={<Text style={s.caption}>Play a song to start your queue.</Text>} renderItem={({ item: id, index }) => {
      const track = library.tracks.find(t => t.id === id);
      if (!track) return null;
      return <Pressable accessibilityRole="button" accessibilityLabel={`Play ${track.title}`} onPress={() => { playQueueIndex(index); navigation.goBack(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderColor: c.line }}><Text style={{ width: 18, color: index === session.index ? c.accent : c.muted, fontSize: 12 }}>{index + 1}</Text><Cover artwork={track.artwork} title={track.title} size={50} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: index === session.index ? c.accent : c.text, fontSize: 16 }}>{track.title}</Text><Text style={[s.caption, { marginTop: 5 }]}>{track.artist}{index === session.index ? ' · Now playing' : ''}</Text></View></Pressable>;
    }} />
  </SafeAreaView>;
}
