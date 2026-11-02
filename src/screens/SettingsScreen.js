import React from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { X, FolderOpen, Files, ChevronRight, AudioLines, HardDrive, ShieldCheck } from 'lucide-react-native';
import { useMusic } from '../PlayerContext';
import { Button, IconButton, SectionTitle, s } from '../components/UI';
import { nativeMusic } from '../services/importMusic';
import { homeWidgetsAvailable, updateHomeWidgets } from '../services/homeWidgets';
import { colors as c } from '../theme';
export default function SettingsScreen({ navigation, route }) {
  const { library, setSettings, runImport, busy, current, status } = useMusic();
  return <SafeAreaView style={s.page}>
    <View style={[s.row, s.padding, { marginBottom: 12 }]}><Text style={s.sectionTitle}>{route.params?.effects ? 'Sound & playback' : 'Settings'}</Text><IconButton icon={X} label="Close settings" onPress={() => navigation.goBack()} /></View>
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 50 }}>
      <View style={styles.intro}><AudioLines color={c.accent} size={33} /><Text style={styles.heading}>Every detail, heard.</Text><Text style={styles.description}>FLAC, MP3, and WAV. Original files, with no conversion or audio uploads.</Text></View>
      <View style={styles.card}><Text style={styles.label}>Original format playback</Text><Text style={[s.caption, { marginTop: 10 }]}>FLAC is lossless. MP3 keeps its original encoded quality. WAV plays in its stored codec, including uncompressed PCM. Imported audio is copied unchanged and decoded locally.</Text><Text style={[s.caption, { marginTop: 12 }]}>Use 1× speed for original playback. Output sample rate depends on iOS and your audio device. Bluetooth can use lossy compression; bit-perfect output is not guaranteed.</Text></View>
      <SectionTitle>Playback</SectionTitle>
      <View style={styles.card}><View style={s.row}><Text style={styles.label}>Volume</Text><Text style={s.caption}>{Math.round(library.settings.volume * 100)}%</Text></View><Slider accessibilityLabel="Player volume" value={library.settings.volume} minimumValue={0} maximumValue={1} minimumTrackTintColor={c.accent} maximumTrackTintColor={c.raised} thumbTintColor="#fff" onSlidingComplete={volume => setSettings({ volume })} style={{ height: 40 }} />
        <Text style={[styles.label, { marginTop: 15, marginBottom: 15 }]}>Playback speed</Text><View style={[s.row, { gap: 8 }]}>{[0.75, 1, 1.25, 1.5].map(rate => <Button key={rate} title={`${rate}×`} secondary={library.settings.rate !== rate} onPress={() => setSettings({ rate })} style={{ minHeight: 42 }} />)}</View>
        <Text style={[s.caption, { marginTop: 16 }]}>Pitch correction keeps voices natural when you change speed. A custom equalizer is not included.</Text>
      </View>
      <SectionTitle>Background & widgets</SectionTitle>
      <View style={styles.card}>
        <Text style={styles.label}>{homeWidgetsAvailable ? 'Installed iPhone features ready' : nativeMusic ? 'Background playback · widgets omitted' : 'Standalone installation needed for background capabilities'}</Text>
        <Text style={[s.caption, { marginTop: 12 }]}>The native queue can keep playing when you lock your iPhone or use another app. Expo Go cannot apply Velvet’s own background-audio capabilities or install its widgets.</Text>
        <Text style={[s.caption, { marginTop: 12 }]}>Your queue and position are saved. After relaunch, tap Play or the widget to resume. Force-quitting Velvet stops audio; playback cannot continue after iOS terminates the app.</Text>
        {homeWidgetsAvailable ? <Text style={[s.caption, { marginTop: 12 }]}>Home Screen: touch and hold → Edit → Add Widget → Velvet. Lock Screen: touch and hold → Customize → Add Widgets → Velvet · Resume. Widget controls open Velvet; iOS decides how often their artwork and text refresh.</Text> : <Text style={[s.caption, { marginTop: 12 }]}>Widgets are omitted from the default personal-signing build. Music playback, artwork, playlists, Files import, and system Now Playing controls remain available.</Text>}
        {homeWidgetsAvailable && <Button title="Refresh widgets" secondary onPress={() => updateHomeWidgets(current, status.playing, library.tracks.length).then(() => Alert.alert('Widgets updated', 'The latest track and cover were shared. iOS controls when each widget redraws.')).catch(error => Alert.alert('Widgets', error.message))} style={{ flex: 0, marginTop: 16 }} />}
      </View>
      <SectionTitle>Cover artwork</SectionTitle>
      <View style={styles.card}><View style={s.row}><Text style={[styles.label, { flex: 1 }]}>Find missing covers automatically</Text><Switch accessibilityLabel="Find missing covers automatically" value={library.settings.autoArtwork} onValueChange={autoArtwork => setSettings({ autoArtwork })} trackColor={{ false: c.raised, true: c.accent }} /></View><Text style={[s.caption, { marginTop: 14 }]}>When a song without artwork plays, its artist and title are sent to MusicBrainz. Covers come from Cover Art Archive and are saved for offline use. Audio files stay on your phone. Existing covers are kept.</Text><Text style={[s.caption, { marginTop: 12 }]}>Use a song’s menu → Find cover online to retry, or Edit song details to correct a filename-based match. Some recordings have no online cover.</Text></View>
      <SectionTitle>Music sources</SectionTitle>
      <View style={styles.card}><Text style={styles.label}>Choose what comes in.</Text><Text style={[s.caption, { marginTop: 8, marginBottom: 20 }]}>Scan only the folder you select, including subfolders. Velvet copies the music into its own storage so it stays available offline. Reselect a folder to import new songs; existing songs are kept.</Text><View style={{ gap: 10 }}><Button title={busy ? 'Importing…' : 'Choose a folder'} disabled={busy} icon={FolderOpen} onPress={() => runImport('folder')} /><Button title="Import individual files" disabled={busy} secondary icon={Files} onPress={() => runImport('files')} /></View>
        {!nativeMusic && <Text style={[s.caption, { marginTop: 14 }]}>Expo Go supports file import and embedded artwork. Install the iPhone build for folder scanning, background-audio configuration, widgets, and the AirPlay picker.</Text>}
      </View>
      <SectionTitle>On this iPhone</SectionTitle><View style={styles.card}><View style={s.row}><HardDrive color={c.muted} size={20} /><Text style={[styles.label, { flex: 1 }]}>{library.tracks.length} tracks</Text><Text style={s.caption}>{library.playlists.length} playlists</Text></View><View style={[s.row, { marginTop: 22 }]}><ShieldCheck color={c.muted} size={20} /><Text style={[s.caption, { flex: 1 }]}>Your library stays on your device. Deleting the app also deletes its imported copies. Keep your original music files backed up.</Text></View></View>
      <Text style={styles.brand}>velvet</Text><Text style={[s.caption, { textAlign: 'center' }]}>Your own frequency · 1.0.0</Text>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ intro: { paddingVertical: 22 }, heading: { fontSize: 30, letterSpacing: -1, color: c.text, fontWeight: '700', marginTop: 20 }, description: { fontSize: 15, lineHeight: 23, color: c.muted, marginTop: 12 }, card: { backgroundColor: c.surface, borderRadius: 20, padding: 20 }, label: { color: c.text, fontSize: 15, fontWeight: '500' }, brand: { color: '#ffffff35', fontSize: 35, letterSpacing: -2, fontWeight: '700', textAlign: 'center', marginTop: 36, marginBottom: 5 } });
