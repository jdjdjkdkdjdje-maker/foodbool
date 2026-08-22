# ⚽ FUTBOL ARENA — 3D Mobil Futbol Simulyatori

**Professional darajadagi mobil 3D futbol o'yini — interfeysi 100% O'ZBEK TILIDA.**

11 ga 11 format, real vaqtdagi 3D grafika (three.js/WebGL), 1v1 onlayn PvP, jamoa qurish, transfer bozori, turnirlar, liga, reyting tizimi, vazifalar va APK sifatida Android'ga o'rnatish imkoniyati.

> ⚖️ **Mualliflik huquqi:** O'yin barcha kodlari, klublari, futbolchilari va logotiplari original (xayoliy). Hech qanday litsenziyalangan kontent ishlatilmagan.

---

## 🎮 O'yin rejimlari

| Rejim | Tavsif |
|---|---|
| ⚡ Tezkor o'yin | Darhol AI jamoa bilan o'ynash |
| 🌐 Onlayn 1 ga 1 | Haqiqiy raqib bilan real vaqt PvP (matchmaking + ping) |
| 🏆 Reytingli o'yin | Reyting ochkolari uchun o'yin |
| 🏅 Turnir | 8 jamoa, nokaut tizimi |
| 📅 Liga | 10 turli mavsum, jadval |
| 🏆 Kubok | 16 jamoa, mag'lubiyat = chiqish |
| 👥 Do'st bilan | Bitta telefonda navbatma-navbat |
| 🤖 AI ga qarshi | 16 xil raqib, 4 qiyinlik darajasi |
| 🎯 Mashg'ulot | Erkin mashq rejimi |
| 🥅 Penaltilar seriyasi | 5 zarbadan aniqlik sinovi |

## 🕹 Boshqaruv (mobil)

**Chap tomonda** — virtual joystick (harakat).

**O'ng tomonda** — kontekstli tugmalar:
- **Hujumda:** PAS · ZARBA · UZUN PAS · UZATMA · TEZLIK
- **Himoyada:** TO'P OLISH · SIRPANISH · ALMASHTIRISH · PRESSING · TEZLIK

**Gesture boshqaruv:**
- Yuqoriga surish → kuchli zarba
- Pastga surish → past zarba
- Chap/o'ngga surish → fint (yon o'tish)
- Ikki marta bosish → sprint

**Klaviatura (test uchun):** WASD — harakat, J — pas, K — zarba, L — uzun pas, U — uzatma, Shift — sprint, Space — almashtirish.

## 📱 APK o'rnatish (Android)

> ⚠️ **Bir marta kerak:** agent tokeni `workflows` huquqisiz, shuning uchun CI faylini 1 daqiqada qo'shishingiz kerak —
> qadamlar: **`docs/APK-QANDAY-QURISH.md`** (3 qadam, o'zbek tilida).

1. GitHub **Actions** bo'limiga kiring → so'nggi **"Android APK yig'ish"** ishga tushirishini oching
2. Pastda **Artifacts** → `futbol-arena-apk` → `FutbolArena.apk` yuklab oling
   (yoki **Releases** sahifasidan — main branch'ga push qilinganda avtomatik chiqadi)
3. Telefonda faylni oching. "Noma'lum manbalar" ruxsatini bering va o'rnating

Talab: Android 7.0+ (API 24), WebGL 2.0 qo'llovchi WebView (barcha zamonaviy telefonlar).

## 💻 Brauzerda sinash

```bash
cd game
python3 -m http.server 8080
# http://localhost:8080 ni oching (landshaft rejimda)
```

## 🏗 Arxitektura

```
game/                  # HTML5 o'yin (three.js + vanilla JS)
├── index.html         # Ilova skeleti (yuklash, menyu, match ekrani)
├── css/style.css      # Barcha UI uslublari
├── js/
│   ├── vendor/        # three.js r147, mqtt.js (offline ishlaydi)
│   ├── data.js        # O'zbek matnlari, klublar, taktikalar, ismlar
│   ├── audio.js       # WebAudio sintezi + TTS kommentator
│   ├── engine.js      # 3D dvigatel: stadion, modellar, kamera, grafika darajalari
│   ├── match.js       # 11v11 simulyatsiya: qoidalar, AI, fizika, boshqaruv
│   ├── meta.js        # Profil, iqtisodiyot, bozor, missiyalar, turnirlar, saqlash
│   ├── net.js         # Onlayn PvP: matchmaking, sinxronizatsiya, ping
│   ├── ui.js          # Barcha menyular/ekranlar (100% o'zbek tilida)
│   └── main.js        # Ishga tushirish
android/               # Android WebView qobig'i (Gradle loyihasi)
.github/workflows/     # CI: APK avtomatik yig'iladi
server/                # Server-authoritative multiplayer serveri (Node.js, namuna)
```

### Texnik echimlar
- **Grafika:** 5 daraja (Past → Ultra) + avtomatik aniqlash; 30/60/90/120 FPS cheklovi; instanced tomoshabinlar; dinamik soyalar; LOD
- **Ob-havo:** quyoshli/tun o'yinlari, yomg'ir zarralari
- **Fizika:** to'p — gravitatsiya, Magnus effekti (aylanish), sirpanish ishqalanishi, sakrash; to'p oyoqqa "yopishib qolmaydi"
- **Qoidalar:** gol, aut, burchak, darvoza to'pi, erkin zarba, penalti, ofsayd, sariq/qizil karta, qo'shimcha vaqt, penaltilar seriyasi
- **Multiplayer:** mezbon-authoritative model; MQTT-over-WSS demo transport; server/ papkasida production server asosi
- **Saqlash:** localStorage (profildan barchasigacha)

### Grafik darajalari
| Daraja | Pixel ratio | Soya | Tomoshabinlar |
|---|---|---|---|
| Past | 0.6 | – | 28% |
| O'rta | 0.8 | – | 50% |
| Yuqori | 1.0 | 1024 | 75% |
| Juda yuqori | 1.35 | 1024 | 95% |
| Ultra | 2.0 | 2048 | 120% |

## 🔧 Serverli multiplayer (kelajak)

Hozirgi onlayn PvP demo transport (ommaviy MQTT broker) orqali ishlaydi. Ishlab chiqarish uchun:

```bash
cd server && npm install && node server.js
# net.js ichidagi BROKERS ni ws://your-server:8080 ga almashtiring
```

Server: matchmaking navbati (reyting bo'yicha), kirish sanitizatsiyasi (anti-cheat), ELO reyting, natijalarni taqqoslash.

## 🗺 Yolg'iz qolgan g'oyalar (roadmap)

- [ ] WebGL 2.0 + skeletli animatsiyalar (glTF)
- [ ] Jonli transferlar va kim oshdi savdosi
- [ ] Klublar o'rtasidagi mavsumiy turnirlar
- [ ] Server tomonida PostgreSQL + akkauntlar
- [ ] Replay tizimi va gol kliplari

---

**Til:** O'zbek (lotin) · **Dvigatel:** three.js · **Platforma:** Android APK / brauzer
