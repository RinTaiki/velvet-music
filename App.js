import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlayerProvider, useMusic } from './src/PlayerContext';
import { UIProvider } from './src/components/UI';
import LibraryScreen from './src/screens/LibraryScreen';
import PlaylistScreen from './src/screens/PlaylistScreen';
import NowPlayingScreen from './src/screens/NowPlayingScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import QueueScreen from './src/screens/QueueScreen';
import LyricsScreen from './src/screens/LyricsScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: colors.surface, primary: colors.accent } };
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return <View style={styles.error}><Text style={styles.title}>Velvet needs a restart</Text><Text style={styles.message}>Your imported music is still saved. Close and reopen the app.</Text>{__DEV__ && <Text style={styles.message}>{this.state.error.message}</Text>}</View>;
    return this.props.children;
  }
}
export default function App() {
  return <ErrorBoundary><SafeAreaProvider><PlayerProvider><UIProvider><StatusBar style="light" /><MusicNavigation /></UIProvider></PlayerProvider></SafeAreaProvider></ErrorBoundary>;
}
function MusicNavigation() {
  const navigation = useNavigationContainerRef();
  const { openPlayerRequest, current } = useMusic();
  const openRequestedPlayer = () => { if (openPlayerRequest && current && navigation.isReady()) navigation.navigate('NowPlaying'); };
  useEffect(openRequestedPlayer, [openPlayerRequest]);
  return <NavigationContainer ref={navigation} theme={theme} onReady={openRequestedPlayer}><Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
    <Stack.Screen name="Library" component={LibraryScreen} />
    <Stack.Screen name="Playlist" component={PlaylistScreen} />
    <Stack.Screen name="NowPlaying" component={NowPlayingScreen} options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
    <Stack.Group screenOptions={{ presentation: 'modal', animation: 'slide_from_bottom' }}>
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Queue" component={QueueScreen} />
      <Stack.Screen name="Lyrics" component={LyricsScreen} />
    </Stack.Group>
  </Stack.Navigator></NavigationContainer>;
}
const styles = StyleSheet.create({ error: { flex: 1, backgroundColor: '#080809', alignItems: 'center', justifyContent: 'center', padding: 32 }, title: { color: '#fff', fontSize: 24, fontWeight: '700' }, message: { color: '#aaa', marginTop: 15, textAlign: 'center', lineHeight: 23 } });
