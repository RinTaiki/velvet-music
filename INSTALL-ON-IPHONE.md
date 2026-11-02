# Install Velvet from your Windows PC

Your public source repository is **https://github.com/RinTaiki/velvet-music**. The unsigned iPhone build workflow is already uploaded. Its successful output is published at **https://github.com/RinTaiki/velvet-music/releases**. The app must finish compiling before an IPA is available there.

This route uses a free Apple account and AltStore Classic. Do not enroll in the paid Apple Developer Program or buy an Expo subscription. No Apple password goes into GitHub or this chat.

## A. Set up your Windows PC once

1. Install **iTunes** and **iCloud** using the Apple downloads linked in the [official AltStore Windows guide](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows). Follow that guide's advice about the direct Apple versions versus Microsoft Store versions.
   - [Apple iTunes, Windows 64-bit](https://www.apple.com/itunes/download/win64)
   - [Apple iCloud installer linked by AltStore](https://updates.cdn-apple.com/2020/windows/001-39935-20200911-1A70AA56-F448-11EA-8CC0-99D41950005E/iCloudSetup.exe)
2. AltServer's official installer has already been downloaded and extracted on your PC. Open File Explorer and go to **`C:\MusicPlayer\.tools\AltServer\package`**, then double-click **`setup.exe`** and complete its installer. You can also get the [official AltServer ZIP](https://cdn.altstore.io/file/altstore/altinstaller.zip) yourself.
3. Launch **AltServer** from Start. Its menu lives in the Windows tray near the clock; check the hidden-icons arrow if necessary.

## B. Put AltStore Classic on the iPhone once

4. Plug the iPhone into the PC with a USB cable, unlock it, and accept **Trust This Computer** on the iPhone if asked.
5. Open iTunes. Select your iPhone, then under its Summary/Options enable **Sync with this iPhone over Wi-Fi** and apply the change, as shown in the official AltStore guide.
6. Click the AltServer tray icon → **Install AltStore → your iPhone**. Enter your free Apple account in the local AltServer prompt and complete any Apple verification requested there. This signs the app for personal use; it does not require purchasing developer membership.
7. On the iPhone, open **Settings → General → VPN & Device Management** (the label varies by iOS version), select the Developer App entry for your Apple account, and trust it.
8. If iOS asks for Developer Mode, use **Settings → Privacy & Security → Developer Mode**, enable it and complete the restart/confirmation. These phone steps require you to operate your own device.

## C. Install Velvet

9. On the **iPhone**, open Safari and visit **https://github.com/RinTaiki/velvet-music/releases**. Open the newest successful **Velvet unsigned iPhone build**, expand **Assets**, and download **`Velvet-unsigned.ipa`**. Save it to Files/Downloads. Do not select the source-code ZIP or the `.sha256` checksum file.
10. Keep AltServer running and the PC/iPhone connected by USB or on the same network. On the iPhone, open **AltStore Classic → My Apps → +**, then choose `Velvet-unsigned.ipa` from Files. Complete the free Apple-account login if AltStore requests it, and wait for installation.
11. Open **Velvet** from the iPhone Home Screen. Tap **+ → Import audio files** or **Scan a folder**, then select your music in Files. The standalone app has its own storage, so import your music once even if it was previously imported into Expo Go.

Velvet is a standalone app with its JavaScript bundle embedded; Metro and your computer are not needed for everyday playback after installation. Widgets are deliberately omitted. Start music, leave the app normally or lock the iPhone, and test background playback. Swiping Velvet away in the app switcher force-quits it and stops audio.

## D. Keep free signing valid

Free personal signing expires after **7 days**. Before expiry, leave AltServer available on the PC, connect the phone, then use **AltStore → My Apps → Refresh All**. Refreshing signing is different from deleting/reinstalling Velvet; retain your app and imported library. See [AltStore's refresh instructions and app limits](https://faq.altstore.io/altstore-classic/your-altstore).

If any step fails, send the exact displayed error and say which numbered step it occurred at. Do not send Apple passwords, verification codes, or recovery information.
