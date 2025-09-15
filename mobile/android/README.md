# Android Wrapper (WebView)

This directory contains a minimal Android app that loads the built web app in a `WebView` from local assets.

Quick Start
- Build web: `make build`
- Sync assets: `make android-sync` (copies `dist/` to `app/src/main/assets/www`)
- Open `mobile/android` in Android Studio and run on a device/emulator.

Notes
- Package: `com.ino9oni.elfpix`
- Min SDK: 24, Target/Compile SDK: 34
- Entry: `MainActivity` loads `file:///android_asset/www/index.html`
- Audio: WebView requires a user gesture; the web app resumes audio on first tap/keypress.
- Large built assets are not committed; they are synced locally via the Makefile target.

