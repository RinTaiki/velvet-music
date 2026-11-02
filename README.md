# Velvet — a native iPhone music player

An Expo / React Native application, not a website. Inspired by the supplied Samsung Music references and Apple Music's dark iOS interface. Uses system typography, artwork-tinted blurred backgrounds, native navigation transitions, and haptic controls.

**Current preference: spend nothing.** The default build omits widgets/App Groups for personal signing. Start with [FREE-INSTALL.md](FREE-INSTALL.md) for the Windows → unsigned GitHub build → AltStore Classic route. The EAS preview instructions below require a paid Apple Developer membership for physical-device distribution and are retained as an optional alternative, not the default recommendation. No cloud build has been run or IPA produced by this workspace.

## Run

Install Node.js 22.13+ or 24.3+ (LTS), then run in this folder:

```sh
npm install
npx expo install --fix
npm start
```

On Windows PowerShell, use `npm.cmd` / `npx.cmd` if execution policy blocks `.ps1` commands. This project targets **Expo SDK 58**, matching the current iPhone Expo Go client. `expo install --fix` aligns packages with the installed SDK 58 patch. `npm start` explicitly selects Expo Go; `npm run start:dev` selects an installed development build. No server, API keys, or music account is required.

### Updating an existing SDK 55 installation

Stop Metro with **Ctrl+C**, then run:

```powershell
npm.cmd install
npx.cmd expo install --fix
npx.cmd expo-doctor
npm.cmd start -- --clear
```

`npm install` replaces the older dependencies and updates `package-lock.json`; the checked-in SDK 55 lockfile must not be used with `npm ci` until this installation succeeds. Scan the **new** QR code with the iPhone Camera and open it in Expo Go. Keep your computer and iPhone on the same Wi-Fi and allow Node.js through Windows Firewall on private networks. If local networking cannot connect, stop Metro and use `npm.cmd run start:tunnel` (the CLI may ask to install its tunnel dependency). The DevTools download warning uses a fallback and is separate from an SDK version mismatch.

Expo Go on physical iPhones supports the current SDK only. There is no older iOS Expo Go download for SDK 55. Native development/preview builds must also be rebuilt after this SDK upgrade.

**Expo Go:** open the QR code on a compatible iPhone client, tap **+ → Import audio files**, and select music in Files. Files are copied unchanged into permanent storage. The app reads MP3 ID3, FLAC Vorbis/PICTURE, tagged WAV, and M4A/iTunes title/artist/album/picture metadata without a custom build. Filenames are a fallback when tags are absent. Already-imported songs recover their tags and covers the next time you play them; no re-import is needed. Missing covers are then looked up online using the recovered artist/title. Use a song's menu to edit details, retry cover lookup, or choose artwork manually. Folder scanning and extended source audio specifications require the local Swift module and therefore an installed build. Background behavior in Expo Go is not a substitute for testing an installed build.

## Install on your iPhone from Windows

EAS builds iOS in the cloud; a Mac is not needed for this route. A paid Apple Developer membership and an Expo account are required for EAS signing and physical-device distribution. The Apple account must have permission to create signing assets. Your app's bundle identifier is configured in `app.json`; change `com.velvet.localmusic` if necessary.

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview
```

Register your iPhone through the device registration link, follow the signing prompts, then open the finished build's installation link on that registered iPhone. **Preview is a standalone installed app:** it plays without Metro or your computer. If you register another device later, rebuild or re-sign for it. Apple signing/provisioning expiry still applies.

For development with Metro and the native module:

```sh
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client
```

Install the development build from its EAS link and connect it to Metro. Enable iOS Developer Mode if requested. On a Mac with Xcode, `npx expo run:ios --device` builds locally. For TestFlight/App Store distribution, use `npx eas-cli@latest build --platform ios --profile production`, then `npx eas-cli@latest submit --platform ios`. Store submission requires your own app listing and review; nothing has been built, signed, uploaded, or published for you in this workspace.

## Background playback and widgets

Use the **installed preview build** above for these features. It is a standalone native iPhone app and does not need Metro or your computer after installation. Expo Go cannot adopt Velvet's own native audio capabilities or install its WidgetKit extension. Expo Go and standalone Velvet have separate app storage, so import your music into the installed Velvet app once.

Playback now uses Expo Audio's **native playlist / AVQueuePlayer**. The complete queue is supplied to iOS, so advancing, repeat-one/repeat-all, and system next/previous no longer require a JavaScript completion callback. The audio session uses playback mode, silent-switch playback and background audio; the app declares `UIBackgroundModes: ["audio"]`. Start a song, go Home or lock the screen, and audio should continue in the installed app. Calls, Siri, headphones disconnects, and other audio interruptions remain subject to iOS behavior.

Leaving the app is different from **force-quitting** it in the app switcher: iOS terminates its audio process when you force-quit. The app cannot keep playing after termination or start unsolicited audio while completely closed. Instead, queue/order, repeat/shuffle, and playback position are saved (every five seconds and on app-state/queue changes). Relaunch restores the queue **paused**; Play or a widget action resumes it. A recent seek/track change may be lost if iOS kills the process before a pending write completes.

The included native widgets need a **new build**; Fast Refresh/EAS Update cannot add an extension:

- **Velvet Player:** small artwork/title widget and medium artwork/title/artist widget with previous/resume/next links. Touch and hold Home Screen → Edit / Add Widget → Velvet.
- **Velvet · Resume:** rectangular Lock Screen widget with a cover thumbnail, title and artist. Customize Lock Screen → Add Widgets → Velvet.
- Widget taps open Velvet and send an allowlisted `velvet://player?action=...` command. They can cold-launch and resume the saved queue. They do not pretend to run audio in the widget extension or change play/pause without opening the app.
- Widget snapshots contain the last track and a copy of its cover in the shared App Group. iOS controls refresh timing, so they are not a continuously updating progress display. Settings → Background & widgets includes a refresh action in installed builds.

