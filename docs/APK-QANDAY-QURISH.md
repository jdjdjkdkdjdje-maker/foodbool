# 📱 APK faylini olish — 1 daqiqa (bitta qadam!)

Sizda `.github/workflows/main.yml` fayli allaqachon bor (bo'sh). Faqat unga mazmun qo'yish kifoya:

## Qadam: Quyidagi havolani oching

👉 **https://github.com/jdjdjkdkdjdje-maker/foodbool/edit/main/.github/workflows/main.yml**

Ochilgan oynadagi katta maydonga quyidagi **9 qatorni** nusxalab qo'ying (hammasini!):

```yaml
on: [push, workflow_dispatch]
permissions:
  contents: write
jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: arena/01a02b51-foodbool
      - run: bash .github/scripts/build-apk.sh
```

Pastda yashil **`Commit changes`** tugmasini bosing. Bu darhol APK qurishni boshlaydi! 🚀

## Natija (~3-5 daqiqadan keyin)

- **Actions** yorlig'ida qurilish jarayonini kuzatishingiz mumkin
- Tayyor APK shu manzilda: 
  **https://github.com/jdjdjkdkdjdje-maker/foodbool/releases/tag/apk-latest**
- `FutbolArena.apk` faylini telefonda oching → o'rnatish → o'ynang ⚽

### APK tarkibi
- `uz.arena.futbol` — Futbol Arena, Android 7.0+ (API 24), landshaft, to'liq ekran
- Workflow `arena/01a02b51-foodbool` branch'ini tekshiradi (o'yin kodi shu yerda)
- `game/` papkasi avtomatik APK ichiga joylanadi
- Debug imzo — bevosita o'rnatiladi
