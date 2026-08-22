#!/usr/bin/env bash
# ============================================================
# FUTBOL ARENA — APK qurish skripti (GitHub Actions runner'da)
# Java + Android SDK + Gradle + Release — hammasi shu yerda
# ============================================================
set -euo pipefail
echo "▶ 1/6 — Java tekshiruvi"
java -version 2>&1 | head -1

SDK="${ANDROID_HOME:-$HOME/android-sdk}"
echo "▶ 2/6 — Android SDK ($SDK)"
if [ ! -d "$SDK/cmdline-tools/latest" ]; then
  mkdir -p "$SDK/cmdline-tools"
  curl -sfL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/ct.zip
  unzip -q /tmp/ct.zip -d "$SDK/cmdline-tools"
  mv "$SDK/cmdline-tools/cmdline-tools" "$SDK/cmdline-tools/latest"
fi
yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null 2>&1 || true
"$SDK/cmdline-tools/latest/bin/sdkmanager" "platforms;android-34" "build-tools;34.0.0" > /dev/null
export ANDROID_HOME="$SDK"

GRADLE_VER=8.7
echo "▶ 3/6 — Gradle $GRADLE_VER"
if [ ! -x "$HOME/gradle-$GRADLE_VER/bin/gradle" ]; then
  curl -sfL "https://services.gradle.org/distributions/gradle-$GRADLE_VER-bin.zip" -o /tmp/g.zip
  unzip -q /tmp/g.zip -d "$HOME"
fi
GRADLE="$HOME/gradle-$GRADLE_VER/bin/gradle"

echo "▶ 4/6 — O'yin fayllarini APK ichiga joylash"
cd "$(dirname "$0")/../.."
rm -rf android/app/src/main/assets/www
mkdir -p android/app/src/main/assets
cp -r game android/app/src/main/assets/www
ls android/app/src/main/assets/www | head -5

echo "▶ 5/6 — APK yig'ish"
cd android
"$GRADLE" assembleDebug --no-daemon --console=plain 2>&1 | tail -5
cd ..
cp android/app/build/outputs/apk/debug/app-debug.apk FutbolArena.apk
ls -la FutbolArena.apk

echo "▶ 6/6 — GitHub Release'ga yuklash"
export GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
if [ -n "$GH_TOKEN" ]; then
  TARGET_SHA="$(git rev-parse HEAD)"
  gh release delete apk-latest --yes --cleanup-tag 2>/dev/null || true
  git config user.name "github-actions[bot]" || true
  gh release create apk-latest FutbolArena.apk \
    --target "$TARGET_SHA" --prerelease \
    --title "📱 Futbol Arena — APK (eng yangi)" \
    --notes "To'g'ridan-to'g'ri o'rnatish uchun **FutbolArena.apk** (Android 7.0+).

- Commit: \`${GITHUB_SHA:0:7}\`
- Qurilgan: $(date -u '+%Y-%m-%d %H:%M UTC')
- O'rnatishdan oldin: Sozlamalar → Xavfsizlik → Noma'lum manbalar → YOQIQ" 2>&1 || echo "⚠ Release yaratilmadi (huquq yo'q) — lekin APK qurildi"
  echo "🔗 https://github.com/$GITHUB_REPOSITORY/releases/tag/apk-latest"
else
  echo "⚠ GH_TOKEN yo'q — release o'tkazib yuborildi"
fi
echo "✔ TAYYOR!"
