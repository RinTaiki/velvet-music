import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, useWindowDimensions, ActivityIndicator, Animated, PanResponder, Platform, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { requireNativeViewManager } from 'expo-modules-core';
import Slider from '@react-native-community/slider';
import { ChevronDown, Airplay, AudioLines, MoreHorizontal, Heart, Plus, MessageSquareText, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Repeat1, ListMusic, Volume1, Volume2 } from 'lucide-react-native';
import { useMusic } from '../PlayerContext';
import { Cover, IconButton, Button, time, s } from '../components/UI';
import { useTrackActions } from '../components/TrackRow';
import { localUri, nativeMusic } from '../services/importMusic';
import { colors as c } from '../theme';
import { qualityLabel, qualityDescription } from '../audioFormats.cjs';
import { shouldDismissPlayer } from '../session.cjs';

const NativeAirPlay = nativeMusic ? requireNativeViewManager('MusicLibrary') : null;
export default function NowPlayingScreen({ navigation }) {
  // Native stack modals need their own measurements; the library's provider
  // can report insets for the presenting screen instead of this full-screen view.
  return <SafeAreaProvider style={{ flex: 1 }}><PlayerContent navigation={navigation} /></SafeAreaProvider>;
}
function PlayerContent({ navigation }) {
  const music = useMusic();
  const { current, status } = music;
  const { menu, addToPlaylist } = useTrackActions();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const minimize = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Library');
  const artSize = Math.min(width - 64, height * 0.38, 440);
  const [scrubbing, setScrubbing] = useState(null);
  const scale = useRef(new Animated.Value(status.playing ? 1 : 0.92)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(0);
  const dismissRef = useRef(minimize); dismissRef.current = minimize;
  const heightRef = useRef(height); heightRef.current = height;
  useEffect(() => { Animated.spring(scale, { toValue: status.playing ? 1 : 0.92, useNativeDriver: true, friction: 9 }).start(); }, [status.playing]);
  useEffect(() => setScrubbing(null), [current?.id]);
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => scrollY.current <= 0 && g.dy > 12 && g.dy > Math.abs(g.dx) * 1.25,
    onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (shouldDismissPlayer(g.dy, g.vy)) Animated.timing(drag, { toValue: heightRef.current, duration: 180, useNativeDriver: true }).start(({ finished }) => { if (finished) dismissRef.current(); });
      else Animated.spring(drag, { toValue: 0, useNativeDriver: true, tension: 100, friction: 12 }).start();
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start(),
  })).current;
  if (!current) return <SafeAreaView style={s.page}><IconButton icon={ChevronDown} label="Close player" onPress={minimize} /><Text style={[s.caption, s.padding]}>Choose a track from your library.</Text></SafeAreaView>;
  const duration = status.duration || current.duration || 0;
  const favorite = music.library.favorites.includes(current.id);
  return <View style={[s.page, { overflow: 'hidden' }]}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {current.artwork && <Image source={{ uri: localUri(current.artwork) }} blurRadius={80} style={[StyleSheet.absoluteFill, { opacity: 0.65, transform: [{ scale: 1.25 }] }]} resizeMode="cover" />}
      <LinearGradient colors={current.artwork ? ['#10101838', '#21152588', '#080809f2'] : ['#392334', '#431f30', '#151018']} style={StyleSheet.absoluteFill} />
    </View>
    <Animated.View style={{ flex: 1, paddingTop: Math.max(insets.top, 16), paddingLeft: insets.left, paddingRight: insets.right, paddingBottom: insets.bottom, transform: [{ translateY: drag }] }}>
      <View {...pan.panHandlers} style={{ alignItems: 'center', height: 20, justifyContent: 'center' }}><View style={[s.handle, { marginBottom: 0, backgroundColor: '#ffffff45' }]} /></View>
      <View style={styles.toolbar}>
        <View style={{ flexShrink: 0 }}><IconButton icon={ChevronDown} label="Minimize player and return to library" size={27} onPress={minimize} /></View>
        <View style={styles.toolbarActions}>
        {NativeAirPlay ? <NativeAirPlay accessibilityLabel="Select AirPlay output" style={{ width: 40, height: 44 }} /> : <IconButton icon={Airplay} label="AirPlay information" onPress={() => Alert.alert('AirPlay', 'Use Control Center to select an audio output. The installed iPhone build also includes the native AirPlay picker here.')} />}
        <IconButton icon={AudioLines} size={22} label="Audio effects" onPress={() => navigation.navigate('Settings', { effects: true })} />
        <IconButton icon={MoreHorizontal} label="Track options" onPress={() => menu(current)} />
        </View>
      </View>
      <Text style={[styles.eyebrow, { textAlign: 'center', marginTop: 4 }]}>NOW PLAYING</Text>
      <ScrollView contentContainerStyle={[styles.content, { flexGrow: 1 }]} showsVerticalScrollIndicator={false} onScroll={event => { scrollY.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} bounces={false}>
        <View {...pan.panHandlers} accessibilityHint="Swipe down on the artwork or title to minimize the player">
        <View style={{ alignItems: 'center', marginTop: height > 750 ? 28 : 12, marginBottom: 25 }}><Animated.View style={[styles.artwork, { transform: [{ scale }] }]}><Cover artwork={current.artwork} title={current.album || current.title} size={artSize} style={{ borderRadius: 16 }} onError={() => music.reportArtworkError(current.id, current.artwork)} /></Animated.View></View>
        <View style={[s.row, { marginBottom: 10 }]}><Cover artwork={current.artwork} title={current.title} size={46} /><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={2} style={[styles.title, { fontSize: 22, lineHeight: 27 }]}>{current.title}</Text><Text numberOfLines={1} style={[styles.artist, { fontSize: 16 }]}>{current.artist}</Text></View><IconButton icon={Heart} label={favorite ? 'Remove from favorites' : 'Add to favorites'} active={favorite} fill={favorite} onPress={() => music.toggleFavorite(current.id)} /></View>
        </View>
        <Text accessibilityRole="button" onPress={() => Alert.alert('Original audio', qualityDescription(current, music.library.settings.rate))} style={{ color: '#ffffff90', fontSize: 10, letterSpacing: 1, marginBottom: 18, paddingVertical: 6 }}>{qualityLabel(current)}  ⓘ</Text>
        {(!current.artwork || music.artworkBusy.includes(current.id)) && <View style={{ marginBottom: 16, gap: 10 }}>
          <Text accessibilityLiveRegion="polite" style={s.caption}>{music.artworkStatus[current.id]?.message || (music.library.settings.autoArtwork ? 'Checking song tags and artwork…' : 'No cover image. Recover it from the file or choose an image.')}</Text>
          <View style={[s.row, { gap: 10 }]}><Button title="Find cover" secondary disabled={music.artworkBusy.includes(current.id)} onPress={() => music.findCover(current, true)} style={{ minHeight: 42 }} /><Button title="Choose image" secondary onPress={() => music.changeCover(current.id, true)} style={{ minHeight: 42 }} /></View>
        </View>}
        {music.error && <Text accessibilityRole="alert" style={styles.error}>{music.error}</Text>}
        <View>
          <Slider accessibilityLabel="Track progress" style={{ width: '100%', height: 30 }} minimumValue={0} maximumValue={duration || 1} value={scrubbing ?? status.currentTime ?? 0} disabled={!status.isLoaded} minimumTrackTintColor="#f6e9ef" maximumTrackTintColor="#ffffff30" thumbTintColor="#fff" onSlidingStart={value => setScrubbing(value)} onValueChange={setScrubbing} onSlidingComplete={async value => { await music.seek(value); setScrubbing(null); }} />
          <View style={s.row}><Text style={styles.time}>{time(scrubbing ?? status.currentTime)}</Text><Text style={styles.time}>{time(duration)}</Text></View>
        </View>
        <View style={[s.row, { gap: 0, marginTop: 19, marginBottom: 22 }]}>
          <IconButton icon={Shuffle} active={music.shuffle} label="Toggle shuffle" onPress={music.toggleShuffle} />
          <IconButton icon={SkipBack} size={32} fill label="Previous track" onPress={music.previous} />
          {status.isBuffering ? <View style={styles.play}><ActivityIndicator size="large" color={c.text} /></View> : <IconButton icon={status.playing ? Pause : Play} size={40} fill label={status.playing ? 'Pause' : 'Play'} onPress={music.toggle} style={styles.play} />}
          <IconButton icon={SkipForward} size={32} fill label="Next track" onPress={music.next} />
          <IconButton icon={music.repeat === 'one' ? Repeat1 : Repeat} active={music.repeat !== 'off'} label={`Repeat ${music.repeat}. Change repeat mode`} onPress={music.cycleRepeat} />
        </View>
        <View style={[s.row, { gap: 12, marginTop: 1 }]}><Volume1 size={17} color="#ffffff70" /><Slider accessibilityLabel="Player volume" minimumValue={0} maximumValue={1} value={music.library.settings.volume} onSlidingComplete={volume => music.setSettings({ volume })} minimumTrackTintColor="#ffffff8a" maximumTrackTintColor="#ffffff25" thumbTintColor="#e7dbe2" style={{ flex: 1, height: 30 }} /><Volume2 size={17} color="#ffffff70" /></View>
        <View style={[s.row, { justifyContent: 'space-around', marginTop: 15 }]}>
          <IconButton icon={MessageSquareText} label="Lyrics" onPress={() => navigation.navigate('Lyrics', { trackId: current.id })} />
          <IconButton icon={Plus} label="Add to playlist" onPress={() => addToPlaylist(current)} />
          <IconButton icon={ListMusic} label="Open play queue" onPress={() => navigation.navigate('Queue')} />
        </View>
        <Text style={styles.footer}>A MOMENT. A MOOD. YOUR MUSIC.</Text>
      </ScrollView>
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({ toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, minHeight: 48, flexShrink: 0 }, toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }, content: { paddingHorizontal: 32, paddingBottom: 12, maxWidth: 600, width: '100%', alignSelf: 'center' }, eyebrow: { color: '#e8d8e0', fontSize: 9, fontWeight: '700', letterSpacing: 2 }, source: { color: '#ffffff70', fontSize: 10, marginTop: 4 }, artwork: { shadowColor: '#000', shadowOffset: { width: 0, height: 22 }, shadowRadius: 25, shadowOpacity: 0.5 }, title: { color: '#fff', fontSize: 26, letterSpacing: -0.8, fontWeight: '700', lineHeight: 31 }, artist: { color: '#d8b6c8', fontSize: 19, marginTop: 6 }, time: { color: '#ffffff70', fontSize: 11, fontVariant: ['tabular-nums'], marginTop: 2 }, play: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff0b' }, error: { color: '#ffb2c0', fontSize: 12, marginBottom: 12, lineHeight: 18 }, footer: { textAlign: 'center', color: '#ffffff30', fontSize: 8, letterSpacing: 2.3, fontWeight: '500', marginTop: 20 } });
