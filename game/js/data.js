/* ============================================================
   FUTBOL ARENA — data.js
   O‘zbek tilidagi barcha matnlar, klublar, taktikalar, ismlar
   ============================================================ */
"use strict";
window.FA = window.FA || {};

/* ---------- RNG (deterministik) ---------- */
FA.rng = function(seed){
  let s = (seed>>>0)||123456789;
  return function(){
    s ^= s<<13; s>>>=0; s ^= s>>17; s ^= s<<5; s>>>=0;
    return s/4294967296;
  };
};
FA.ri = (r,a,b)=>a+Math.floor(r()*(b-a+1));
FA.pick = (r,arr)=>arr[Math.floor(r()*arr.length)];

/* ---------- Matnlar (100% o‘zbek) ---------- */
FA.UZ = {
  appName:"FUTBOL ARENA", appSub:"Professional 3D mobil futbol simulyatori",
  // Navigatsiya
  navUy:"UY", navOyna:"O‘YNA", navJamoa:"JAMOA", navBozor:"BOZOR", navYana:"YANA",
  // Uy
  welcome:"Xush kelibsiz", quickMatch:"Tezkor o‘yin", quickMatchSub:"Darhol o‘ynash — AI jamoa bilan",
  onlinePvp:"Onlayn 1 ga 1", onlinePvpSub:"Haqiqiy raqib bilan real vaqt PvP",
  ranked:"Reytingli o‘yin", rankedSub:"Reyting uchun halol jang",
  tournament:"Turnir", tournamentSub:"8 jamoa, nokaut tizimi",
  league:"Liga", leagueSub:"10 turli mavsum jadvali",
  cup:"Kubok", cupSub:"16 jamoa, mag‘lub bo‘lsang — chiqib ketasang",
  friend:"Do‘st bilan o‘ynash", friendSub:"Bitta telefonda navbatma-navbat",
  vsAi:"AI ga qarshi o‘yin", vsAiSub:"Qiyinlik darajasini o‘zingiz tanlang",
  training:"Mashg‘ulot", trainingSub:"Erkin mashq: paslar, zarbalar, gollar",
  penalties:"Penaltilar seriyasi", penaltiesSub:"5 zarbadan aniqlik sinovi",
  dailyMissions:"Kunlik vazifalar", weeklyMissions:"Haftalik vazifalar", all:"Barchasi",
  claim:"OLISH", claimed:"OLINDI", reward:"Mukofot",
  // O‘yin sozlamalari (match setup)
  matchSetup:"O‘YIN SOZLAMALARI", difficulty:"Qiyinlik", duration:"Davomiylik",
  weather:"Ob-havo", dayTime:"Kun vaqti", stadium:"Stadion", camera:"Kamera",
  startMatch:"O‘YINNI BOSHLASH", cancel:"BEKOR QILISH",
  diffEasy:"Oson", diffNormal:"O‘rta", diffHard:"Qiyin", diffExpert:"Juda qiyin",
  wClear:"Quyoshli", wRain:"Yomg‘ir", wNight:"Tun", wDay:"Kunduz",
  camBroadcast:"Translyatsiya", camDynamic:"Dinamik",
  min:"daqiqa",
  // Jamoa
  teamTabSquad:"Tarkib", teamTabTactics:"Taktika", teamTabClub:"Klub",
  formation:"Taktik sxema", mentality:"Kayfiyat", mentDef:"Himoyaviy", mentBal:"Muvozanatlangan", mentAtk:"Hujumkor",
  pressing:"Pressing", pressLow:"Past", pressMid:"O‘rta", pressHigh:"Yuqori",
  coach:"Murabbiy", lineup:"Asosiy tarkib (11)", bench:"Zaxira", swapPlayer:"Almashtirish",
  clubName:"Klub nomi", homeKit:"Uy formasi", awayKit:"Safar formasi", thirdKit:"Uchinchi forma",
  colors:"Ranglar", saveClub:"SAQLASH",
  // Pozitsiyalar
  posGK:"DRZ", posCB:"MQH", posLB:"CHQ", posRB:"OQH", posCDM:"CHP", posCM:"MP",
  posCAM:"HP", posLM:"CHV", posRM:"OV", posLW:"CHW", posRW:"OW", posST:"HQ", 
  posGKFull:"Darvozabon", posDFFull:"Himoyachi", posMFFull:"Yarim himoyachi", posFWFull:"Hujumchi",
  // Atributlar
  attrPAC:"Tezlik", attrACC:"Tezlanish", attrSHO:"Zarba", attrPAS:"Pas", attrDRI:"Dribling",
  attrDEF:"Himoya", attrPHY:"Jismoniy kuch", attrSTA:"Chidamlilik", attrHEA:"Bosh bilan",
  attrLSP:"Uzoqdan zarba", attrFRK:"Jarima zarbasi", attrPEN:"Penalti", attrWF:"Kuchsiz oyoq",
  overall:"Umumiy reyting", strongFoot:"Kuchli oyoq", leftFoot:"Chap", rightFoot:"O‘ng",
  // Kartalar
  tierOddiy:"ODDIY", tierNoyob:"NOYOB", tierElita:"ELITA", tierAfsonaviy:"AFSONAVIY", tierMaxsus:"MAXSUS",
  // Bozor
  transferMarket:"Transfer bozori", buy:"SOTIB OLISH", sell:"SOTISH", sold:"Sotildi", bought:"Sotib olindi",
  price:"Narx", yourSquad:"Sizning tarkib", marketRefresh:"Bozorni yangilash", searchPos:"Pozitsiya",
  filterAll:"Barchasi", notEnough:"Tangalar yetarli emas!", squadFull:"Tarkib to‘lgan! Avval futbolchi soting.",
  playerSold:"Futbolchi sotildi", playerBought:"Futbolchi jamoaga qo‘shildi",
  // Do‘kon
  store:"Do‘kon", packs:"Paketlar", packOpen:"OCHISH", packBronze:"Oddiy paket", packSilver:"Noyob paket",
  packGold:"Elita paketi", packLegend:"Afsonaviy paket", items:"Buyumlar", unlockStadium:"stadion ochish",
  nameChange:"Ism o‘zgartirish", purchased:"Sotib olindi!",
  // Futbolchilar
  playersTitle:"FUTBOLCHILAR", train:"RIVOJLANTIRISH", trainCost:"Narxi:", maxLevel:"Chegara",
  developed:"Futbolchi rivojlandi!", age:"Yosh", nation:"Mamlakat", club:"Klub",
  // Reyting
  leaderboard:"Reyting jadvali", division:"Divizioni", points:"ochko", yourRank:"Sizning o‘rningiz",
  // Missiya matnlari
  msWin:"{n} ta o‘yin yutib oling", msGoal:"{n} ta gol ur", msAssist:"{n} ta assist qil", msPass:"{n} ta aniq pas ber",
  msPenalty:"{n} ta penalti ur", msTackle:"{n} marta to‘p oling", msMatch:"{n} ta o‘yin o‘tkaz",
  msCleanSheet:"{n} o‘yinda darvoza daxlsiz qoldir", msShot:"{n} marta zarba yo‘llang", msCorners:"{n} ta burchak to‘pi o‘ynang",
  // Natija
  victory:"G‘ALABA", defeat:"MAG‘LUBIYAT", draw:"DURRANG", fullTime:"O‘YIN TUGADI",
  goals:"Gollar", assists:"Assistlar", shots:"Zarbalar", onTarget:"Aniq zarbalar", possession:"To‘p nazorati",
  passes:"Paslar", accuratePasses:"Aniq paslar", fouls:"Qoida buzilishlari", yellows:"Sariq kartalar",
  reds:"Qizil kartalar", offsides:"Ofsaydlar", corners:"Burchak to‘plari", saves:"Qaytarilgan to‘plar",
  rewards:"Mukofotlar", continue:"DAVOM ETISH", rematch:"QAYTA O‘YNASH",
  // O‘yin ichi
  goal:"GOL!", goalConceded:"Gol berildi...", halfTime:"TANAFFUS", firstHalf:"1-T", secondHalf:"2-T",
  addedTime:"+{n} daqiqa", kickoff:"Boshlang‘ich zarba", throwIn:"Aut", cornerKick:"Burchak to‘pi",
  goalKick:"Darvoza to‘pi", freeKick:"Erkin zarba", penaltyKick:"PENALTI!", offside:"OFSAYD",
  foul:"Qoida buzildi", yellowCard:"Sariq karta", redCard:"Qizil karta!", injury:"Futbolchi jarohatlandi",
  pause:"PAUZA", resume:"DAVOM ETIRISH", quit:"O‘YINDAN CHIQISH", restart:"QAYTADAN BOSHLASH",
  sound:"Ovoz", controlsBtn:"Boshqaruv", connectionLost:"Ulanish uzildi! Qayta ulanish...",
  opponentFound:"Raqib topildi!", searching:"RAQIB QIDIRILMOQDA...", searchCancel:"Qidiruvni bekor qilish",
  aiReplacement:"Raqib topilmadi — AI bilan davom etamiz",
  // Tugmalar (hujum)
  btnPass:"PAS", btnShoot:"ZARBA", btnLong:"UZUN PAS", btnSprint:"TEZLIK", btnThrough:"UZATMA",
  // Tugmalar (himoya)
  btnPress:"PRESSING", btnTackle:"TO‘P OLISH", btnSlide:"SIRPANISH", btnSwitch:"ALMASHTIRISH",
  // Sozlamalar
  settings:"SOZLAMALAR", graphics:"Grafika sifati", auto:"Avtomatik", gLow:"Past", gMed:"O‘rta", gHigh:"Yuqori",
  gUltra:"Juda yuqori", gMax:"Ultra", fpsLimit:"FPS cheklovi", soundVol:"Ovozlar", crowdVol:"Tomoshabinlar",
  commVol:"Kommentator", vibration:"Tebranish", controlSize:"Boshqaruv o‘lchami", resetData:"Ma’lumotlarni tozalash",
  resetConfirm:"Barcha ma’lumotlar o‘chiriladi. Ishonchingiz komilmi?", yes:"HA", no:"YO‘Q",
  language:"Til", langUz:"O‘zbek (lotin)",
  // Profil
  profile:"PROFIL", level:"daraja", wins:"G‘alabalar", losses:"Mag‘lubiyatlar", draws:"Durranlar",
  matchesPlayed:"O‘yinlar", totalGoals:"Gollar", totalAssists:"Assistlar", editName:"Ismni tahrirlash",
  chooseAvatar:"Avatar tanlang", stats:"Statistika",
  //_toast
  saved:"Saqlandi", coinsAdded:"+{n} tanga", xpAdded:"+{n} XP",
  // Matchmaking/others
  opponent:"Raqib", you:"Siz", vs:"-GA QARSHI-", connectServer:"Serverga ulanmoqda...",
  ping:"Ping", ms:"ms", ratingChange:"Reyting {n}",
  chooseOpponent:"Raqib jamoani tanlang", yourTeam:"Sizning jamoangiz",
  penaltiesHow:"Yo‘nalishni tanlab, kuchni to‘xtating. Darvozada — to‘g‘ri tomonga sho‘ng‘ing!",
  // Kommentator iboralari
  commGoal:["GOOOL! Nafaqat zarba — bu asar!","Gol! Stadion oyoqqa turdi!","To‘p darvozada! Ajoyib zarba!","GOOOL! Murabbiy xursand!"],
  commNear:["Yaqin! Bir sm qoldi!","Zarba biroz chetga o‘tdi!","Vay! Darvoza qo‘rqib ketdi!"],
  commSave:["Darvozaban qahramonlik qildi!","Ajoyib qaytarish!","Darvozaban to‘pni ushlab oldi!"],
  commFoul:["Qoida buzildi — hakam o‘yinni to‘xtatdi.","O‘tkir kurash, erkin zarba."],
  commCardSariq:["Hakam sariq kartani ko‘rsatdi!","Sariq karta — ehtiyot bo‘l!"],
  commCardQizil:["QIZIL KARTA! Jamoa 10 kishida qoldi!","Hakam qat’iy qaror qildi — qizil karta!"],
  commPenalty:["PENALTI! Stadion javobsiz emas!","Hakam nuqtani ko‘rsatdi — penalti!"],
  commOffside:["Ofsayd! Hujum to‘xtatildi.","Bayroq ko‘tarildi — ofsayd."],
  commCorner:["Burchak to‘pi — xavfli moment!","Burchak! Bosh bilan zarba keldi!"],
  commKickoff:["To‘p markazda — o‘yin boshlandi!","O‘yinni boshlaymiz! Omad!"],
  commHalf:["Tanaffus. Jamolarga dam kerak.","Birinchi bo‘lim tugadi."],
  commEnd:["O‘yin tugadi! Hakam hushtagini chaldi!","Yakuniy hushtak! O‘yin nihoyasiga yetdi."],
  commWin:["G‘alaba! Tomoshabinlar xursand!","Ajoyib o‘yin — g‘alaba bizniki!"],
  commLose:["Mag‘lubiyat... Keyingi o‘yinda qaytamiz!","Bu safar raqib kuchli chiqdi."],
  commPost:["Ustun! To‘p ustunga tegdi!","Oh! Ustun qutqardi!"]
};

