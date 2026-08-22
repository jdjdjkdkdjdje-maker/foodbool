#!/usr/bin/env bash
# ============================================================
# FUTBOL ARENA — APK qurish (GitHub Actions runner)
# Har qadam GitHub annotation chiqaradi (logisiz ham ko'rinadi)
# ============================================================
set -euo pipefail
export ANDROID_USER_HOME="$HOME/.android"

trap 'echo "::error title=Build xatosi::build-apk.sh $LINENO-satrida xato (kod $?)"' ERR
note(){ echo "::notice title=$1::$2"; }

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "▶ 1/6 Java"; java -version 2>&1 | head -1; note "1-Java" "Java tayyor"

echo "▶ 2/6 Android SDK litsenziyalari"
SDK="$HOME/android-sdk"
mkdir -p "$SDK/licenses"
printf '8933bad161af4178b1185d1a37fbf41ea5269c55\nd56f5187479451eabf01fb78af6dfcb131a6481e\n24333f8a63b6825ea9c5514f83c2829b004d1fee\n' > "$SDK/licenses/android-sdk-license"
printf '84831b9409646a918e30573bab4c9c91346d8abd\n' > "$SDK/licenses/android-sdk-preview-license"
printf 'd975f751698a77b662f1254ddbeed3901e976f5a\n' > "$SDK/licenses/intel-android-extra-license"
export ANDROID_HOME="$SDK"
note "2-SDK" "Litsenziyalar yozildi: $SDK"

echo "▶ 3/6 Gradle"
GRADLE_VER=8.7
GRADLE="$HOME/gradle-$GRADLE_VER/bin/gradle"
if [ ! -x "$GRADLE" ]; then
  curl -sfL "https://services.gradle.org/distributions/gradle-$GRADLE_VER-bin.zip" -o /tmp/g.zip
  unzip -q /tmp/g.zip -d "$HOME"
fi
"$GRADLE" --version | head -3
note "3-Gradle" "Gradle $GRADLE_VER tayyor"

echo "▶ 4/6 O'yin fayllari"
rm -rf android/app/src/main/assets/www
mkdir -p android/app/src/main/assets
cp -r game android/app/src/main/assets/www
echo "game fayllari: $(find android/app/src/main/assets/www -type f | wc -l) ta"
note "4-Oyin" "$(find android/app/src/main/assets/www -type f | wc -l) fayl APK ichiga joylandi"

echo "▶ 5/6 APK yig'ish"
cd android
export GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx3g"
"$GRADLE" assembleDebug --no-daemon --console=plain 2>&1 | tail -8
cd ..
test -f android/app/build/outputs/apk/debug/app-debug.apk
cp android/app/build/outputs/apk/debug/app-debug.apk FutbolArena.apk
ls -la FutbolArena.apk
note "5-APK" "FutbolArena.apk qurildi: $(du -h FutbolArena.apk | cut -f1)"

echo "▶ 6/6 Release"
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

**O'rnatish:** faylni oching → Sozlamalar → Xavfsizlik → Noma'lum manbalar → YOQIQ → O'rnatish ⚽" || echo "::warning title=Release::Release yaratilmadi, lekin APK qurildi!"
  echo "🔗 https://github.com/$GITHUB_REPOSITORY/releases/tag/apk-latest"
else
  echo "::warning title=Release::GH_TOKEN yo'q — release o'tkazib yuborildi"
fi
echo "✔ TAYYOR!"
