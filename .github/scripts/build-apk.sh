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

echo "▶ 6/6 Yetkazish (Release + branch'ga commit)"
export GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
echo "::notice title=Tokenlar::GITHUB_TOKEN=${GITHUB_TOKEN:+BOR} GH_TOKEN=${GH_TOKEN:+BOR} RUNTIME=${ACTIONS_RUNTIME_TOKEN:+BOR}"

# A) gh release (agar token mavjud bo'lsa)
if [ -n "$GH_TOKEN" ]; then
  TARGET_SHA="$(git rev-parse HEAD)"
  gh release delete apk-latest --yes --cleanup-tag 2>/dev/null || true
  git config user.name "github-actions[bot]" || true
  gh release create apk-latest FutbolArena.apk \
    --target "$TARGET_SHA" --prerelease \
    --title "📱 Futbol Arena — APK (eng yangi)" \
    --notes "To'g'ridan-to'g'ri o'rnatish uchun **FutbolArena.apk** (Android 7.0+).

- Commit: \`${GITHUB_SHA:0:7}\`
- Qurilgan: $(date -u '+%Y-%m-%d %H:%M UTC')" 2>&1 && echo "✔ Release yaratildi" || echo "::warning title=Release::gh release muvaffaqiyatsiz"
fi

# B) KAFOLATLANGAN: APK'ni branch'ga commit qilish (checkout tokeni bilan)
git config user.name "github-actions[bot]" 2>/dev/null || true
git config user.email "41898282+github-actions[bot]@users.noreply.github.com" 2>/dev/null || true
mkdir -p releases
cp FutbolArena.apk releases/FutbolArena.apk
git add -f releases/FutbolArena.apk 2>/dev/null || true
git commit -q -m "apk: avtomatik qurilgan build [skip ci]" 2>/dev/null || echo "::notice title=APK::o'zgarish yo'q (eski APK bilan bir xil)"
git pull --rebase -q origin arena/01a02b51-foodbool 2>/dev/null || true
if git push origin HEAD:refs/heads/arena/01a02b51-foodbool 2>/dev/null; then
  echo "✔ APK branch'ga yuklandi: releases/FutbolArena.apk"
  note "6-Yetkazish" "APK releases/ papkasiga saqlandi"
else
  echo "::warning title=Yetkazish::branch'ga push muvaffaqiyatsiz"
fi
echo "✔ TAYYOR!"