/* ---------- Klublar (xayoliy — litsenziyasiz) ---------- */
FA.CLUBS = [
  {name:"Toshkent Arslonlari", short:"TAS", c1:0xffd700, c2:0x002244, stad:"Registon Arenasi"},
  {name:"Samarqand G‘oliblari", short:"SAM", c1:0x1c6bba, c2:0xffffff, stad:"Go‘riy Amirim"},
  {name:"Buxoro Yulduzlari", short:"BUX", c1:0x0a7d3c, c2:0xffdf00, stad:"Siyovush"},
  {name:"Farg‘ona Vulqonlari", short:"FAR", c1:0xd32f2f, c2:0x212121, stad:"Vodiy"},
  {name:"Andijon Bo‘rilari", short:"AND", c1:0x2e7d32, c2:0xffffff, stad:"Bobur"},
  {name:"Xorazm O‘qlari", short:"XOR", c1:0x00838f, c2:0xffeb3b, stad:"Xiva"},
  {name:"Navoiy Konchilari", short:"NAV", c1:0xf57f17, c2:0x263238, stad:"Zarafshon"},
  {name:"Qarshi Nasafchilari", short:"QAR", c1:0x7b1fa2, c2:0xffd54f, stad:"Shahrisabz"},
  {name:"Nurata Chiqandlari", short:"NUR", c1:0x4527a0, c2:0x69f0ae, stad:"Nur"},
  {name:"Termiz Isitmalari", short:"TER", c1:0xbf360c, c2:0xffcc80, stad:"Oxus"},
  {name:"Jizzax Burchaklari", short:"JIZ", c1:0x1565c0, c2:0xe3f2fd, stad:"Zomin"},
  {name:"Namangan G‘ozlari", short:"NAM", c1:0x00695c, c2:0xa5d6a7, stad:"Chorsu"},
  {name:"Sirdaryo To‘lqinlari", short:"SIR", c1:0x0277bd, c2:0xb3e5fc, stad:"Sirdaryo"},
  {name:"Guliston Bog‘lari", short:"GUL", c1:0x558b2f, c2:0xf0f4c3, stad:"Gulzor"},
  {name:"Chirchiq Chemchilari", short:"CHI", c1:0x37474f, c2:0xff7043, stad:"Chem"},
  {name:"Orol Dengizlari", short:"ORO", c1:0x01579b, c2:0x80deea, stad:"Orol"}
];

