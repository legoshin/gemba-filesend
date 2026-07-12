# Gemba Filesend — Android (Trusted Web Activity)

This directory holds the Bubblewrap configuration that wraps the live
web app at `https://gemba-filesend.vercel.app` into a Google-Play-ready
Android app via a [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity).

A TWA loads the real web app inside the user's installed Chrome runtime,
so functionality matches the web app exactly — the same encryption, the
same upload, the same downloads — with no duplicated code. App updates
ship the moment a new deploy hits the production URL.

## One-time setup

You need the Android command-line tools and Java to build. The fastest
way is via Bubblewrap, which installs the rest itself:

```bash
# Node 18+ (you already have this)
npm install -g @bubblewrap/cli

# First run: agree to the Android SDK licenses and let bubblewrap
# install JDK 17 + cmdline-tools into ~/.bubblewrap/
bubblewrap doctor
```

## Build the AAB (release artefact for Play)

From the repo root:

```bash
cd android

# 1. Initialise the Android project from the web manifest. The
#    twa-manifest.json in this folder is the source of truth — copy it
#    in if bubblewrap regenerates one with defaults.
bubblewrap init --manifest=https://gemba-filesend.vercel.app/manifest.webmanifest

# 2. Generate (or reuse) the upload signing key. Bubblewrap will prompt
#    you for an alias, key password, and store password — save them in
#    your password manager; you'll need them for every build.
bubblewrap build

#    The build writes:
#      app-release-bundle.aab   — upload this to Play Console
#      app-release-signed.apk   — for sideload testing on a device
```

The `signingKey.path` and `alias` are baked into `twa-manifest.json`. The
keystore file itself (`android.keystore`) is **gitignored** — never
commit it.

## Verify Digital Asset Links

The host (`gemba-filesend.vercel.app`) must serve a
`/.well-known/assetlinks.json` file that lists the **SHA-256 fingerprint
of the key Google Play actually uses to sign the user-facing APK**.

After `bubblewrap build`, print the upload key's fingerprint:

```bash
keytool -list -v -keystore android.keystore -alias android
# look for "SHA-256:" — copy the hex with colons
```

Edit `public/.well-known/assetlinks.json` in the repo, paste the
fingerprint into the `sha256_cert_fingerprints` array, and deploy.

**Important:** once the app is on Play Store, Play uses its own *app
signing key* (Play App Signing). Find its fingerprint in
**Play Console → Setup → App signing → App signing key certificate**
and **add it** to the assetlinks file (you can have multiple
fingerprints). Without this the TWA will fall back to an in-app
browser banner instead of running full-screen.

## Sideload to a real device for testing

```bash
adb install app-release-signed.apk
```

Open the app on the device. If you see a Chrome address bar at the top
of the screen, the asset links handshake failed — re-check the
fingerprint and the URL.

## Submit to Google Play

See `../ANDROID.md` at the repo root for the full Play Console
walk-through (listing copy, screenshots, privacy declarations, signing
key handover, internal/closed/open testing tracks, production rollout).
