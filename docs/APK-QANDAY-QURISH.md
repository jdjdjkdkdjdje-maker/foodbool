# 📱 APK faylini GitHub'da olish — 2 qadam (1 daqiqa)

Agent tokeni `workflows` papkasiga yozish huquqisiz, shuning uchun quyidagi
kichik faylni **bir marta** qo'shishingiz kerak. Shundan keyin har push'da
APK **avtomatik** qurilib, Release'ga yuklanadi.

## 1-qadam: Bu havolani oching (fayl nomi avtomatik to'ldiriladi)

👉 **https://github.com/jdjdjkdkdjdje-maker/foodbool/new/arena/01a02b51-foodbool?filename=.github/workflows/apk.yml**

(yoki qo'lda: repo → `Add file` → `Create new file` → nomi: `.github/workflows/apk.yml`)

## 2-qadam: Quyidagi 8 qatorni nusxalab qo'ying va `Commit changes` bosing

```yaml
name: APK
on: [push, workflow_dispatch]
permissions:
  contents: write
jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bash .github/scripts/build-apk.sh
```

## Bo'ldi! 🎉

- **Actions** yorlig'ida qurilishni ko'rasiz (~3-5 daqiqa)
- APK shu manzilda paydo bo'ladi:
  **https://github.com/jdjdjkdkdjdje-maker/foodbool/releases/tag/apk-latest**
- `FutbolArena.apk` ni telefonda oching → o'rnatish → o'ynang ⚽

---

### Muqobil: Arena ilovasiga Workflows huquqi berish

`https://github.com/settings/installations` → Arena → **Repository permissions** →
**Workflows: Read and write** → Save. Keyin agent o'zi ham qo'ya oladi.

### APK tarkibi
- `uz.arena.futbol` — Futbol Arena, Android 7.0+ (API 24)
- `game/` papkasi avtomatik APK ichiga joylanadi (to'liq o'yin)
- Debug imzo — bevosita o'rnatiladi