FA.STADIUMS = [
  {name:"Registon Arenasi", cap:"65 000", price:0},
  {name:"Zomin Stadioni", cap:"42 000", price:3000},
  {name:"Go‘riy Amirim", cap:"55 000", price:8000},
  {name:"Vodiy Klub Arenasi", cap:"75 000", price:20000},
  {name:"Oltin Kubok Arenasi", cap:"92 000", price:60000}
];

/* ---------- Taktik sxemalar ---------- */
FA.FORMATIONS = {
  "4-3-3":[["GK",.04,0],["CB",.2,-.28],["CB",.2,-.1],["CB",.2,.1],["CB",.2,.28],["CM",.42,-.22],["CDM",.36,0],["CM",.42,.22],["RW",.68,.34],["ST",.74,0],["LW",.68,-.34]],
  "4-4-2":[["GK",.04,0],["CB",.2,-.28],["CB",.2,-.1],["CB",.2,.1],["CB",.2,.28],["RM",.46,.34],["CM",.4,-.12],["CM",.4,.12],["LM",.46,-.34],["ST",.68,-.12],["ST",.68,.12]],
  "4-2-3-1":[["GK",.04,0],["CB",.2,-.28],["CB",.2,-.1],["CB",.2,.1],["CB",.2,.28],["CDM",.34,-.12],["CDM",.34,.12],["RW",.58,.34],["CAM",.56,0],["LW",.58,-.34],["ST",.74,0]],
  "3-5-2":[["GK",.04,0],["CB",.2,-.2],["CB",.18,0],["CB",.2,.2],["RM",.5,.4],["CM",.42,-.15],["CDM",.34,0],["CM",.42,.15],["LM",.5,-.4],["ST",.7,-.12],["ST",.7,.12]],
  "4-1-2-1-2":[["GK",.04,0],["CB",.2,-.28],["CB",.2,-.1],["CB",.2,.1],["CB",.2,.28],["CDM",.3,0],["CM",.44,-.18],["CM",.44,.18],["CAM",.58,0],["ST",.74,-.12],["ST",.74,.12]],
  "5-3-2":[["GK",.04,0],["RB",.24,.38],["CB",.18,-.2],["CB",.16,0],["CB",.18,.2],["LB",.24,-.38],["CM",.44,-.2],["CDM",.38,0],["CM",.44,.2],["ST",.7,-.12],["ST",.7,.12]],
  "4-3-2-1":[["GK",.04,0],["CB",.2,-.28],["CB",.2,-.1],["CB",.2,.1],["CB",.2,.28],["CM",.4,-.2],["CDM",.34,0],["CM",.4,.2],["CAM",.6,-.16],["CAM",.6,.16],["ST",.76,0]]
};
FA.FORMATION_NAMES = Object.keys(FA.FORMATIONS);