`plugins/withVelvetWidgets.js` generates the pure SwiftUI/WidgetKit extension, matching App Group entitlements, embedding/dependency build phases, and EAS extension signing metadata. It uses the existing Expo config plugin tools; no additional widget JS dependency is needed. The group defaults to `group.<your bundle identifier>.music`; change your app bundle identifier before building if needed, and let EAS configure signing for both the main app and `.widgets` target. The extension contains no React Native runtime or access to private audio files.

The maximized player now has a cover thumbnail beside the title, and you can drag **downward on the artwork/title area**, not just the top handle. A short flick or deliberate pull minimizes it with a spring-back for cancelled gestures. Scrubber/volume controls remain outside that gesture area. Apple's built-in Lock Screen Now Playing panel has a system-owned layout; Velvet can provide its artwork and metadata, but cannot insert an extra image beside that system title. The separate Lock Screen widget supplies that thumbnail/title arrangement.

## Import a folder

1. Install the preview/development iPhone build.
2. Tap **+ → Scan a folder** and choose a folder in the native Files picker.
3. Its supported audio files, including subfolders, become a playlist named after that folder. On a playlist, **+** imports directly into it.
4. Keep the app open during the import. For large cloud folders, download them in Files first. Read failures are reported without discarding successful imports.
5. Scan the same folder again to add new songs. SHA-256 content hashes prevent duplicate audio records. Your custom playlist name/order/artwork are kept. Re-scanning does not remove songs deleted from the original folder. This is an explicit import, not ongoing filesystem watching.

Files are coordinated through `NSFileCoordinator`, copied into the sandbox, and accessed only while the user-granted security scope is active. No whole-phone scan is performed. Originals are never changed. FLAC, MP3, WAV, M4A/AAC, AIFF, CAF, and audio MP4 are supported import types; actual decoding depends on iOS and the file's codec. The file picker displays all file types so providers cannot grey out FLAC or WAV due to incorrect MIME metadata, then validates the extensions. DRM-protected Apple Music subscription downloads cannot be imported. Import consumes additional phone storage; deleting this app deletes its copies, so keep originals backed up. Both the installed build and Expo Go now use native SHA-256 digests to identify imported audio without reading whole songs into JS memory. Songs imported by earlier filename/size fallback versions retain their old identifiers.

## Artwork and audio quality

Song tags and embedded pictures are read locally first, including for existing imports. Reads seek past audio payloads and cap each metadata read at 16 MiB. Manual artist/title edits and manually chosen covers are preserved. If the file has no picture, missing artwork is looked up using its artist/title on MusicBrainz and front covers from Cover Art Archive. Lookups require a matching artist and title (including version qualifiers such as live/remix), accept canonical or credited artist names, prefer the tagged album, check up to five releases, and fall back to the release group's cover. MusicBrainz requests are serialized and spaced at least 1.1 seconds apart. Downloaded images are validated by their bytes and by the iOS image decoder, awaited to disk, and cached in Documents/Artwork for offline use. No-match results are held for seven days; manual **Find cover online** retries immediately. You can disable automatic online lookup in **Settings → Cover artwork**; local tag reading still works. Only song metadata goes to online services; audio is never uploaded. The player displays lookup errors, missing-artist/no-match messages, and buttons to retry or choose an image. Files with no artist tags need a manual artist entry for online matching. A song's menu includes a link to its cover source.

For lock-screen artwork, installed builds use the local native image bridge. Expo Go uses AVFoundation's original-asset metadata fallback for embedded pictures and the public remote image URL for downloaded covers; its local-file artwork loader is limited. Reliable offline lock-screen artwork for every custom image requires the installed build. No private audio/artwork is uploaded to work around Expo Go limitations.

The Now Playing toolbar measures its own modal safe area and keeps minimize separate from the remaining icons. The blurred background is non-interactive. The source-format badge opens file details; native imports also read sample rate, channels, codec, and bit depth when reported by the source decoder.

