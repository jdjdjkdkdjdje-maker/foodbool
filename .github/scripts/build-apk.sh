#!/usr/bin/env bash
# ============================================================
# FUTBOL ARENA — APK qurish (GitHub Actions, o'zini tashxislovchi)
# ============================================================
set -euo pipefail
export ANDROID_USER_HOME="$HOME/.android"

diag(){ # gradle log oxirini annotation qilib yuboradi
  [ -f /tmp/gradle.log ] || return 0
  tail -30 /tmp/gradle.log | tr '\n' '%' | sed 's/%/%0A/g' | fold -s -w 700 | head -10 | while IFS= read -r chunk; do
    echo "::error title=Tashxis::${chunk}"
  done
  [ -f /tmp/sdk.log ] && tail -10 /tmp/sdk.log | tr '\n' '%' | sed 's/%/%0A/g' | fold -s -w 700 | head -3 | while IFS= read -r chunk; do
    echo "::error title=SDK log::${chunk}"
  done
  return 0
}
trap 'echo "::error title=Build xatosi::build-apk.sh $LINENO-satirda (kod $?)"; diag' ERR
note(){ echo "::notice title=$1::$2"; }

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

# Java 17 (agar mavjud bo'lsa — eng barqaror)
if [ -d "${JAVA_HOME_17_X64:-/nonexistent}" ]; then export JAVA_HOME="$JAVA_HOME_17_X64"; export PATH="$JAVA_HOME/bin:$PATH"; fi
echo "▶ 1/7 Java"; java -version 2>&1 | head -2; note "1-Java" "JAVA_HOME=${JAVA_HOME:-def}"

# Android SDK: runner'ning tayyor SDK'si yoki o'zimizniki
echo "▶ 2/7 Android SDK"
PRE="/usr/local/lib/android/sdk"
SDK="$PRE"
if [ ! -d "$PRE/platforms/android-34" ] || [ ! -d "$PRE/build-tools/34.0.0" ]; then
  SDK="$HOME/android-sdk"
  mkdir -p "$SDK/licenses"
  printf '8933bad161af4178b1185d1a37fbf41ea5269c55\nd56f5187479451eabf01fb78af6dfcb131a6481e\n24333f8a63b6825ea9c5514f83c2829b004d1fee\n' > "$SDK/licenses/android-sdk-license"
  printf '84831b9409646a918e30573bab4c9c91346d8abd\n' > "$SDK/licenses/android-sdk-preview-license"
  # tayyor cmdline-tools bilan platforma o'rnatish (eng yaxshi harakat)
  if [ -x "$PRE/cmdline-tools/latest/bin/sdkmanager" ]; then
    mkdir -p "$SDK/cmdline-tools"; ln -sf "$PRE/cmdline-tools/latest" "$SDK/cmdline-tools/latest" 2>/dev/null || true
    yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" "platforms;android-34" "build-tools;34.0.0" > /tmp/sdk.log 2>&1 || echo "::warning title=SDK::sdkmanager o'rnatmadi (litsenziya bilan davom)"
  fi
fi
export ANDROID_HOME="$SDK"
echo "SDK: $ANDROID_HOME (platform-34: $([ -d "$SDK/platforms/android-34" ] && echo BOR || echo YO'Q), bt34: $([ -d "$SDK/build-tools/34.0.0" ] && echo BOR || echo YO'Q))"
note "2-SDK" "$ANDROID_HOME"

echo "▶ 3/7 Gradle"
GRADLE_VER=8.7
GRADLE="$HOME/gradle-$GRADLE_VER/bin/gradle"
if [ ! -x "$GRADLE" ]; then
  curl -sfL "https://services.gradle.org/distributions/gradle-$GRADLE_VER-bin.zip" -o /tmp/g.zip
  unzip -q /tmp/g.zip -d "$HOME"
fi
note "3-Gradle" "tayyor"

echo "▶ 4/7 O'yin fayllari"
rm -rf android/app/src/main/assets/www
mkdir -p android/app/src/main/assets
cp -r game android/app/src/main/assets/www
note "4-Oyin" "$(find android/app/src/main/assets/www -type f | wc -l) fayl"

echo "▶ 5/7 APK yig'ish"
cd android
"$GRADLE" assembleDebug --no-daemon --console=plain > /tmp/gradle.log 2>&1 || { tail -40 /tmp/gradle.log; diag; exit 1; }
tail -6 /tmp/gradle.log
cd ..
test -f android/app/build/outputs/apk/debug/app-debug.apk
cp android/app/build/outputs/apk/debug/app-debug.apk FutbolArena.apk
note "5-APK" "qurildi: $(du -h FutbolArena.apk | cut -f1)"

echo "▶ 6/7 Yetkazish"
export GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
echo "::notice title=Tokenlar::GITHUB_TOKEN=${GITHUB_TOKEN:+BOR} RUNTIME=${ACTIONS_RUNTIME_TOKEN:+BOR}"
if [ -n "$GH_TOKEN" ]; then
  TARGET_SHA="$(git rev-parse HEAD)"
  gh release delete apk-latest --yes --cleanup-tag 2>/dev/null || true
  git config user.name "github-actions[bot]" || true
  gh release create apk-latest FutbolArena.apk --target "$TARGET_SHA" --prerelease \
    --title "📱 Futbol Arena — APK (eng yangi)" \
    --notes "FutbolArena.apk — Android 7.0+. Qurilgan: $(date -u '+%Y-%m-%d %H:%M UTC')" 2>&1 && echo "✔ Release" || echo "::warning title=Release::yaratilmadi"
fi

echo "▶ 7/7 Branch'ga commit (kafolat)"
git config user.name "github-actions[bot]" 2>/dev/null || true
git config user.email "41898282+github-actions[bot]@users.noreply.github.com" 2>/dev/null || true
mkdir -p releases
cp FutbolArena.apk releases/FutbolArena.apk
git add -f releases/FutbolArena.apk 2>/dev/null || true
git commit -q -m "apk: avtomatik build [skip ci]" 2>/dev/null || echo "::notice title=APK::o'zgarish yo'q"
git pull --rebase -q origin arena/01a02b51-foodbool 2>/dev/null || true
git push origin HEAD:refs/heads/arena/01a02b51-foodbool 2>/dev/null && note "7-Yetkazish" "APK releases/ ichida" || echo "::warning title=Push::branch'ga yuklanmadi"
echo "✔ TAYYOR!"