/* Slotning keng pozitsiyasi */
FA.roleOf = pos => pos==="GK" ? "GK" : (["CB","LB","RB"].includes(pos)?"DF":(["CDM","CM","CAM","LM","RM"].includes(pos)?"MF":"FW"));
FA.POS_LIST = ["GK","CB","LB","RB","CDM","CM","CAM","LM","RM","LW","RW","ST"];
FA.BENCH_POS = ["GK","CB","LB","CDM","CM","CAM","RW","ST","ST","CM","LB","CB","RW","ST","GK","CM","CAM","LB"];

/* ---------- Ismlar (o‘zbekcha) ---------- */
FA.FIRST = ["Otabek","Sardor","Jasur","Abbosbek","Muhammadali","Ilhom","Odil","Ruslan","Xo‘jiakbar","Eldor","Ulug‘bek","Bekzod","Doston","Aziz","Timur","Sanjar","Kamron","Farux","Nodir","Shahzod","Anvar","Javohir","Muslim","Ibrohim","Dilshod","Oybek","Suhrob","Bahodir","Zafar","Rustam"];
FA.LAST = ["Yusupov","Karimov","Rasulov","Ergashev","Alijonov","Tursunov","Nazarov","Shakirov","Islomov","Umarov","Xolmatov","Qodirov","Sattorov","Jo‘rayev","Mirzayev","Abdullayev","Rahmonov","Toshmatov","Eshmurodov","Qosimov","Yodgorov","Sultonov","Kenjayev","Halimov","Nurmatov","Afandiyev"];
FA.COACH_FIRST = ["Viktor","Alijon","Bahtiyor","Serhiy","Mirsaid","Qudrat","René","Anvar"];
FA.COACH_LAST = ["Melis","Hasanov","Yo‘ldoshev","Kovalenko","Tu-rayev","Normatov","Gomes","Ostonaqulov"];

