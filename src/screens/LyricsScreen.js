import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Pencil, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusic } from '../PlayerContext';
import { IconButton, s } from '../components/UI';
import { colors as c } from '../theme';
export default function LyricsScreen({ navigation, route }) {
  const { library, updateTrack } = useMusic();
  const track = library.tracks.find(t => t.id === route.params.trackId);
  const [editing, setEditing] = useState(false);
  const [lyrics, setLyrics] = useState(track?.lyrics || '');
  return <LinearGradient colors={['#412336', '#121018']} style={{ flex: 1 }}><SafeAreaView style={{ flex: 1 }}><View style={[s.row, s.padding]}><View style={{ flex: 1 }}><Text numberOfLines={1} style={s.sectionTitle}>{track?.title || 'Lyrics'}</Text><Text style={s.caption}>{track?.artist}</Text></View><IconButton icon={editing ? Check : Pencil} label={editing ? 'Save lyrics' : 'Edit lyrics'} onPress={() => { if (editing && track) updateTrack(track.id, { lyrics }); setEditing(!editing); }} /><IconButton icon={X} label="Close lyrics" onPress={() => navigation.goBack()} /></View><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={{ padding: 28, paddingBottom: 60, flexGrow: 1 }} keyboardShouldPersistTaps="handled">{editing ? <TextInput accessibilityLabel="Lyrics text" multiline autoFocus textAlignVertical="top" value={lyrics} onChangeText={setLyrics} placeholder="Paste your lyrics here…" placeholderTextColor="#ffffff50" style={{ color: c.text, fontSize: 24, lineHeight: 36, minHeight: 300 }} /> : <><Text style={{ color: lyrics ? '#f4e2ed' : '#ffffff70', fontSize: 28, fontWeight: '600', lineHeight: 42, letterSpacing: -0.7 }}>{lyrics || 'Every song has a story.\nAdd its words here.'}</Text>{!lyrics && <Text style={[s.caption, { marginTop: 22 }]}>Tap the pencil to paste lyrics. They are saved locally with this track. Lyrics do not scroll in sync with playback.</Text>}</>}</ScrollView></KeyboardAvoidingView></SafeAreaView></LinearGradient>;
}
