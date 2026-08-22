/* ============================================================
   FUTBOL ARENA — main.js
   Ishga tushirish: yuklash, saqlashni ochish, audio ruxsati
   ============================================================ */
"use strict";
(function(){
  const $=id=>document.getElementById(id);

  /* Yuklanish animatsiyasi */
  const tips=["Stadion tayyorlanmoqda...","To‘p bosilmoqda...","Futbolchilar chiqmoqda...","Formalar dazmollanmoqda...","Tomoshabinlar joylashmoqda...","Hakam hushtagini tekshirmoqda...","G‘ozg‘in o‘yin kutilmoqda!"];
  let prog=0,tipI=0;
  const iv=setInterval(()=>{
    prog=Math.min(100,prog+8+Math.random()*14);
    $("load-fill").style.width=prog+"%";
    if(Math.random()<.5){$("load-tip").textContent=tips[++tipI%tips.length];}
    if(prog>=100){clearInterval(iv);boot();}
  },160);

  function boot(){
    /* Saqlashni yuklash */
    const s=FA.Meta.load();
    if(s&&s.settings){
      const st=s.settings;
      FA.Audio.setVol("sfx",st.sfx??.8);
      FA.Audio.setVol("crowd",st.crowd??.6);
      FA.Audio.setVol("comm",st.comm??.9);
    }
    FA.UI.init();
    setTimeout(()=>{
      $("load").classList.add("hidden");
      $("menu").classList.remove("hidden");
    },250);
  }

  /* Audio blokirovkasini olish — birinchi teginishda */
  const unlock=()=>{FA.Audio.ensure();FA.Audio.resume();};
  addEventListener("pointerdown",unlock,{once:true});
  addEventListener("keydown",unlock,{once:true});

  /* Android orqaga tugmasi */
  window.androidBack=function(){
    const m=$("match");
    if(!m.classList.contains("hidden")){
      const pv=$("pause-ov");
      if(pv.classList.contains("hidden")){document.getElementById("hud-pause").click();}
      return;
    }
    const openModal=document.querySelector(".modal-ov");
    if(openModal){openModal.remove();return;}
    FA.UI.nav("uy");
  };

  /* Oynaning yo‘qolishiga qarshi: sahifa ko‘rinmasa ovozni pasaytirish */
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden)FA.Audio.crowdSet(0.05);
  });

  /* Xatoliklarni ushlash — o‘yin qotib qolmasin */
  addEventListener("error",e=>{
    console.warn("Xatolik:",e.message);
  });
})();