/* ---------- Kartalar darajasi ---------- */
FA.TIERS = [
  {id:"oddiy",     name:"ODDIY",     cls:"",           min:55,max:68,price:[300,900], color:"#9e9e9e"},
  {id:"noyob",     name:"NOYOB",     cls:"t-noyob",    min:68,max:78,price:[1200,3500], color:"#42a5f5"},
  {id:"elita",     name:"ELITA",     cls:"t-elita",    min:78,max:85,price:[5000,14000], color:"#ba68c8"},
  {id:"afsonaviy", name:"AFSONAVIY", cls:"t-afsonaviy",min:85,max:92,price:[20000,60000], color:"#ffd54f"},
  {id:"maxsus",    name:"MAXSUS",    cls:"t-maxsus",   min:92,max:99,price:[80000,200000], color:"#00e5c0"}
];
FA.tierByOvr = ovr => {
  if(ovr>=92) return FA.TIERS[4];
  if(ovr>=85) return FA.TIERS[3];
  if(ovr>=78) return FA.TIERS[2];
  if(ovr>=68) return FA.TIERS[1];
  return FA.TIERS[0];
};

/* ---------- Reyting darajalari ---------- */
FA.RANKS = [
  {name:"Boshlang‘ich", min:0,    ic:"🌱"},
  {name:"Bronza",        min:400,  ic:"🥉"},
  {name:"Kumush",        min:800,  ic:"🥈"},
  {name:"Oltin",         min:1200, ic:"🥇"},
  {name:"Platina",       min:1700, ic:"💎"},
  {name:"Olmos",         min:2200, ic:"🔷"},
  {name:"Elita",         min:2800, ic:"👑"},
  {name:"Afsonaviy",     min:3500, ic:"🌟"}
];
FA.rankOf = pts => { let r=FA.RANKS[0]; for(const x of FA.RANKS) if(pts>=x.min) r=x; return r; };
FA.nextRank = pts => FA.RANKS.find(x=>x.min>pts) || null;