Audio is copied byte-for-byte and decoded directly by Expo Audio/AVQueuePlayer, with no resampling/transcoding step in the import pipeline, compression, streaming replacement, or equalizer. FLAC is a lossless source format; PCM WAV is uncompressed/lossless. WAV can contain other codecs, so an uninspected WAV is labeled **Original file**, not automatically lossless. MP3 preserves its original encoded quality; it cannot recover discarded audio. iOS may still resample for the active output route, and Bluetooth may apply lossy compression. This app does not guarantee bit-perfect or universal “100%” hardware output. Keep playback speed at 1× for original-speed playback.

## Included features

- Library tabs for playlists, tracks and albums; search, recent playlists, favorites, A–Z jump index.
- Playlist details, sorting, shuffle/play, rename, custom covers, favorite playlists, remove/reorder songs in Edit mode.
- Global player context, floating mini-player, queue, seek, shuffle, repeat-all/repeat-one, previous/next, favorites and add-to-playlist.
- Now Playing opens modally. Artwork blurs behind the controls; minimize with the chevron or swipe down on the handle.
- Native AirPlay route picker in installed iOS builds; Bluetooth routing follows iOS.
- Background audio configuration, system play/pause/scrub, and native next/previous commands. An in-process native artwork URL protocol lets Expo load and cache offline artwork through URLSession without using a server.
- Embedded title, artist, album, artwork, and duration extraction in installed builds. Tracks without artwork have a generated gradient cover and native lock-screen music placeholder.
- Persisted playlists, favorites, local lyrics, chosen artwork, volume and playback speed. Lyrics can be pasted/edited; automatic lyric lookup and synchronized lyrics are not included.
- Sound settings control actual player volume and pitch-corrected playback speed. Files retain original quality. No custom equalizer, crossfade, or gapless-playback claim.

**Artwork on iPhone:** iOS owns its Now Playing presentation. This app supplies the artwork and metadata for the **Lock Screen and Control Center**, including while backgrounded. It cannot change your Home Screen wallpaper. The included Home/Lock Screen widgets are a separate native extension. Tap lock-screen artwork to expand it when supported by iOS.

Playback uses `expo-audio` rather than the deprecated `expo-av`, with React Navigation native stack, Lucide, Expo LinearGradient/Blur, and a small local Expo Swift module. There are no placeholder buttons pretending to import, equalize, fetch lyrics, or play audio. The library starts empty so you can add your own music.

## Project layout

- `App.js`: providers and native navigation.
- `src/PlayerContext.js`: global playback, queue, persistence and library mutations.
- `src/model.cjs`: pure import/queue/grouping rules.
- `src/session.cjs`: validated queue restoration, widget links and dismissal thresholds.
- `plugins/withVelvetWidgets.js` and `widgets/ios/VelvetWidgets.swift`: native extension generation and layouts.
- `src/services/importMusic.js`: native bridge, Expo Go file import and permanent artwork copies.
- `src/screens/`: Library, Playlist, Now Playing, Queue, Settings and editable Lyrics.
- `src/components/`: shared controls, sheets, covers, track rows, mini-player.
- `modules/music-library/ios/`: folder picker, recursive scanner, metadata/artwork extraction, native AirPlay view and remote track commands. Expo autolinks this module at build time.

## Validation

```sh
npm test
npm run check
npx expo-doctor
npx expo export --platform ios
```

The Node suite now has 34 tests covering metadata/artwork, queue rules and session restoration (including removed tracks and intentional duplicate entries), widget deep-link validation, repeat-mode mapping and dismissal thresholds. Widget plugin tests apply the mods to Expo's real iOS template and check extension sources, matching App Groups, target dependencies/embedding, signing declarations and idempotence. Full `expo prebuild --platform ios` is unavailable on Windows, but direct config-mod tests exercise the generated native files. The iOS Metro export checks JS bundling separately; it does not compile Swift. This workspace cannot run Xcode or an iOS simulator; device compilation, widget rendering, background playback, and gesture verification still require the installed iPhone build.

Before personal release, test on your actual iPhone: import local/iCloud folders, offline access, several native queue transitions with the screen locked, system next/previous, repeat/shuffle, interruptions/AirPlay/Bluetooth, widget add/refresh/cold launch, restored seek position, and downward swipes on artwork/title without interfering with seeking. Force-quit should stop playback; a widget tap should launch the app and resume explicitly.

References: [Expo audio](https://docs.expo.dev/versions/v58.0.0/sdk/audio/), [DocumentPicker](https://docs.expo.dev/versions/v58.0.0/sdk/document-picker/), [SDK upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [SDK 58 package versions](https://github.com/expo/expo/blob/sdk-58/packages/expo/bundledNativeModules.json), [Expo local modules](https://docs.expo.dev/modules/autolinking/), [internal distribution](https://docs.expo.dev/build/internal-distribution/).
