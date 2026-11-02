import React, { createContext, useContext, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Image, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Music2, X, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { localUri } from '../services/importMusic';
import { colors as c } from '../theme';
const UIContext = createContext(null);
export const useUI = () => useContext(UIContext);

export function UIProvider({ children }) {
  const [sheet, setSheet] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const submitPrompt = () => {
    if (!prompt || !text.trim()) return;
    const save = prompt.onSave, value = text.trim();
    setPrompt(null);
    // Allow callbacks to open the next prompt after this modal dismisses.
    setTimeout(() => save(value), 320);
  };
  const ui = {
    sheet: (title, actions, subtitle) => setSheet({ title, actions, subtitle }),
    close: () => setSheet(null),
    prompt: (title, initial, onSave) => { setText(initial); setPrompt({ title, onSave }); },
  };
  return <UIContext.Provider value={ui}>
    {children}
    <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
      <View style={s.modal}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss menu" onPress={() => setSheet(null)} />
        <View accessibilityViewIsModal style={[s.sheet, { paddingBottom: Math.max(20, insets.bottom), maxHeight: height * 0.84 }]}>
          <View style={s.handle} />
          <View style={s.sheetHeading}><View style={{ flex: 1 }}><Text style={s.sheetTitle}>{sheet?.title}</Text>{sheet?.subtitle && <Text style={s.caption}>{sheet.subtitle}</Text>}</View><IconButton icon={X} label="Close menu" onPress={() => setSheet(null)} /></View>
          <ScrollView>{sheet?.actions.map((action, i) => <Pressable key={i} disabled={action.disabled} style={({ pressed }) => [s.action, pressed && { opacity: 0.5 }, action.disabled && { opacity: 0.4 }]} onPress={() => { setSheet(null); setTimeout(() => action.onPress?.(), 320); }}>
            {action.icon && <action.icon color={action.destructive ? c.accent : c.text} size={21} />}<Text style={[s.actionText, action.destructive && { color: c.accent }]}>{action.title}</Text>{action.detail && <Text style={s.caption}>{action.detail}</Text>}<ChevronRight size={16} color={c.muted} />
          </Pressable>)}</ScrollView>
        </View>
      </View>
    </Modal>
    <Modal visible={!!prompt} transparent animationType="fade" onRequestClose={() => setPrompt(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.promptWrap}>
        <View style={s.prompt}><Text style={s.sheetTitle}>{prompt?.title}</Text><TextInput accessibilityLabel={prompt?.title} autoFocus value={text} onChangeText={setText} style={s.input} selectionColor={c.accent} placeholderTextColor={c.muted} maxLength={120} returnKeyType="done" onSubmitEditing={submitPrompt} />
          <View style={s.row}><Button title="Cancel" secondary onPress={() => setPrompt(null)} /><Button title="Save" disabled={!text.trim()} onPress={submitPrompt} /></View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </UIContext.Provider>;
}
export function IconButton({ icon: Icon, label, onPress, size = 23, color = c.text, active, fill, style, disabled }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!active, disabled: !!disabled }} disabled={disabled} hitSlop={5} onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress?.(); }} style={({ pressed }) => [s.icon, active && { backgroundColor: '#fa526e20' }, pressed && { opacity: 0.45 }, disabled && { opacity: 0.3 }, style]}><Icon size={size} color={active ? c.accent : color} fill={fill ? (active ? c.accent : color) : 'none'} strokeWidth={1.8} /></Pressable>;
}
export function Button({ title, onPress, icon: Icon, secondary, disabled, style }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && { backgroundColor: c.raised }, pressed && { opacity: 0.6 }, disabled && { opacity: 0.35 }, style]}>{Icon && <Icon size={18} color={secondary ? c.accent : '#fff'} fill={title === 'Play' ? '#fff' : 'none'} />}<Text style={[s.buttonText, secondary && { color: c.accent }]}>{title}</Text></Pressable>;
}
export function Cover({ artwork, size = 56, title = '', style, onError }) {
  const [failed, setFailed] = useState(false);
  React.useEffect(() => setFailed(false), [artwork]);
  if (artwork && !failed) return <Image accessibilityLabel={`${title || 'Album'} artwork`} source={{ uri: localUri(artwork) }} onError={() => { setFailed(true); onError?.(); }} style={[{ width: size, height: size, borderRadius: size * 0.12, backgroundColor: c.raised }, style]} />;
  const hues = [['#7b2347', '#20152c', '#c77863'], ['#315c71', '#131c35', '#889d95'], ['#7a573c', '#231c33', '#d7aa80']];
  const palette = hues[(title.charCodeAt(0) || 0) % hues.length];
  return <LinearGradient accessibilityLabel={`${title || 'Music'} artwork placeholder`} colors={palette} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cover, { width: size, height: size, borderRadius: size * 0.12 }, style]}>
    {[0.38, 0.55, 0.72, 0.89].map((x, i) => <View key={i} style={{ position: 'absolute', width: size * x, height: size * x, borderRadius: size, borderWidth: 1, borderColor: '#ffffff17', transform: [{ translateX: size * 0.21 }, { translateY: -size * 0.18 }] }} />)}
    <Music2 size={size * 0.3} strokeWidth={1.2} color="#ffffffc0" />
    {size > 120 && <Text style={{ position: 'absolute', bottom: size * 0.1, fontSize: size * 0.043, letterSpacing: 3, color: '#ffffff80', fontWeight: '600' }}>VELVET / LOCAL</Text>}
  </LinearGradient>;
}
export function SectionTitle({ children, detail }) { return <View style={[s.row, { marginTop: 26, marginBottom: 14 }]}><Text style={s.sectionTitle}>{children}</Text>{detail && <Text style={s.caption}>{detail}</Text>}</View>; }
export const time = value => { const n = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; };
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.bg }, padding: { paddingHorizontal: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 36, fontWeight: '700', letterSpacing: -1.3, color: c.text },
  sectionTitle: { fontSize: 22, letterSpacing: -0.5, fontWeight: '700', color: c.text },
  caption: { fontSize: 13, color: c.muted, lineHeight: 19 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  button: { flex: 1, minHeight: 48, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cover: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  modal: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1b1b20', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 10 },
  handle: { width: 36, height: 5, backgroundColor: '#ffffff30', borderRadius: 4, alignSelf: 'center', marginBottom: 12 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16, paddingLeft: 8 },
  sheetTitle: { color: c.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  action: { minHeight: 60, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ffffff18', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 14 },
  actionText: { fontSize: 16, color: c.text, flex: 1 },
  promptWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#0009' },
  prompt: { backgroundColor: c.surface, padding: 24, borderRadius: 24, width: '100%', maxWidth: 420, gap: 20 },
  input: { backgroundColor: '#ffffff09', borderRadius: 12, padding: 14, fontSize: 17, color: c.text, minHeight: 48 },
});