/* ---------- Missiya andozalari ---------- */
FA.MISSIONS_DAILY = [
  {id:"d_win1", type:"win", n:1, ic:"🏆", coins:300},
  {id:"d_goal3", type:"goal", n:3, ic:"⚽", coins:250},
  {id:"d_pass20",type:"pass_ok", n:20, ic:"🎯", coins:150},
  {id:"d_match2",type:"match", n:2, ic:"📱", coins:200},
  {id:"d_shot5", type:"shot", n:5, ic:"💥", coins:150}
];
FA.MISSIONS_WEEKLY = [
  {id:"w_win5",  type:"win", n:5, ic:"🏆", coins:1500, xp:200},
  {id:"w_goal10",type:"goal", n:10, ic:"⚽", coins:1200, xp:150},
  {id:"w_ass5",  type:"assist", n:5, ic:"🅰️", coins:800, xp:100},
  {id:"w_pen1",  type:"penalty_goal", n:1, ic:"🥅", coins:600, xp:80},
  {id:"w_tackle10",type:"tackle", n:10, ic:"🛡️", coins:900, xp:120}
];
FA.missionText = t => FA.UZ[({
  win:"msWin", goal:"msGoal", assist:"msAssist", pass_ok:"msPass", penalty_goal:"msPenalty",
  tackle:"msTackle", match:"msMatch", clean_sheet:"msCleanSheet", shot:"msShot", corner:"msCorners"
})[t.type]||"msMatch"].replace("{n}", t.n);

/* ---------- Fitness (formalar) andozalari ---------- */
FA.AVATARS = ["⚽","🦁","🐺","🦅","🐉","🐯","🚀","👑","🎯","🔥","⚡","⭐"];

/* ---------- Pack imkoniyatlari ---------- */
FA.PACKS = [
  {id:"bronze", name:"Oddiy paket", cls:"b1", ic:"📦", price:500, odds:[[.62,0],[.30,1],[.07,2],[.01,3]], n:2, uz:"62% oddiy · 30% noyob · 7% elita · 1% afsonaviy"},
  {id:"silver", name:"Noyob paket", cls:"b2", ic:"🎁", price:2000, odds:[[.30,0],[.45,1],[.20,2],[.05,3]], n:3, uz:"30% oddiy · 45% noyob · 20% elita · 5% afsonaviy"},
  {id:"gold",   name:"Elita paketi", cls:"b3", ic:"💎", price:7000, odds:[[.05,0],[.35,1],[.45,2],[.15,3]], n:3, uz:"5% oddiy · 35% noyob · 45% elita · 15% afsonaviy"},
  {id:"legend", name:"Afsonaviy paket", cls:"b4", ic:"🏆", price:22000, odds:[[.10,1],[.40,2],[.40,3],[.10,4]], n:3, uz:"10% noyob · 40% elita · 40% afsonaviy · 10% MAXSUS"}
];
FA.KIT_COLORS = [0xd32f2f,0x1c6bba,0x0a7d3c,0xffd700,0x212121,0xffffff,0x7b1fa2,0xf57f17,0x00838f,0x4527a0,0xff6d00,0x00e676];

/* ---------- Fikstiv raqib reytingi uchun ism generatori ---------- */
FA.randLeaderName = r => FA.pick(r,["Shohruh","Bekzod","Anvar","Laziz","Doniyor","Sarvar","Umid","Jahongir","Asadbek","Murod","Nurillo","Ilyos"]) + " " + FA.pick(r,FA.LAST);
