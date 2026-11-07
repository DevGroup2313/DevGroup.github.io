# Lakay for iPhone, iPad and the Fire tablet

**Build @@BUILD@@, @@DATE@@.** Lakay is the store's own app: inventory, the register and reports. It works with no connection, and it keeps the store's books sealed on each device.

## Download

| The ready-made app | For | |
| --- | --- | --- |
| [**Lakay-iPhone-iPad.ipa**](builds/Lakay-iPhone-iPad.ipa) | iPhone and iPad (one file for both), installed from a computer with Sideloadly | [Download now](https://github.com/DevGroup2313/Lakay-Apps/releases/latest/download/Lakay-iPhone-iPad.ipa) |
| [**Lakay-Android-Fire.apk**](builds/Lakay-Android-Fire.apk) | The Fire tablet and other Android tablets | [Download now](https://github.com/DevGroup2313/Lakay-Apps/releases/latest/download/Lakay-Android-Fire.apk) |

Then follow [READ ME FIRST - IPHONE AND IPAD.txt](READ%20ME%20FIRST%20-%20IPHONE%20AND%20IPAD.txt) or [READ ME FIRST - FIRE TABLET.txt](READ%20ME%20FIRST%20-%20FIRE%20TABLET.txt). The same files are on the Releases page, "Lakay for iPhone, iPad and Fire (latest build)".

## What is here

- `builds/`: the ready-made apps. Each new build replaces them.
- `READ ME FIRST - IPHONE AND IPAD.txt` and `READ ME FIRST - FIRE TABLET.txt`: installing, updating, and keeping the books safe.
- The build kit, the files GitHub builds from: `app/Lakay.html` (Lakay itself), `packages/ios/` and `packages/fire/` (the shells that hold it), `release/publish.py`, and `.github/workflows/`. A push builds both again and puts them here and on the Releases page.
- `LICENCE.txt`: all rights reserved; no licence is granted.

## The Fire tablet's signing key

Android installs a new Lakay over the old one only when both carry the same key. The key is kept as two secrets of this repository (Settings, Secrets and variables, Actions): `EMPORIUM_ANDROID_KEY` (the PKCS #12 key file, in base64) and `EMPORIUM_ANDROID_KEY_PASSWORD`. It never goes into the repository. Until both secrets exist, each APK is signed with a key made for that build alone, and the Releases page says so beside it: it installs on a tablet with no Lakay, but on a tablet that has one, the old Lakay must be removed first, which removes that tablet's books. Save a backup first (Settings, Save a backup now).

Lakay's source and its notes are in Lakay-Windows. Lakay for the Mac is in Lakay-Mac.

Copyright (c) 2026 Yannie D. Forest. All rights reserved.
