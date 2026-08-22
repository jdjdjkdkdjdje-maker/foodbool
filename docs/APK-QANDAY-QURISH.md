# 📱 APK faylini GitHub'da olish — 3 oddiy qadam

GitHub Actions o'yin avtomatik APK quradi. Buning uchun **bir marta** workflow faylini qo'shish kerak
(agent tokenida workflow yozish huquqi yo'q, shuning uchun bu 1 qadamni siz qilasiz — 1 daqiqa):

## 1-qadam: Workflow faylini yarating

1. Brauzerda oching: **https://github.com/jdjdjkdkdjdje-maker/foodbool**
2. Yuqorida yashil **`Add file`** → **`Create new file`** tugmasini bosing
3. Fayl nomi (to'liq, nuqtalarni ham yozing):
   ```
   .github/workflows/apk.yml
   ```
4. **`docs/apk-workflow.yml`** faylining to'liq matnini nusxalab, o'sha oynaga qo'ying
5. Pastda **`Commit changes`** bosing

## 2-qadam: Kutib turing (~3-5 daqiqa)

- Repo yuqorisidagi **`Actions`** yorlig'ini oching
- **"Android APK yig'ish"** ishga tushayotganini ko'rasiz
- Yashil ✔ belgisi chiqishini kuting

## 3-qadam: APK'ni yuklab oling

- O'sha ishga tushirishni (run) oching
- Pastda **Artifacts** → **`futbol-arena-apk`** → yuklab oling (`FutbolArena.apk`)
- Telefonda oching, "noma'lum manbalar" ruxsatini bering — va o'ynang! ⚽

> **main branch'ga qo'shsangiz**, APK avtomatik **Releases** sahifasiga ham chiqadi
> (har push'da yangi versiya). Boshqa branch'larda — Artifacts orqali.

---

## Muqobil: GitHub'ni qayta ulang

Agar Arena sozlamalarida GitHub'ni qayta ulasangiz (workflow huquqi bilan),
keyingi safar agent o'zi qo'shadi va sizga hech narsa qilish kerak bo'lmaydi.

## Qurilgan APK haqida

- `uz.arena.futbol` — Futbol Arena
- Android 7.0+ (API 24), landshaft, to'liq ekran
- Ichida o'yinning to'liq versiyasi (game/ papkasi avtomatik joylanadi)
- Debug imzo bilan — bevosita o'rnatiladi
