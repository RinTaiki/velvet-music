# Install Velvet on your iPhone for free from Windows

There is no installable IPA from the interrupted EAS build. This project now includes a widget-free **unsigned iPhone build** route; the build still needs to run on a Mac runner, and you then sign/install its IPA locally with your free Apple account.

No paid Apple Developer membership, EAS build plan, TestFlight, or App Store submission is used. Apps signed with a free Apple account need refreshing every **7 days**. This is Apple's personal-signing restriction, not a subscription.

## 1. Create a public GitHub repository

The user has approved publishing this app's source. Create a **public** repository, for example `velvet-music`, under your own GitHub account. Do not add a README/license/gitignore when creating it, since this folder already contains project files and Git history.

In PowerShell, from `C:\MusicPlayer`:

```powershell
git add .
git commit -m "Prepare free iPhone sideload build without widgets"
git branch -M main
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/velvet-music.git
git push -u origin main
```

Replace `YOUR-GITHUB-USERNAME` with your actual **GitHub** username; it need not match your Expo username. If an `origin` remote already exists, inspect it with `git remote -v` rather than adding another. Complete GitHub's login prompt on your computer. Your Apple account/password must **not** be put in GitHub secrets, code, or this chat. The workflow needs only GitHub's automatically provided repository token.

The workflow deliberately refuses to run for private repositories. Standard GitHub-hosted runners in public repositories are free; larger runners and private-repository usage have different billing rules. It uses the standard `xcode-27` runner and no Actions artifact/cache storage. Keep paid Actions spending disabled in your GitHub billing settings if you have a payment method attached. Nothing here enrolls you in an Apple or Expo paid plan.

Your private imported songs and library live on your iPhone, not in this project, and are not part of this upload. `.env`, signing keys, generated builds and `node_modules` are excluded by `.gitignore`.

## 2. Run the unsigned build

On the GitHub repository page:

1. Open **Actions → Build iPhone app for free sideloading**.
2. Click **Run workflow**, select `main`, and tick **Build and publish an unsigned IPA as a public GitHub prerelease**.
3. Start the workflow. This explicitly publishes the finished **unsigned app binary** as a prerelease in this public repository.
4. Wait for all steps to finish successfully.
5. Open **Releases**, then download `Velvet-unsigned.ipa` from the new **Velvet unsigned iPhone build** prerelease. The adjacent SHA-256 file lets you verify the download.

The workflow runs `npm ci`, Expo prebuild, CocoaPods, and an unsigned **Release/device archive**. It embeds the JavaScript bundle, so the finished app needs no Metro server or running computer for music playback. It omits widgets and their App Group entitlement. It does not upload your Apple credentials, request paid signing, or publish to the App Store.

The macOS/Xcode compilation has **not yet been run from this workspace**. If it fails, open the failed step and share its actual error output; no IPA exists until the archive and packaging steps succeed. `scripts/build-unsigned-ios.sh` is also runnable on a Mac with Xcode and CocoaPods.

## 3. Install using AltStore Classic / AltServer

Follow the official [AltStore Classic Windows installation guide](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows). It covers the required Apple iTunes/iCloud components, USB pairing, trusting the PC, and installing AltStore onto your iPhone using AltServer. Use **AltStore Classic**, not AltStore PAL (PAL is not an arbitrary IPA sideload installer).

Then:

1. Keep AltServer running on your Windows PC and connect/pair your iPhone as described by that guide.
2. Put `Velvet-unsigned.ipa` in Files on your iPhone (for example, through iCloud Drive).
3. Open **AltStore Classic → My Apps → +**, then select the IPA.
4. Sign in with your free Apple account in the official AltStore/AltServer flow. The local tool signs the app for your device; you do not need an Apple Developer subscription.
5. Follow iOS's developer-trust/Developer Mode prompts if required, then open **Velvet**.
6. Import your music into Velvet. Its storage is separate from Expo Go, so previously imported Expo Go music must be imported into this standalone app once.

In AltStore Classic, use **Refresh All** before the 7-day signing period expires, with AltServer available on your PC. Apple also limits how many personal apps/App IDs you can use. See [AltStore's current limits and refresh instructions](https://faq.altstore.io/altstore-classic/your-altstore).

The standalone app is configured for local playback and background audio. Widgets are intentionally absent. Playback after locking the screen, audio interruptions, and your particular iOS/AltStore combination still need verification on the phone. Force-quitting the app stops playback.

## Configuration

`app.config.js` disables the widget plugin and removes its extension/App Group configuration by default while preserving background audio, Files import and the existing EAS project ID. Nothing changes your Expo account or deletes the existing cloud project. Set `VELVET_WIDGETS=1` only if you later deliberately choose a signing route that supports the widget extension.

Official references: [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [GitHub release assets](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases), [Xcode runner](https://github.blog/changelog/2026-09-10-xcode-27-runner-image-now-runs-on-macos-27/), [Apple personal-team limits](https://developer.apple.com/help/account/basics/about-your-developer-account/).
