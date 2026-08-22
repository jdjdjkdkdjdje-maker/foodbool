/* ============================================================
   FUTBOL ARENA — ui.js
   Barcha menyular, ekranlar, modallar — 100% o‘zbek tilida
   ============================================================ */
"use strict";
window.FA = window.FA || {};

FA.UI=(function(){
  const $=id=>document.getElementById(id);
  const UZ=FA.UZ, M=FA.Meta;
  let cur="uy", curTeamTab="squad";
  let matchCtl=null, matchCtx=null;

  /* ---------- Kichik yordamchilar ---------- */
  function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
  function toast(msg,cls){
    const t=document.createElement("div");
    t.className="toast "+(cls||"");
    t.textContent=msg;
    $("toasts").appendChild(t);
    setTimeout(()=>{t.style.opacity="0";t.style.transition="opacity .4s";setTimeout(()=>t.remove(),400);},2400);
  }
  function modal(html,center){
    const ov=document.createElement("div");
    ov.className="modal-ov"+(center?" modal-center":"");
    ov.innerHTML=`<div class="modal-box">${html}</div>`;
    $("modal-root").appendChild(ov);
    ov.addEventListener("pointerdown",e=>{if(e.target===ov)ov.remove();});
    return ov;
  }
  function confirmDlg(text,onYes){
    const ov=modal(`<div class="m-head"><h3>${esc(text)}</h3></div>
      <div class="row"><button class="btn red wide" id="cd-y">${UZ.yes}</button>
      <button class="btn sec wide" id="cd-n">${UZ.no}</button></div>`,true);
    ov.querySelector("#cd-y").onclick=()=>{ov.remove();onYes();};
    ov.querySelector("#cd-n").onclick=()=>ov.remove();
  }
  function fmt(n){return n.toLocaleString("ru-RU");}

  /* ---------- Futbolchi kartasi / qatori ---------- */
  function attrBadge(v){return `<i style="width:${v}%;background:${v>=85?"linear-gradient(90deg,#ffd54f,#ffab00)":v>=70?"linear-gradient(90deg,#00e676,#00b25d)":"linear-gradient(90deg,#9fb2d4,#64b5f6)"}"></i>`;}
  function playerCard(p,onclick,selected){
    const t=p.tier||FA.tierByOvr(p.ovr);
    return `<div class="pcard ${t.cls} ${selected?"selected":""}" data-pid="${p.id}">
      <div class="pc-top"><div class="pc-ovr">${p.ovr}<small>${t.name}</small></div><div class="pc-pos">${UZ["pos"+p.pos]||p.pos}</div></div>
      <div class="pc-flags">🇺🇿</div>
      <div class="pc-face">🏃</div>
      <div class="pc-tier">${t.name}</div>
      <div class="pc-name">${esc(p.name)}</div>
      <div class="pc-club">${esc(p.club||"")}</div>
      <div class="pc-attrs">
        <div>${p.attrs.pac}<br>${UZ.attrPAC}</div><div>${p.attrs.sho}<br>${UZ.attrSHO}</div><div>${p.attrs.pas}<br>${UZ.attrPAS}</div>
        <div>${p.attrs.dri}<br>${UZ.attrDRI}</div><div>${p.attrs.def}<br>${UZ.attrDEF}</div><div>${p.attrs.phy}<br>${UZ.attrPHY}</div>
      </div></div>`;
  }
  function playerRow(p,right){
    const t=p.tier||FA.tierByOvr(p.ovr);
    return `<div class="prow ${t.cls}" data-pid="${p.id}">
      <div class="pr-ovr"><b>${p.ovr}</b><span>${t.name.slice(0,4)}</span></div>
      <div class="pr-body"><div class="pr-name">${esc(p.name)}</div>
      <div class="pr-sub">${UZ["pos"+p.pos]||p.pos} · ${p.age} ${UZ.age} · 🇺🇿</div></div>
      <div class="pr-right">${right||`<div class="pr-pos">${UZ["pos"+p.pos]||p.pos}</div>`}</div></div>`;
  }

  /* ---------- Topbar ---------- */
  function refreshTop(){
    const pr=M.profile;
    $("tb-name").textContent=pr.name;
    $("tb-avatar").textContent=FA.AVATARS[pr.avatar]||"⚽";
    const lvl=M.levelOf(pr.xp);
    $("tb-level").textContent=lvl+"-daraja";
    const a=M.xpFor(lvl),b=M.xpFor(lvl+1);
    $("tb-xp-fill").parentElement.style.setProperty("--xp",Math.round((pr.xp-a)/(b-a)*100)+"%");
    $("tb-coins").textContent="🪙 "+fmt(pr.coins);
    const r=FA.rankOf(pr.rating);
    $("tb-rank").textContent=r.ic+" "+r.name;
  }

  /* ---------- Navigatsiya ---------- */
  const NAV={uy:renderHome,oyna:renderPlay,jamoa:renderTeam,bozor:renderMarket,yana:renderMore};
  function nav(to){
    cur=to;
    document.querySelectorAll(".bn-item").forEach(b=>b.classList.toggle("active",b.dataset.nav===to));
    NAV[to]();
    $("menu-content").scrollTop=0;
    refreshTop();
  }
  function sub(render){ $("menu-content").innerHTML=""; render(); $("menu-content").scrollTop=0; refreshTop(); }

  /* ================= UY ================= */
  function renderHome(){
    const pr=M.profile;
    const html=`
    <div class="hero">
      <h3>${UZ.welcome}, ${esc(pr.name)}! 👋</h3>
      <p>Klubingiz: <b>${esc(M.club.name)}</b> · ${FA.rankOf(pr.rating).ic} ${FA.rankOf(pr.rating).name} · ${pr.rating} ${UZ.points}</p>
      <div class="hero-btns">
        <button class="btn" id="h-quick">⚡ ${UZ.quickMatch}</button>
        <button class="btn gold" id="h-online">🌐 ${UZ.onlinePvp}</button>
      </div>
    </div>
    <div class="h-title"><h2>📋 ${UZ.dailyMissions}</h2><button class="btn sm sec" id="h-ms-all">${UZ.all}</button></div>
    <div id="h-ms"></div>
    <div class="h-title mt"><h2>🎮 ${UZ.navOyna}</h2></div>
    ${modeGrid()}
    <div class="card mt">
      <div class="h-title" style="margin:0 0 8px"><h2>📊 ${UZ.stats}</h2></div>
      <div class="stat-grid">
        <div class="stat-box"><b>${pr.wins}</b><span>${UZ.wins}</span></div>
        <div class="stat-box"><b>${pr.draws}</b><span>${UZ.draws}</span></div>
        <div class="stat-box"><b>${pr.losses}</b><span>${UZ.losses}</span></div>
        <div class="stat-box"><b>${pr.goals}</b><span>${UZ.totalGoals}</span></div>
        <div class="stat-box"><b>${pr.assists}</b><span>${UZ.totalAssists}</span></div>
        <div class="stat-box"><b>${pr.matches}</b><span>${UZ.matchesPlayed}</span></div>
      </div>
    </div>`;
    $("menu-content").innerHTML=html;
    $("h-quick").onclick=()=>startQuick();
    $("h-online").onclick=()=>startOnline();
    $("h-ms-all").onclick=()=>{cur="yana";renderMissions();};
    renderMissionsList($("h-ms"),true);
    bindModeGrid();
  }
  function modeGrid(){
    const modes=[
      ["quick","⚡",UZ.quickMatch,UZ.quickMatchSub,true],
      ["online","🌐",UZ.onlinePvp,UZ.onlinePvpSub,true,"hot"],
      ["ranked","🏆",UZ.ranked,UZ.rankedSub,true],
      ["tournament","🏅",UZ.tournament,UZ.tournamentSub,!M.state.tournament||!M.state.tournament.out],
      ["league","📅",UZ.league,UZ.leagueSub,true],
      ["cup","🏆",UZ.cup,UZ.cupSub,!M.state.cup||!M.state.cup.out],
      ["friend","👥",UZ.friend,UZ.friendSub,true],
      ["ai","🤖",UZ.vsAi,UZ.vsAiSub,true],
      ["training","🎯",UZ.training,UZ.trainingTraining||UZ.trainingSub,true],
      ["penalties","🥅",UZ.penalties,UZ.penaltiesSub,true]
    ];
    return `<div class="mode-grid">${modes.map(m=>
      `<button class="mode-card ${m[5]||""}" data-mode="${m[0]}"><span class="mi">${m[1]}</span>
       <div class="mt1">${m[2]}</div><div class="mt2">${m[3]}</div></button>`).join("")}</div>`;
  }
  function bindModeGrid(){
    document.querySelectorAll(".mode-card").forEach(b=>b.onclick=()=>{FA.Audio.ui();modeClick(b.dataset.mode);});
  }
  function modeClick(mode){
    switch(mode){
      case "quick":startQuick();break;
      case "online":startOnline();break;
      case "ranked":matchSetup({mode:"ranked",needWinner:false});break;
      case "tournament":renderTournament("tournament");break;
      case "league":renderLeague();break;
      case "cup":renderTournament("cup");break;
      case "friend":matchSetup({mode:"friend"});break;
      case "ai":renderAiOpponents();break;
      case "training":matchSetup({mode:"training"});break;
      case "penalties":matchSetup({mode:"penalties",needWinner:true});break;
    }
  }

  /* ================= Missiyalar ================= */
  function renderMissionsList(el,dailyOnly){
    M.refreshMissions();
    const all=[...FA.MISSIONS_DAILY,...FA.MISSIONS_WEEKLY];
    const items=[...M.missions.daily,...(dailyOnly?[]:M.missions.weekly)];
    el.innerHTML=items.map(m=>{
      const t=all.find(x=>x.id===m.id); if(!t)return "";
      const done=m.prog>=t.n;
      return `<div class="mission ${done&&!m.claimed?"done":""} ${m.claimed?"claimed":""}">
        <div class="mi-ic">${t.ic}</div>
        <div class="mi-body"><div class="mi-t">${FA.missionText(t)}</div>
        <div class="mi-p"><i style="width:${Math.min(100,m.prog/t.n*100)}%"></i></div></div>
        ${m.claimed?`<span class="mi-r">✅</span>`:done?`<button class="btn sm gold" data-claim="${t.id}" data-list="${dailyOnly||FA.MISSIONS_DAILY.some(x=>x.id===t.id)?"d":"w"}">${UZ.claim}</button>`
        :`<div class="mi-r">${m.prog}/${t.n}<br>🪙${t.coins}</div>`}
      </div>`;
    }).join("");
    el.querySelectorAll("[data-claim]").forEach(b=>b.onclick=()=>{
      const list=b.dataset.list==="d"?M.missions.daily:M.missions.weekly;
      const r=M.claimMission(list,b.dataset.claim);
      if(r){toast(UZ.coinsAdded.replace("{n}",fmt(r.coins)),"gold");FA.Audio.ui();refreshTop();renderMissionsList(el,dailyOnly);}
    });
  }
  function renderMissions(){
    sub(()=>{
      $("menu-content").innerHTML=`<div class="h-title"><h2>📋 ${UZ.dailyMissions}</h2></div><div id="ms-d"></div>
      <div class="h-title mt"><h2>🗓 ${UZ.weeklyMissions}</h2></div><div id="ms-w"></div>`;
      renderMissionsList($("ms-d"),true);
      const w=document.createElement("div");
      renderMissionsList(w,false);
      /* faqat haftalik qismini ajratish */
      const weekly=M.missions.weekly.map(m=>m);
      const all=[...FA.MISSIONS_DAILY,...FA.MISSIONS_WEEKLY];
      $("ms-w").innerHTML="";
      renderListInto($("ms-w"),weekly,all);
    });
  }
  function renderListInto(el,items,all){
    el.innerHTML=items.map(m=>{
      const t=all.find(x=>x.id===m.id);if(!t)return"";
      const done=m.prog>=t.n;
      return `<div class="mission ${done&&!m.claimed?"done":""} ${m.claimed?"claimed":""}">
        <div class="mi-ic">${t.ic}</div>
        <div class="mi-body"><div class="mi-t">${FA.missionText(t)}</div>
        <div class="mi-p"><i style="width:${Math.min(100,m.prog/t.n*100)}%"></i></div></div>
        ${m.claimed?`<span class="mi-r">✅</span>`:done?`<button class="btn sm gold" data-claim="${t.id}">${UZ.claim}</button>`
        :`<div class="mi-r">${m.prog}/${t.n}<br>🪙${t.coins}</div>`}</div>`;
    }).join("");
    el.querySelectorAll("[data-claim]").forEach(b=>b.onclick=()=>{
      const r=M.claimMission(M.missions.weekly,b.dataset.claim)||M.claimMission(M.missions.daily,b.dataset.claim);
      if(r){toast(UZ.coinsAdded.replace("{n}",fmt(r.coins)),"gold");renderMissions();}
    });
  }

  /* ================= O‘YNA ================= */
  function renderPlay(){
    $("menu-content").innerHTML=`<div class="h-title"><h2>🎮 ${UZ.navOyna}</h2></div>${modeGrid()}`;
    bindModeGrid();
  }
  function renderAiOpponents(){
    sub(()=>{
      const list=M.marketOpponents();
      $("menu-content").innerHTML=`<div class="h-title"><h2>🤖 ${UZ.chooseOpponent}</h2></div>
      <div class="grid2">${list.map((c,i)=>`
        <button class="mode-card" data-ai="${i}">
          <div class="mi" style="color:#${c.def.c1.toString(16).padStart(6,"0")}">🛡</div>
          <div class="mt1">${c.def.name}</div>
          <div class="mt2">${UZ.overall}: ${c.ovr} · ${c.def.stad}</div>
        </button>`).join("")}</div>`;
      document.querySelectorAll("[data-ai]").forEach(b=>b.onclick=()=>{
        const c=list[+b.dataset.ai];
        matchSetup({mode:"ai",oppDef:c.def,oppOvr:c.ovr});
      });
    });
  }

  /* ---------- O‘yin sozlamalari oynasi ---------- */
  function matchSetup(cfg){
    const st=M.settings;
    const ov=cfg.oppOvr||M.teamOvr();
    const ovD=document.createElement("div");
    const html=`<div class="m-head"><h3>⚙️ ${UZ.matchSetup}</h3><button class="m-x" id="ms-x">✕</button></div>
      <div class="card">
        <div class="muted small">${UZ.yourTeam}</div>
        <div class="row mt-s"><b style="color:var(--grn)">${esc(M.club.name)}</b><span class="muted">(${M.teamOvr()})</span><div class="spacer"></div>
        <span class="muted small">${UZ.vs}</span></div>
        <div class="row"><b>${cfg.oppDef?esc(cfg.oppDef.name):(cfg.mode==="ranked"||cfg.mode==="online"?"?":UZ.vsAi)}</b><span class="muted">(${ov})</span></div>
      </div>
      <div class="mt">
        <div class="muted small mb">${UZ.difficulty}</div>
        <div class="seg-btns" id="ms-diff">${[UZ.diffEasy,UZ.diffNormal,UZ.diffHard,UZ.diffExpert].map((d,i)=>`<button data-v="${i}" class="${st.difficulty===i?"active":""}">${d}</button>`).join("")}</div>
        <div class="muted small mb mt">${UZ.duration}</div>
        <div class="seg-btns" id="ms-dur">${[2,3,4,6].map(d=>`<button data-v="${d}" class="${st.duration===d?"active":""}">${d} ${UZ.min}</button>`).join("")}</div>
        <div class="muted small mb mt">${UZ.weather}</div>
        <div class="seg-btns" id="ms-w"><button data-v="clear" class="active">${UZ.wClear}</button><button data-v="rain">🌧 ${UZ.wRain}</button></div>
        <div class="muted small mb mt">${UZ.dayTime}</div>
        <div class="seg-btns" id="ms-t"><button data-v="day" class="active">☀️ ${UZ.wDay}</button><button data-v="night">🌙 ${UZ.wNight}</button></div>
        <div class="muted small mb mt">${UZ.camera}</div>
        <div class="seg-btns" id="ms-c"><button data-v="broadcast" class="${st.camera==="broadcast"?"active":""}">📺 ${UZ.camBroadcast}</button><button data-v="dynamic" class="${st.camera==="dynamic"?"active":""}">🎥 ${UZ.camDynamic}</button></div>
      </div>
      <button class="btn wide mt" id="ms-go">▶️ ${UZ.startMatch}</button>`;
    const ovModal=modal(html);
    let sel={difficulty:st.difficulty,duration:st.duration,weather:"clear",time:"day",camera:st.camera};
    const segBind=(id,key)=>{
      ovModal.querySelector("#"+id).querySelectorAll("button").forEach(b=>b.onclick=()=>{
        ovModal.querySelector("#"+id).querySelectorAll("button").forEach(x=>x.classList.remove("active"));
        b.classList.add("active");
        sel[key]=id==="ms-diff"||id==="ms-dur"?+b.dataset.v:b.dataset.v;
        FA.Audio.ui();
      });
    };
    ["ms-diff","ms-dur","ms-w","ms-t","ms-c"].forEach((id,i)=>segBind(id,["difficulty","duration","weather","time","camera"][i]));
    ovModal.querySelector("#ms-x").onclick=()=>ovModal.remove();
    ovModal.querySelector("#ms-go").onclick=()=>{
      ovModal.remove();
      Object.assign(st,{difficulty:sel.difficulty,duration:sel.duration,camera:sel.camera});
      M.save();
      cfg.settings=sel;
      launchMatch(cfg);
    };
  }

  /* ---------- Match ishga tushirish ---------- */
  function teamFromDef(def,ovr){
    return M.genClubTeam(def,ovr||def.ovr||68);
  }
  function launchMatch(cfg){
    const st=cfg.settings||M.settings;
    const homeT=M.clubTeamFromSave();
    let awayT;
    if(cfg.oppDef)awayT=teamFromDef(cfg.oppDef,cfg.oppOvr);
    else awayT=M.randomOpponent(cfg.mode==="ranked"?M.teamOvr()+4:M.teamOvr());
    if(cfg.mode==="training"){awayT=M.randomOpponent(45);st.difficulty=0;}
    if(cfg.mode==="ranked")st.difficulty=Math.max(2,st.difficulty);
    if(cfg.mode==="penalties"){st.duration=cfg.duration||4;}
    lastAwayName=awayT.name;
    const quality=st.quality||(M.settings.quality!=="avto"?M.settings.quality:FA.Engine.detectQuality());
    $("menu").classList.add("hidden");
    $("match").classList.remove("hidden");
    FA.Audio.ensure();
    /* Yangi WebGL konteksti uchun canvasni yangilash */
    const old=$("game");
    const fresh=old.cloneNode(true);
    old.parentNode.replaceChild(fresh,old);
    matchCtx=cfg;
    matchCtl=FA.Match({
      mode:cfg.mode, home:homeT, away:awayT, userSide:"home",
      duration:st.duration,difficulty:st.difficulty,
      night:st.time==="night",rain:st.weather==="rain",
      quality,fps:M.settings.fps,camera:st.camera,
      needWinner:!!cfg.needWinner,
      onEnd:res=>onMatchEnd(res)
    });
    bindMatchControls();
    matchCtl.start();
  }

  /* ---------- Match boshqaruvi (teginish) ---------- */
  function bindMatchControls(){
    const zone=$("joy-zone"),base=$("joy-base"),stick=$("joy-stick");
    let joyId=null,jx=0,jy=0,baseX=0,baseY=0;
    const R=46;
    zone.onpointerdown=e=>{
      joyId=e.pointerId;
      baseX=e.clientX;baseY=e.clientY;
      base.style.left=(e.clientX-60)+"px";base.style.top=(e.clientY-60)+"px";base.style.bottom="auto";
      base.classList.add("on");
      zone.setPointerCapture(e.pointerId);
    };
    zone.onpointermove=e=>{
      if(e.pointerId!==joyId)return;
      let dx=e.clientX-baseX,dy=e.clientY-baseY;
      const d=Math.hypot(dx,dy);
      if(d>R){dx=dx/d*R;dy=dy/d*R;}
      stick.style.left=(34+dx)+"px";stick.style.top=(34+dy)+"px";
      jx=dx/R;jy=dy/R;
      matchCtl&&matchCtl.setMove(jx,jy);
    };
    const joyEnd=e=>{
      if(e.pointerId!==joyId)return;
      joyId=null;jx=0;jy=0;
      stick.style.left="34px";stick.style.top="34px";
      base.classList.remove("on");
      matchCtl&&matchCtl.setMove(0,0);
    };
    zone.onpointerup=joyEnd;zone.onpointercancel=joyEnd;

    /* Gesture zonasi — o‘ng yuqori hudud (tugmalardan tashqari) */
    const gz=$("match");
    let gId=null,gx=0,gy=0,gt=0,lastTap=0;
    gz.addEventListener("pointerdown",e=>{
      if(e.target.closest("#btns")||e.target.closest("#joy-zone")||e.target.closest("#hud-pause"))return;
      if(e.clientX<innerWidth*0.45)return;
      gId=e.pointerId;gx=e.clientX;gy=e.clientY;gt=Date.now();
    });
    gz.addEventListener("pointerup",e=>{
      if(e.pointerId!==gId)return;
      const dx=e.clientX-gx,dy=e.clientY-gy,dt=Date.now()-gt;
      gId=null;
      if(dt<400){
        if(dy<-55&&Math.abs(dy)>Math.abs(dx))matchCtl&&matchCtl.onGesture("up");
        else if(dy>55&&Math.abs(dy)>Math.abs(dx))matchCtl&&matchCtl.onGesture("down");
        else if(Math.abs(dx)>55)matchCtl&&matchCtl.onGesture(dx>0?"right":"left");
        else{
          /* ikki marta bosish — sprint */
          const now=Date.now();
          if(now-lastTap<300)matchCtl&&matchCtl.onButton("sprint");
          lastTap=now;
        }
      }
    });
    $("hud-pause").onclick=showPause;
  }

  /* ---------- Pauza ---------- */
  function showPause(){
    if(!matchCtl)return;
    matchCtl.pause();
    const ov=$("pause-ov");
    ov.classList.remove("hidden");
    ov.innerHTML=`<div class="ov-inner">
      <div class="ov-title">${UZ.pause}</div>
      <button class="btn wide mt" id="pv-res">▶️ ${UZ.resume}</button>
      <button class="btn sec wide mt-s" id="pv-snd">🔊 ${UZ.sound}: YOQIQ</button>
      <button class="btn sec wide mt-s" id="pv-restart">🔄 ${UZ.restart}</button>
      <button class="btn red wide mt-s" id="pv-quit">🚪 ${UZ.quit}</button>
    </div>`;
    $("pv-res").onclick=()=>{ov.classList.add("hidden");matchCtl.resume();};
    $("pv-restart").onclick=()=>{ov.classList.add("hidden");matchCtl.dispose();matchCtl=null;launchMatch(matchCtx);};
    $("pv-quit").onclick=()=>{ov.classList.add("hidden");endToMenu(true);};
    $("pv-snd").onclick=e=>{FA.Audio.setVol("sfx",0.8-FA.Audio&&0);e.target.textContent="🔊 Tajribaviy";};
  }

  /* ---------- O‘yin tugadi ---------- */
  function onMatchEnd(res){
    const cfg=matchCtx;
    const my=res.my,opp=res.opp;
    const win= my>opp || (res.shootout&&res.shootout.winner===0);
    const draw=my===opp&&!res.shootout;
    /* Statistikani meta’ga yozish */
    const rw=M.matchResult({mode:cfg.mode,my,opp,
      stats:{goals:my,assists:0,shots:res.stats.shots[0],passOk:res.stats.passOk[0],
        penGoals:0,tackles:0,corners:res.stats.corners[0],cleanSheet:opp===0}});
    /* Rejimga qarab davom ettirish */
    let extra="";
    if(cfg.mode==="league"&&M.state.league&&!M.state.league.done){
      M.leaguePlayResult(my,opp);
    }
    if((cfg.mode==="tournament"||cfg.mode==="cup")&&(cfg.bracket)){
      const br=M.bracketMyResult(my,opp,cfg.mode);
      if(br&&br.win&&br.champion)extra=`<div class="toast gold" style="position:static;margin:8px auto">🏆 TURNOIR G‘OLIBI! +${cfg.mode==="cup"?15000:10000} 🪙</div>`;
    }
    if(rw.rating)toast(UZ.ratingChange.replace("{n}",(rw.rating>0?"+":"")+rw.rating),"gold");
    if(rw.lvlUp)toast("🎉 Yangi daraja: "+M.levelOf(M.profile.xp),"gold");
    M.save();
    const s=res.stats;
    const row=(h,a,b)=>`<div class="stat-line"><b>${a}</b><span class="sl-h">${h}</span><b>${b}</b></div>`;
    const ov=$("end-ov");
    ov.classList.remove("hidden");
    ov.innerHTML=`<div class="ov-inner">
      <div class="ov-title ${win?"win":draw?"draw":"lose"}">${win?UZ.victory:draw?UZ.draw:UZ.defeat}</div>
      <div class="muted center small">${UZ.fullTime}${res.shootout?` · ${UZ.penalties}: ${res.shootout.my}-${res.shootout.opp}`:""}</div>
      <div class="bigscore">
        <div class="bs-t">${esc(M.club.name)}</div>
        <div class="bs-s">${res.score[0]} : ${res.score[1]}</div>
        <div class="bs-t">${esc(cfg.oppName||matchAwayName())}</div>
      </div>
      ${row(UZ.possession,s.possession[0]+"%",s.possession[1]+"%")}
      ${row(UZ.shots,s.shots[0],s.shots[1])}
      ${row(UZ.onTarget,s.onTarget[0],s.onTarget[1])}
      ${row(UZ.passes,s.passes[0],s.passes[1])}
      ${row(UZ.accuratePasses,s.passOk[0],s.passOk[1])}
      ${row(UZ.corners,s.corners[0],s.corners[1])}
      ${row(UZ.fouls,s.fouls[0],s.fouls[1])}
      ${row(UZ.yellows,s.ys[0],s.ys[1])}
      ${row(UZ.reds,s.rs[0],s.rs[1])}
      ${row(UZ.offsides,s.off[0],s.off[1])}
      ${row(UZ.saves,s.saves[0],s.saves[1])}
      ${extra}
      <div class="card mt"><b>🎁 ${UZ.rewards}</b>
        <div class="mt-s">🪙 +${fmt(rw.coins)} · ⭐ +${60+(win?60:20)} XP ${rw.rating?` · 🏆 ${rw.rating>0?"+":""}${rw.rating} ${UZ.points}`:""}</div>
      </div>
      <button class="btn wide mt" id="ev-cont">${UZ.continue}</button>
      <button class="btn sec wide mt-s" id="ev-again">${UZ.rematch}</button>
    </div>`;
    $("ev-cont").onclick=()=>{ov.classList.add("hidden");endToMenu(false);};
    $("ev-again").onclick=()=>{ov.classList.add("hidden");matchCtl.dispose();matchCtl=null;launchMatch(matchCtx);};
  }
  let lastAwayName="";
  function matchAwayName(){return lastAwayName;}
  function endToMenu(quit){
    clearInterval(window._pingIv);
    $("hud-ping").classList.add("hidden");
    if(matchCtl){matchCtl.dispose();matchCtl=null;}
    $("match").classList.add("hidden");
    $("menu").classList.remove("hidden");
    $("end-ov").classList.add("hidden");
    $("pause-ov").classList.add("hidden");
    FA.Audio.crowdSet(0.15);
    nav(cur==="yana"?"uy":cur);
  }

  /* ================= Onlayn PvP ================= */
  function startQuick(){
    matchSetup({mode:"quick"});
  }
  function startOnline(){
    const st=M.settings;
    const html=`<div class="m-head"><h3>🌐 ${UZ.onlinePvp}</h3><button class="m-x" id="on-x">✕</button></div>
      <div class="card center" id="on-box">
        <div style="font-size:40px" id="on-ic">📡</div>
        <div class="mt-s" id="on-msg">${UZ.connectServer}</div>
        <div class="load-bar mt"><i id="on-fill" style="width:20%"></i></div>
      </div>
      <button class="btn sec wide mt" id="on-cancel">${UZ.searchCancel}</button>`;
    const ov=modal(html);
    let cancelled=false;
    ov.querySelector("#on-x").onclick=()=>{cancelled=true;FA.Net.cancelMatch();ov.remove();};
    ov.querySelector("#on-cancel").onclick=()=>{cancelled=true;FA.Net.cancelMatch();ov.remove();};
    const msg=t=>{const el=ov.querySelector("#on-msg");if(el)el.textContent=t;};
    FA.Net.findMatch(M.profile.rating,(found)=>{
      if(cancelled)return;
      ov.remove();
      toast(UZ.opponentFound,"gold");
      const peerTeam={name:found.peer.name,short:(found.peer.name||"RAQIB").slice(0,3).toUpperCase(),
        c1:found.peer.team.c1,c2:found.peer.team.c2,ovr:found.peer.team.ovr||70,
        formation:"4-3-3",players:null};
      launchOnline(found,peerTeam);
    },msg);
    /* 16s ichida topilmasa AI bilan */
    setTimeout(()=>{
      if(!cancelled&&ov.isConnected)return;
    },16000);
  }
  function launchOnline(found,peerTeam){
    const st=M.settings;
    const myT=M.clubTeamFromSave();
    const isHost=found.role==="host";
    const quality=st.quality||(M.settings.quality!=="avto"?M.settings.quality:FA.Engine.detectQuality());
    $("menu").classList.add("hidden");$("match").classList.remove("hidden");
    const awayObj=isHost?peerTeam:myT;
    const homeObj=isHost?myT:peerTeam;
    lastAwayName=isHost?peerTeam.name:myT.name;
    FA.Net.initGame(found.role);
    matchCtx={mode:"online",oppName:peerTeam.name};
    matchCtl=FA.Match({
      mode:"online",home:homeObj,away:awayObj,userSide:isHost?"home":"away",
      duration:st.duration,difficulty:2,night:false,rain:false,
      quality,fps:st.fps,camera:st.camera,needWinner:true,
      net:{
        role:found.role,
        sendState:snap=>FA.Net.sendState(snap),
        sendInput:i=>FA.Net.sendInput(i),
      },
      onEnd:res=>{FA.Net.sendResult([res.my,res.opp]);onMatchEnd(res);}
    });
    bindMatchControls();
    matchCtl.start();
    /* Ping ko‘rsatkichi */
    $("hud-ping").classList.remove("hidden");
    clearInterval(window._pingIv);
    window._pingIv=setInterval(()=>{
      $("hud-ping").textContent="📶 "+FA.Net.ping+UZ.ms;
    },1000);
    /* Tarmoq xabarlari */
    FA.Net.onGameMessage(d=>{
      if(d.t==="st"&&found.role==="guest"){FA.Net.markAlive();matchCtl&&matchCtl.applySnapshot(d.s);}
      if(d.t==="in"&&found.role==="host"){matchCtl&&matchCtl.netInput(d.id,d.i);}
      if(d.t==="bye"){toast("Raqib chiqib ketdi","err");}
      if(d.t==="res"){FA.Net.markAlive();}
    });
    FA.Net.onDrop(()=>{toast(UZ.connectionLost,"err");});
    /* Mehmon kiritishlarini yuborish */
    if(found.role==="guest"){
      const sendIn=()=>{ if(!matchCtl)return;
        FA.Net.sendInput(matchCtl.lastInput||{});
        setTimeout(sendIn,60);
      };
      sendIn();
    }
  }

  /* ================= JAMOA ================= */
  function renderTeam(){
    sub(()=>{
      curTeamTab="squad";
      $("menu-content").innerHTML=`
        <div class="tabs">
          <button class="tab active" data-tt="squad">👥 ${UZ.teamTabSquad}</button>
          <button class="tab" data-tt="tactics">📐 ${UZ.teamTabTactics}</button>
          <button class="tab" data-tt="club">🛡 ${UZ.teamTabClub}</button>
        </div><div id="team-body"></div>`;
      document.querySelectorAll("[data-tt]").forEach(b=>b.onclick=()=>{
        document.querySelectorAll("[data-tt]").forEach(x=>x.classList.remove("active"));
        b.classList.add("active");curTeamTab=b.dataset.tt;renderTeamBody();
        FA.Audio.ui();
      });
      renderTeamBody();
    });
  }
  function renderTeamBody(){
    const el=$("team-body");
    if(curTeamTab==="squad")renderSquad(el);
    else if(curTeamTab==="tactics")renderTactics(el);
    else renderClub(el);
  }
  function renderSquad(el){
    const slots=FA.FORMATIONS[M.club.formation];
    const lp=M.lineupPlayers();
    el.innerHTML=`<div class="pitch" id="pitch">
      ${slots.map((s,i)=>{
        const p=lp[i];
        return `<div class="pdot ${p?"":"empty"}" style="left:${s[1]*100}%;top:${(s[2]/2+0.5)*100}%">
          <div class="pd-circle" style="--gk:${s[0]==="GK"?"#7c4dff":"var(--grn)"}">${p?p.ovr:"+"}</div>
          <div class="pd-num">${UZ["pos"+s[0]]||s[0]}</div>
          <div class="pd-name">${p?esc(p.name.split(" ")[0]):""}</div>
        </div>`;}).join("")}
    </div>
    <div class="h-title mt"><h2>🪑 ${UZ.bench}</h2></div>
    <div id="bench-list"></div>`;
    /* slot bosilganda almashtirish */
    el.querySelectorAll(".pdot").forEach((d,i)=>d.onclick=()=>pickForSlot(i));
    renderBench(el.querySelector("#bench-list"));
  }
  function pickForSlot(i){
    const bench=M.benchPlayers();
    const ov=modal(`<div class="m-head"><h3>${UZ.swapPlayer} — ${UZ["pos"+FA.FORMATIONS[M.club.formation][i][0]]||""}</h3><button class="m-x" id="sw-x">✕</button></div>
      <div id="sw-list"></div>`);
    const list=ov.querySelector("#sw-list");
    const cur2=M.lineupPlayers()[i];
    list.innerHTML=bench.map(p=>playerRow(p,`<button class="btn sm" data-sw="${p.id}">⇄</button>`)).join("")||
      `<p class="muted center">${UZ.bench} bo‘sh</p>`;
    list.querySelectorAll("[data-sw]").forEach(b=>b.onclick=()=>{
      M.swapLineup(i,+b.dataset.sw);
      ov.remove();renderTeamBody();refreshTop();toast(UZ.playerBought?" ":"Tarkib yangilandi");
    });
    if(cur2)list.insertAdjacentHTML("beforeend",`<p class="muted small center mt">Hozir: ${esc(cur2.name)} (${cur2.ovr})</p>`);
    ov.querySelector("#sw-x").onclick=()=>ov.remove();
  }
  function renderBench(el){
    const bench=M.benchPlayers();
    el.innerHTML=bench.map(p=>playerRow(p,`<button class="btn sm sec" data-sell="${p.id}">💰 ${fmt(Math.round(p.price*0.85))}</button>`)).join("")||`<p class="muted center">${UZ.bench} bo‘sh</p>`;
    el.querySelectorAll("[data-sell]").forEach(b=>b.onclick=()=>{
      const r=M.sellPlayer(+b.dataset.sell);
      if(r.ok){toast(UZ.playerSold+" +"+fmt(r.gain)+" 🪙","gold");renderTeamBody();refreshTop();}
    });
    el.querySelectorAll(".prow").forEach(r=>r.onclick=e=>{
      if(e.target.closest("button"))return;
      showPlayerDetail(+r.dataset.pid,()=>renderTeamBody());
    });
  }
  function renderTactics(el){
    el.innerHTML=`
    <div class="card">
      <div class="muted small mb">${UZ.formation}</div>
      <div class="seg" id="f-sel">${FA.FORMATION_NAMES.map(f=>`<button class="${M.club.formation===f?"active":""}" data-f="${f}">${f}</button>`).join("")}</div>
    </div>
    <div class="card mt">
      <div class="muted small mb">${UZ.mentality}</div>
      <div class="seg-btns" id="m-sel" style="width:100%">${[UZ.mentDef,UZ.mentBal,UZ.mentAtk].map((x,i)=>`<button style="flex:1" data-m="${i}" class="${M.club.mentality===i?"active":""}">${x}</button>`).join("")}</div>
      <div class="muted small mb mt">${UZ.pressing}</div>
      <div class="seg-btns" id="p-sel" style="width:100%">${[UZ.pressLow,UZ.pressMid,UZ.pressHigh].map((x,i)=>`<button style="flex:1" data-p="${i}" class="${M.club.pressing===i?"active":""}">${x}</button>`).join("")}</div>
    </div>
    <div class="pitch mt" id="t-pitch"></div>`;
    el.querySelector("#f-sel").querySelectorAll("button").forEach(b=>b.onclick=()=>{
      M.setFormation(b.dataset.f);
      renderTeamBody();refreshTop();FA.Audio.ui();toast(UZ.saved);
    });
    el.querySelector("#m-sel").querySelectorAll("button").forEach(b=>b.onclick=()=>{
      M.club.mentality=+b.dataset.m;M.save();renderTactics(el);toast(UZ.saved);
    });
    el.querySelector("#p-sel").querySelectorAll("button").forEach(b=>b.onclick=()=>{
      M.club.pressing=+b.dataset.p;M.save();renderTactics(el);toast(UZ.saved);
    });
    const slots=FA.FORMATIONS[M.club.formation],lp=M.lineupPlayers();
    el.querySelector("#t-pitch").innerHTML=slots.map((s,i)=>{
      const p=lp[i];
      return `<div class="pdot" style="left:${s[1]*100}%;top:${(s[2]/2+0.5)*100}%">
        <div class="pd-circle" style="--gk:${s[0]==="GK"?"#7c4dff":"var(--grn)"}">${p?p.ovr:"?"}</div>
        <div class="pd-name">${p?esc(p.name.split(" ")[0]):""}</div></div>`;
    }).join("");
  }
  function renderClub(el){
    const c=M.club;
    el.innerHTML=`
    <div class="card">
      <div class="muted small mb">${UZ.clubName}</div>
      <input type="text" id="cl-name" value="${esc(c.name)}" maxlength="24">
      <div class="muted small mb mt">${UZ.coach}</div>
      <input type="text" id="cl-coach" value="${esc(c.coach)}" maxlength="24">
      <div class="muted small mb mt">${UZ.colors}</div>
      <div class="row" style="flex-wrap:wrap" id="cl-colors">
        ${FA.KIT_COLORS.map(k=>`<button class="color-dot ${c.c1===k?"sel":""}" data-c="${k}" style="background:#${k.toString(16).padStart(6,"0")}"></button>`).join("")}
      </div>
      <div class="muted small mb mt">${UZ.homeKit} / ${UZ.awayKit} / ${UZ.thirdKit}</div>
      <div class="grid3" id="cl-kits">${c.kits.map((k,i)=>`
        <div class="kit-preview" data-kit="${i}" style="background:linear-gradient(135deg,#${k[0].toString(16).padStart(6,"0")},#${k[1].toString(16).padStart(6,"0")});outline:${c.kitSel===i?"2px solid var(--grn)":"none"}">
          <div class="kp-shirt">👕</div></div>`).join("")}</div>
      <button class="btn wide mt" id="cl-save">💾 ${UZ.saveClub}</button>
    </div>
    <div class="card mt">
      <div class="muted small mb">${UZ.stadium}</div>
      ${FA.STADIUMS.map((s,i)=>`
        <div class="set-row"><div><div class="sr-t">🏟 ${s.name}</div><div class="sr-s">🏁 ${s.cap}</div></div>
        ${c.stadiumIdx===i?`<span class="pr-pos">✔ TANLANGAN</span>`
        :`<button class="btn sm ${M.profile.coins>=s.price?"":"sec"}" data-stad="${i}">${s.price?fmt(s.price)+" 🪙":UZ.claim}</button>`}</div>`).join("")}
    </div>`;
    el.querySelector("#cl-save").onclick=()=>{
      c.name=el.querySelector("#cl-name").value.trim()||c.name;
      c.coach=el.querySelector("#cl-coach").value.trim()||c.coach;
      c.short=c.name.replace(/[^A-Za-zA-Яa-яЎўҚқҒғҲҳ‘’]/g,"").slice(0,3).toUpperCase()||"MKL";
      M.save();toast(UZ.saved);refreshTop();
    };
    el.querySelector("#cl-colors").querySelectorAll("button").forEach(b=>b.onclick=()=>{
      c.c1=+b.dataset.c;c.kits[c.kitSel][0]=c.c1;M.save();renderClub(el);
    });
    el.querySelector("#cl-kits").querySelectorAll("[data-kit]").forEach(b=>b.onclick=()=>{
      c.kitSel=+b.dataset.kit;M.save();renderClub(el);
    });
    el.querySelectorAll("[data-stad]").forEach(b=>b.onclick=()=>{
      const i=+b.dataset.stad,s=FA.STADIUMS[i];
      if(M.profile.coins<s.price){toast(UZ.notEnough,"err");return;}
      M.profile.coins-=s.price;c.stadiumIdx=i;M.save();
      renderClub(el);refreshTop();toast("Stadion ochildi!","gold");
    });
  }

  /* ================= BOZOR ================= */
  function renderMarket(){
    sub(()=>{
      M.refreshMarket();
      $("menu-content").innerHTML=`
      <div class="h-title"><h2>🔁 ${UZ.transferMarket}</h2>
        <button class="btn sm gold" id="mk-ref">🔄 ${UZ.marketRefresh} (500🪙)</button></div>
      <div class="seg" id="mk-pos">
        <button class="active" data-p="all">${UZ.filterAll}</button>
        ${["GK","CB","CDM","CM","CAM","RW","ST"].map(p=>`<button data-p="${p}">${UZ["pos"+p]||p}</button>`).join("")}
      </div>
      <div id="mk-list"></div>`;
      let pos="all";
      const renderList=()=>{
        const list=M.marketList.filter(p=>pos==="all"||p.pos===pos||FA.roleOf(p.pos)===pos);
        $("mk-list").innerHTML=list.map(p=>playerRow(p,
          `<div class="pr-pos">${fmt(p.price)} 🪙</div><button class="btn sm ${M.profile.coins>=p.price?"":"sec"}" data-buy="${p.id}">${UZ.buy}</button>`)).join("")
          ||`<p class="muted center mt">Bozor bo‘sh — ertaga yangi futbolchilar keladi</p>`;
        $("mk-list").querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>{
          const p=M.marketList.find(x=>x.id===+b.dataset.buy);
          const r=M.buyPlayer(p);
          if(r.ok){toast(UZ.playerBought+": "+p.name,"gold");renderList();refreshTop();}
          else toast(r.err||UZ.notEnough,"err");
        });
        $("mk-list").querySelectorAll(".prow").forEach(r=>r.onclick=e=>{
          if(e.target.closest("button"))return;
          showPlayerDetail(+r.dataset.pid,renderList);
        });
      };
      $("mk-pos").querySelectorAll("button").forEach(b=>b.onclick=()=>{
        $("mk-pos").querySelectorAll("button").forEach(x=>x.classList.remove("active"));
        b.classList.add("active");pos=b.dataset.p;renderList();
      });
      $("mk-ref").onclick=()=>{
        if(M.profile.coins<500){toast(UZ.notEnough,"err");return;}
        M.profile.coins-=500;M.refreshMarket(true);renderMarket();
      };
      renderList();
    });
  }

  /* ---------- Futbolchi tafsiloti ---------- */
  function showPlayerDetail(pid,after){
    const p=M.state.players[pid];if(!p)return;
    const attrs=[["attrPAC","pac"],["attrACC","acc"],["attrSHO","sho"],["attrPAS","pas"],["attrDRI","dri"],
      ["attrDEF","def"],["attrPHY","phy"],["attrSTA","sta"],["attrHEA","hea"],["attrLSP","lsp"],["attrFRK","frk"],["attrPEN","pen"],["attrWF","wf"]];
    const canTrain=true;
    const ov=modal(`
      <div class="m-head"><h3>👤 ${esc(p.name)}</h3><button class="m-x" id="pd-x">✕</button></div>
      ${playerCard(p)}
      <div class="row mt"><span class="muted small">${UZ.age}: ${p.age} · ${UZ.nation}: 🇺🇿 · ${UZ.club}: ${esc(p.club||"—")}</span></div>
      <div class="row mt-s"><span class="muted small">${UZ.strongFoot}: ${p.foot==="L"?UZ.leftFoot:UZ.rightFoot} · ${UZ.price}: ${fmt(p.price)} 🪙</span></div>
      <div class="mt">${attrs.map(a=>`<div class="attr-row"><span class="an">${UZ[a[0]]}</span>
        <span class="ab">${attrBadge(p.attrs[a[1]])}</span><span class="av">${p.attrs[a[1]]}</span></div>`).join("")}</div>
      ${canTrain?`<button class="btn wide mt" id="pd-train">💪 ${UZ.train} — ${fmt(M.trainCost(p))} 🪙</button>`:""}
      <button class="btn red wide mt-s" id="pd-sell">💰 ${UZ.sell} — ${fmt(Math.round(p.price*0.85))} 🪙</button>
    `);
    ov.querySelector("#pd-x").onclick=()=>ov.remove();
    const tb=ov.querySelector("#pd-train");
    if(tb)tb.onclick=()=>{
      const r=M.trainPlayer(pid);
      if(r.ok){toast(UZ.developed+" +"+r.attr.toUpperCase(),"gold");ov.remove();showPlayerDetail(pid,after);refreshTop();}
      else toast(r.err||UZ.notEnough,"err");
    };
    ov.querySelector("#pd-sell").onclick=()=>{
      confirmDlg(UZ.sell+"?",()=>{
        const r=M.sellPlayer(pid);
        if(r.ok){toast(UZ.playerSold+" +"+fmt(r.gain)+" 🪙","gold");ov.remove();refreshTop();after&&after();}
      });
    };
  }

  /* ================= YANA (menyu grid) ================= */
  function renderMore(){
    sub(()=>{
      const items=[["players","👤",UZ.playersTitle],["store","🛒",UZ.store],["missions","📋",UZ.dailyMissions],
        ["rank","🏆",UZ.leaderboard],["tournament","🏅",UZ.tournament],["league","📅",UZ.league],
        ["cup","🏆",UZ.cup],["profile","🙋",UZ.profile],["settings","⚙️",UZ.settings]];
      $("menu-content").innerHTML=`<div class="h-title"><h2>☰ ${UZ.navYana}</h2></div>
        <div class="grid2">${items.map(i=>`<button class="mode-card" data-more="${i[0]}"><span class="mi">${i[1]}</span><div class="mt1">${i[2]}</div></button>`).join("")}</div>`;
      document.querySelectorAll("[data-more]").forEach(b=>b.onclick=()=>{
        FA.Audio.ui();
        const m=b.dataset.more;
        if(m==="players")renderPlayers();
        else if(m==="store")renderStore();
        else if(m==="missions")renderMissions();
        else if(m==="rank")renderRank();
        else if(m==="tournament")renderTournament("tournament");
        else if(m==="league")renderLeague();
        else if(m==="cup")renderTournament("cup");
        else if(m==="profile")renderProfile();
        else if(m==="settings")renderSettings();
      });
    });
  }

  /* ================= FUTBOLCHILAR ================= */
  function renderPlayers(){
    sub(()=>{
      const all=[...M.lineupPlayers(),...M.benchPlayers()];
      $("menu-content").innerHTML=`<div class="h-title"><h2>👤 ${UZ.playersTitle}</h2>
        <span class="sub">${all.length} futbolchi</span></div>
        <div class="grid3" id="pl-grid">${all.map(p=>playerCard(p)).join("")}</div>`;
      $("pl-grid").querySelectorAll(".pcard").forEach(c=>c.onclick=()=>showPlayerDetail(+c.dataset.pid,renderPlayers));
    });
  }

  /* ================= DO‘KON ================= */
  function renderStore(){
    sub(()=>{
      $("menu-content").innerHTML=`<div class="h-title"><h2>🛒 ${UZ.store}</h2></div>
      <div class="grid2">${FA.PACKS.map(pk=>`
        <div class="pack ${pk.cls}">
          <div class="pk-ic">${pk.ic}</div>
          <div class="pk-name">${pk.name}</div>
          <div class="pk-odds">${pk.uz}</div>
          <div class="pk-price"><button class="btn gold wide" data-pack="${pk.id}">📦 ${UZ.packOpen} — ${fmt(pk.price)} 🪙</button></div>
        </div>`).join("")}</div>
      <div class="h-title mt"><h2>🎟 ${UZ.items}</h2></div>
      <div class="card">
        <div class="set-row"><div><div class="sr-t">✏️ ${UZ.nameChange}</div><div class="sr-s">Profil ismini o‘zgartirish</div></div>
        <button class="btn sm" data-item="name">1000 🪙</button></div>
        <div class="set-row"><div><div class="sr-t">🏟 ${UZ.unlockStadium}</div><div class="sr-s">JAMOA → KLUB bo‘limidan</div></div>
        <button class="btn sm sec" data-item="stadium">→</button></div>
      </div>`;
      document.querySelectorAll("[data-pack]").forEach(b=>b.onclick=()=>{
        const pk=FA.PACKS.find(x=>x.id===b.dataset.pack);
        const r=M.openPack(pk);
        if(!r.ok){toast(r.err||UZ.notEnough,"err");return;}
        FA.Audio.cheer();
        const ov=modal(`<div class="m-head"><h3>🎁 ${pk.name}</h3><button class="m-x" id="po-x">✕</button></div>
          <div class="pack-open"><div class="pack-reveal">${r.players.map((p,i)=>playerCard(p)).join("")}</div>
          <button class="btn wide" id="po-ok">👍 ${UZ.continue}</button></div>`);
        ov.querySelector("#po-x").onclick=()=>ov.remove();
        ov.querySelector("#po-ok").onclick=()=>{ov.remove();refreshTop();};
      });
      document.querySelector('[data-item="name"]').onclick=()=>{
        if(M.profile.coins<1000){toast(UZ.notEnough,"err");return;}
        M.profile.coins-=1000;M.save();renderProfile();toast(UZ.purchased,"gold");
      };
      document.querySelector('[data-item="stadium"]').onclick=()=>{cur="jamoa";renderTeam();};
    });
  }

  /* ================= REYTING ================= */
  function renderRank(){
    sub(()=>{
      const rows=M.leaderboard();
      const me=rows.find(r=>r.me);
      const r=FA.rankOf(M.profile.rating),nx=FA.nextRank(M.profile.rating);
      $("menu-content").innerHTML=`
      <div class="rank-hero">
        <div class="rh-badge">${r.ic}</div>
        <div class="rh-name">${r.name}</div>
        <div class="rh-pts">${M.profile.rating} ${UZ.points} · ${UZ.yourRank}: ${me.rank}</div>
        ${nx?`<div class="rank-bar"><i style="width:${Math.round((M.profile.rating-r.min)/(nx.min-r.min)*100)}%"></i></div>
        <div class="muted small mt-s">Keyingi: ${nx.ic} ${nx.name} (${nx.min})</div>`:"<div class='muted small mt-s'>Eng yuqori daraja!</div>"}
      </div>
      <div class="h-title mt"><h2>🏆 ${UZ.leaderboard}</h2></div>
      <table class="tbl"><tr><th>#</th><th>${UZ.profile}</th><th style="text-align:right">${UZ.points}</th></tr>
      ${rows.slice(0,30).map(x=>`<tr class="${x.me?"me":""}"><td class="num">${x.rank}</td><td>${esc(x.name)}${x.me?" (SIZ)":""}</td><td style="text-align:right"><b>${x.pts}</b></td></tr>`).join("")}
      </table>`;
    });
  }

  /* ================= TURNIR / KUBOK ================= */
  function renderTournament(kind){
    sub(()=>{
      const isCup=kind==="cup";
      let st=M.state[kind];
      const size=isCup?16:8;
      const title=isCup?UZ.cup:UZ.tournament;
      if(!st){
        $("menu-content").innerHTML=`<div class="h-title"><h2>${isCup?"🏆":"🏅"} ${title}</h2></div>
        <div class="card center">
          <div style="font-size:52px">${isCup?"🏆":"🏅"}</div>
          <p class="muted mt-s">${size} jamoa · nokaut tizimi · mag‘lub bo‘lsangiz — chiqib ketasiz</p>
          <button class="btn wide mt" id="br-start">▶️ BOSHLASH</button>
        </div>`;
        $("br-start").onclick=()=>{M.startBracket(size,isCup);renderTournament(kind);};
        return;
      }
      if(!st.pairs[st.cur]){}
      const pairs=st.pairs[st.cur]||st.pairs[st.pairs.length-1];
      const rounds=["Chorak final","Yarim final","Final"];
      const cupRounds=["1/8","Chorak final","Yarim final","Final"];
      const names=isCup?cupRounds:rounds;
      $("menu-content").innerHTML=`<div class="h-title"><h2>${isCup?"🏆":"🏅"} ${title}</h2></div>
      <div class="card">
        ${st.out?`<div class="ov-title lose" style="font-size:18px">Siz turnirdan chiqdingiz 🥲</div>
          <button class="btn wide mt" id="br-new">🔄 QAYTADAN</button>`
        :st.champion?`<div class="ov-title win" style="font-size:18px">🏆 TURNIR G‘OLIBI!</div>
          <button class="btn wide mt" id="br-new">🔄 QAYTADAN</button>`
        :`<div class="muted small">${isCup?cupRounds[st.cur]:names[st.cur]||"Final"} — o‘z o‘yiningizni o‘ynang!</div>
          <button class="btn wide mt" id="br-play">▶️ O‘YINNI BOSHLASH</button>`}
      </div>
      <div class="h-title mt"><h2>Natijalar</h2></div>
      <div class="bracket">
        ${st.pairs.map((pr,pi)=>`<div class="br-round"><div class="muted small center">${(isCup?cupRounds:names)[pi]||""}</div>
          ${pr.map(m=>`<div class="br-match">
            <div class="br-team ${m[0].out?"":"win"}"><span>${esc(m[0].me?"👉 "+m[0].name:m[0].name)}</span></div>
            <div class="br-team ${m[1].out?"":"win"}"><span>${esc(m[1].me?"👉 "+m[1].name:m[1].name)}</span></div>
          </div>`).join("")}</div>`).join("")}
      </div>`;
      const np=$("br-new");if(np)np.onclick=()=>{M.state[kind]=null;M.save();renderTournament(kind);};
      const bp=$("br-play");
      if(bp)bp.onclick=()=>{
        const pairsNow=st.pairs[st.cur];
        let myPair=pairsNow.find(m=>m[0].me||m[1].me);
        const oppDef=myPair[0].me?myPair[1]:myPair[0];
        /* raqib klubi def sifatida */
        const opp=M.genClubTeam(oppDef.def||FA.CLUBS[0],oppDef.ovr);
        matchSetup({mode:kind,needWinner:true,oppDef:oppDef.def,oppOvr:oppDef.ovr,bracket:true,
          onLaunched:()=>{}});
      };
    });
  }

  /* ================= LIGA ================= */
  function renderLeague(){
    sub(()=>{
      let l=M.state.league;
      if(!l){
        $("menu-content").innerHTML=`<div class="h-title"><h2>📅 ${UZ.league}</h2></div>
        <div class="card center"><div style="font-size:52px">📅</div>
        <p class="muted mt-s">10 tur · ${FA.CLUBS.length} jamoa · jadval bo‘yicha chempionlik</p>
        <button class="btn wide mt" id="lg-start">▶️ MAVSUMNI BOSHLASH</button></div>`;
        $("lg-start").onclick=()=>{M.startLeague();renderLeague();};
        return;
      }
      const t=l.table,me=M.meShort();
      const sorted=Object.entries(t).sort((a,b)=>b[1].pts-a[1].pts||(b[1].gf-b[1].ga)-(a[1].gf-a[1].ga));
      const nextOpp=l.fixtures[l.round];
      $("menu-content").innerHTML=`<div class="h-title"><h2>📅 ${UZ.league}</h2>
        <span class="sub">${l.done?"Mavsum tugadi":`${l.round+1}-tur`}</span></div>
      ${l.done?`<div class="card center"><div class="ov-title ${l.finalPlace===1?"win":""}" style="font-size:18px">
        ${l.finalPlace===1?"🏆 CHEMPION!":l.finalPlace<=3?"🥉 Podium! "+l.finalPlace+"-o‘rin":l.finalPlace+"-o‘rin"}</div>
        <button class="btn wide mt" id="lg-new">🔄 YANGI MAVSUM</button></div>`
      :`<div class="card row"><b style="color:var(--grn)">${esc(M.club.name)}</b><span class="muted">vs</span>
        <b>${nextOpp}</b><div class="spacer"></div>
        <button class="btn sm" id="lg-play">▶️ O‘YNASH</button></div>`}
      <table class="tbl mt"><tr><th>#</th><th>Jamoa</th><th class="num">O</th><th class="num">G</th><th class="num">D</th><th class="num">M</th><th class="num">Ochko</th></tr>
      ${sorted.map((x,i)=>`<tr class="${x[0]===me?"me":""}"><td class="num">${i+1}</td><td>${x[0]===me?"⭐ "+esc(M.club.name):x[0]}</td>
        <td class="num">${x[1].p}</td><td class="num">${x[1].w}</td><td class="num">${x[1].d}</td><td class="num">${x[1].l}</td><td class="num"><b>${x[1].pts}</b></td></tr>`).join("")}
      </table>`;
      const lp2=$("lg-play");
      if(lp2)lp2.onclick=()=>{
        const team=l.teams.find(t2=>t2.def.short===nextOpp);
        matchSetup({mode:"league",oppDef:team.def,oppOvr:team.ovr});
      };
      const ln=$("lg-new");if(ln)ln.onclick=()=>{M.state.league=null;M.save();renderLeague();};
    });
  }

  /* ================= PROFIL ================= */
  function renderProfile(){
    sub(()=>{
      const pr=M.profile;
      $("menu-content").innerHTML=`<div class="h-title"><h2>🙋 ${UZ.profile}</h2></div>
      <div class="card center">
        <div style="font-size:64px">${FA.AVATARS[pr.avatar]}</div>
        <h3 class="mt-s">${esc(pr.name)}</h3>
        <p class="muted small">${M.levelOf(pr.xp)}-daraja · ${FA.rankOf(pr.rating).ic} ${FA.rankOf(pr.rating).name}</p>
        <button class="btn sm sec mt-s" id="pf-av">🖼 ${UZ.chooseAvatar}</button>
        <button class="btn sm sec mt-s" id="pf-name">✏️ ${UZ.editName}</button>
      </div>
      <div class="card mt"><div class="h-title" style="margin:0 0 8px"><h2>📊 ${UZ.stats}</h2></div>
        <div class="stat-grid">
          <div class="stat-box"><b>${pr.matches}</b><span>${UZ.matchesPlayed}</span></div>
          <div class="stat-box"><b>${pr.wins}</b><span>${UZ.wins}</span></div>
          <div class="stat-box"><b>${pr.draws}</b><span>${UZ.draws}</span></div>
          <div class="stat-box"><b>${pr.losses}</b><span>${UZ.losses}</span></div>
          <div class="stat-box"><b>${pr.goals}</b><span>${UZ.totalGoals}</span></div>
          <div class="stat-box"><b>${pr.assists}</b><span>${UZ.totalAssists}</span></div>
          <div class="stat-box"><b>${pr.cleanSheets}</b><span>Daxlsiz</span></div>
          <div class="stat-box"><b>${M.state.stats.trophies}</b><span>🏆 Kuboklar</span></div>
          <div class="stat-box"><b>${M.state.stats.packsOpened}</b><span>📦 Paketlar</span></div>
        </div></div>`;
      $("pf-av").onclick=()=>{
        const ov=modal(`<div class="m-head"><h3>${UZ.chooseAvatar}</h3><button class="m-x" id="av-x">✕</button></div>
        <div class="av-grid">${FA.AVATARS.map((a,i)=>`<button class="av-item ${pr.avatar===i?"sel":""}" data-av="${i}">${a}</button>`).join("")}</div>`);
        ov.querySelector("#av-x").onclick=()=>ov.remove();
        ov.querySelectorAll("[data-av]").forEach(b=>b.onclick=()=>{
          pr.avatar=+b.dataset.av;M.save();ov.remove();renderProfile();refreshTop();
        });
      };
      $("pf-name").onclick=()=>{
        const ov=modal(`<div class="m-head"><h3>${UZ.editName}</h3><button class="m-x" id="nm-x">✕</button></div>
        <input type="text" id="nm-in" maxlength="20" value="${esc(pr.name)}">
        <button class="btn wide mt" id="nm-ok">💾 ${UZ.saveClub.replace("SAQLASH","SAQLA")}</button>`);
        ov.querySelector("#nm-x").onclick=()=>ov.remove();
        ov.querySelector("#nm-ok").onclick=()=>{
          const v=ov.querySelector("#nm-in").value.trim();
          if(v){pr.name=v;M.save();refreshTop();renderProfile();toast(UZ.saved);}
          ov.remove();
        };
      };
    });
  }

  /* ================= SOZLAMALAR ================= */
  function renderSettings(){
    sub(()=>{
      const st=M.settings;
      const seg=(id,label,sub,opts,cur2)=>`
        <div class="set-row"><div><div class="sr-t">${label}</div>${sub?`<div class="sr-s">${sub}</div>`:""}</div>
        <div class="seg-btns" data-seg="${id}">${opts.map(o=>`<button data-v="${o[0]}" class="${String(cur2)===String(o[0])?"active":""}">${o[1]}</button>`).join("")}</div></div>`;
      $("menu-content").innerHTML=`<div class="h-title"><h2>⚙️ ${UZ.settings}</h2></div>
      <div class="card">
        ${seg("quality",UZ.graphics,"",[["avto",UZ.auto],["past",UZ.gLow],["orta",UZ.gMed],["yuqori",UZ.gHigh],["juda",UZ.gUltra],["ultra",UZ.gMax]],st.quality)}
        ${seg("fps","FPS","",[["30","30"],["60","60"],["90","90"],["120","120"]],st.fps)}
        ${seg("camera",UZ.camera,"",[["broadcast",UZ.camBroadcast],["dynamic",UZ.camDynamic]],st.camera)}
        ${seg("duration",UZ.duration,"standart o‘yin uzunligi",[[2,"2"],[3,"3"],[4,"4"],[6,"6"]],st.duration)}
        ${seg("vibration",UZ.vibration,"",[["on","YOQIQ"],["off","O‘CHIQ"]],st.vibration?"on":"off")}
      </div>
      <div class="card mt">
        <div class="set-row"><div class="sr-t">🔊 ${UZ.soundVol}</div><input type="range" min="0" max="1" step="0.05" value="${st.sfx}" data-vol="sfx"></div>
        <div class="set-row"><div class="sr-t">👥 ${UZ.crowdVol}</div><input type="range" min="0" max="1" step="0.05" value="${st.crowd}" data-vol="crowd"></div>
        <div class="set-row"><div class="sr-t">🎙 ${UZ.commVol}</div><input type="range" min="0" max="1" step="0.05" value="${st.comm}" data-vol="comm"></div>
        <div class="set-row"><div class="sr-t">🌐 ${UZ.language}</div><span class="pr-pos">${UZ.langUz}</span></div>
      </div>
      <button class="btn red wide mt" id="st-reset">🗑 ${UZ.resetData}</button>`;
      document.querySelectorAll("[data-seg]").forEach(sg=>{
        sg.querySelectorAll("button").forEach(b=>b.onclick=()=>{
          const key=sg.dataset.seg;let v=b.dataset.v;
          sg.querySelectorAll("button").forEach(x=>x.classList.remove("active"));
          b.classList.add("active");FA.Audio.ui();
          if(key==="fps")v=+v;
          if(key==="duration")v=+v;
          if(key==="vibration")v=v==="on";
          st[key]=v;M.save();
        });
      });
      document.querySelectorAll("[data-vol]").forEach(r=>r.oninput=()=>{
        st[r.dataset.vol]=+r.value;
        FA.Audio.setVol(r.dataset.vol,+r.value);
        M.save();
      });
      $("st-reset").onclick=()=>confirmDlg(UZ.resetConfirm,()=>{
        M.reset();location.reload();
      });
    });
  }

  /* ---------- Ilk ishga tushirish ---------- */
  function firstRun(){
    const ov=modal(`<div class="m-head"><h3>👋 ${UZ.welcome}!</h3></div>
      <p class="muted small mb">FUTBOL ARENA o‘yiniga xush kelibsiz! Ismingizni kiriting:</p>
      <input type="text" id="fr-name" maxlength="20" placeholder="Ismingiz" value="">
      <div class="muted small mb mt">${UZ.chooseAvatar}</div>
      <div class="av-grid" id="fr-av">${FA.AVATARS.map((a,i)=>`<button class="av-item ${i===0?"sel":""}" data-av="${i}">${a}</button>`).join("")}</div>
      <button class="btn wide mt" id="fr-go">▶️ ${UZ.startMatch.replace("O‘YINNI BOSHLASH","BOSHLASH")}</button>`);
    let av=0;
    ov.querySelectorAll("[data-av]").forEach(b=>b.onclick=()=>{
      ov.querySelectorAll("[data-av]").forEach(x=>x.classList.remove("sel"));
      b.classList.add("sel");av=+b.dataset.av;
    });
    ov.querySelector("#fr-go").onclick=()=>{
      const name=ov.querySelector("#fr-name").value.trim()||"O‘yinchi";
      M.defaultSave(name);
      M.profile.avatar=av;
      M.save();
      ov.remove();
      nav("uy");
    };
    ov.querySelector(".modal-ov")?.remove;
  }

  /* ---------- Ommaviy ---------- */
  function init(){
    document.querySelectorAll(".bn-item").forEach(b=>b.onclick=()=>{FA.Audio.ui();nav(b.dataset.nav);});
    $("tb-settings").onclick=()=>{FA.Audio.ui();renderSettings();};
    $("tb-profile").onclick=()=>renderProfile();
    $("tb-coins").onclick=()=>{cur="yana";renderStore();};
    if(!M.state)firstRun();else nav("uy");
    /* avtomatik grafik aniqlash (birinchi marta) */
    if(M.state&&M.settings.quality==="avto"&&!M.state._qDetected){
      M.settings._qDetected=true;
      M.settings.detected=FA.Engine.detectQuality();
      M.save();
    }
  }
  return {init,nav,toast,refreshTop,renderHome};
})();
