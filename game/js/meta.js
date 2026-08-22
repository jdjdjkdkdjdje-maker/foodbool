/* ============================================================
   FUTBOL ARENA — meta.js
   Profil, klub, iqtisodiyot, transfer bozori, paketlar,
   missiyalar, liga/turnir/kubok, saqlash (localStorage)
   ============================================================ */
"use strict";
window.FA = window.FA || {};

FA.Meta = (function(){
  const KEY="futbol_arena_save_v1";
  let S=null; /* saqlanadigan holat */
  let pid=1;

  /* ---------- Yordamchi ---------- */
  const todayKey=()=>{const d=new Date();return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();};
  const weekKey=()=>{const d=new Date();const o=new Date(d.getFullYear(),0,1);return d.getFullYear()+"w"+Math.ceil(((d-o)/864e5+o.getDay()+1)/7);};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  /* ---------- Pozitsiya vaznlari (OVR hisoblash) ---------- */
  const OVR_W={
    GK:{def:.4,phy:.2,pas:.15,dri:.05,pac:.05,sta:.15},
    DF:{def:.35,phy:.2,pac:.14,pas:.11,sta:.12,dri:.08},
    MF:{pas:.3,dri:.2,sta:.18,def:.1,sho:.12,pac:.1},
    FW:{sho:.34,dri:.24,pac:.18,pas:.1,phy:.14}
  };
  function calcOvr(p){
    const w=OVR_W[FA.roleOf(p.pos)]||OVR_W.MF; let s=0;
    for(const k in w) s+=p.attrs[k]*w[k];
    return Math.round(s);
  }

  /* ---------- Futbolchi generatori ---------- */
  function genPlayer(r,ovrTarget,pos){
    if(!pos){
      const pool=["CB","CB","LB","RB","CDM","CM","CM","CAM","LM","RM","LW","RW","ST","ST"];
      pos=FA.pick(r,pool);
      if(r()<0.07) pos="GK";
    }
    const jit=()=>Math.round(ovrTarget+(r()*12-6));
    const attrs={};
    for(const k of ["pac","acc","sho","pas","dri","def","phy","sta","hea","lsp","frk","pen","wf"]) attrs[k]=clamp(jit(),28,99);
    /* pozitsiyaga moslash */
    const boost={GK:{def:8,phy:4,pas:-6},CB:{def:8,hea:6,dri:-6},LB:{pac:4,def:3},RB:{pac:4,def:3},CDM:{def:6,sta:3},
      CM:{pas:5,sta:3},CAM:{dri:4,pas:4,sho:3},LM:{pac:4,pas:2},RM:{pac:4,pas:2},LW:{pac:6,dri:4,def:-8},RW:{pac:6,dri:4,def:-8},ST:{sho:6,hea:3,def:-10}}[pos]||{};
    for(const k in boost) attrs[k]=clamp(attrs[k]+boost[k],28,99);
    const p={
      id:pid++,
      name:FA.pick(r,FA.FIRST)+" "+FA.pick(r,FA.LAST),
      pos, attrs, age:FA.ri(r,18,34),
      foot:r()<0.24?"L":"R",
      tier:null, ovr:0, lvl:0, xp:0,
      num:FA.ri(r,1,99),
      skin:FA.pick(r,FA.SKINS||[0xf1c27d,0xe0ac69,0xc68642,0x8d5524,0xffdbac]),
      hair:FA.pick(r,[0x1a1a1a,0x2e1a0a,0x5a3a1a,0x0a0a0a,0x4a4a4a,0x7a5a2a]),
      nation:"O‘zbekiston",
      club:S&&S.club?S.club.name:"—"
    };
    p.ovr=calcOvr(p);
    p.tier=FA.tierByOvr(p.ovr);
    p.price=Math.round((FA.TIERS[FA.TIERS.indexOf(p.tier)].price[0]+(p.ovr-p.tier.min)/(p.tier.max-p.tier.min)*(FA.TIERS[FA.TIERS.indexOf(p.tier)].price[1]-FA.TIERS[FA.TIERS.indexOf(p.tier)].price[0]))/50)*50;
    return p;
  }

  /* ---------- AI klubi ---------- */
  function genClubTeam(clubDef,teamOvr){
    const r=FA.rng((clubDef.name.length*7919+teamOvr*104729)>>>0 || 7);
    const formation=FA.pick(r,FA.FORMATION_NAMES);
    const slots=FA.FORMATIONS[formation];
    const players=slots.map((s,i)=>{
      const p=genPlayer(r,clamp(teamOvr+FA.ri(r,-5,5),50,96),s[0]);
      p.num=i===0?1:FA.ri(r,2,33);
      return p;
    });
    return {def:clubDef, name:clubDef.name, short:clubDef.short, c1:clubDef.c1, c2:clubDef.c2,
      ovr:teamOvr, formation, players, coach:FA.pick(r,FA.COACH_FIRST)+" "+FA.pick(r,FA.COACH_LAST)};
  }

  /* ---------- Boshlang‘ich saqlanma ---------- */
  function defaultSave(name){
    pid=1;
    const r=FA.rng(Date.now()&0xffffff||42);
    S={
      v:1,
      created:Date.now(),
      profile:{name:name||"O‘yinchi",avatar:0,xp:0,coins:5000,rating:0,
        wins:0,draws:0,losses:0,goals:0,assists:0,matches:0,cleanSheets:0,onlineWins:0},
      club:{name:"Mening Klubim",c1:0x00e676,c2:0x041e3d,short:"MKL",
        kits:[[0x00e676,0x041e3d],[0xffffff,0x00e676],[0x0a1730,0xffd54f]],
        kitSel:0, formation:"4-3-3", mentality:1, pressing:1, stadiumIdx:0,
        coach:FA.pick(r,FA.COACH_FIRST)+" "+FA.pick(r,FA.COACH_LAST)},
      players:{}, squad:[],
      lineup:[],
      market:{day:"",list:[]},
      missions:{dDay:"",wDay:"",daily:[],weekly:[]},
      league:null,cup:null,tournament:null,
      settings:{quality:"avto",fps:60,camera:"broadcast",duration:4,difficulty:1,
        sfx:.8,crowd:.6,comm:.9,vibration:true,ctrlSize:1},
      stats:{packsOpened:0,trophies:0},
      seenIntro:false
    };
    /* Boshlang‘ich tarkib: 11 + 7 zaxira */
    const slots=FA.FORMATIONS[S.club.formation];
    slots.forEach(s=>{ const p=genPlayer(r,FA.ri(r,63,72),s[0]); addPlayer(p); S.lineup.push(p.id); });
    FA.BENCH_POS.forEach(bp=>{ const p=genPlayer(r,FA.ri(r,58,66),bp); addPlayer(p); S.squad.push(p.id); });
    refreshMissions(true);
    refreshMarket(true);
    return S;
  }
  function addPlayer(p){ S.players[p.id]=p; }

  /* ---------- Saqlash/yuklash ---------- */
  function load(){
    try{
      const raw=localStorage.getItem(KEY);
      if(raw){ S=JSON.parse(raw);
        pid=Math.max(1,...Object.keys(S.players||{}).map(Number))+1;
        return S;
      }
    }catch(e){}
    return null;
  }
  function save(){
    try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){}
  }
  function reset(){
    try{ localStorage.removeItem(KEY); }catch(e){}
    S=null;
  }

  /* ---------- Missiyalar ---------- */
  function refreshMissions(force){
    const tk=todayKey(), wk=weekKey();
    if(force||S.missions.dDay!==tk){
      S.missions.dDay=tk;
      S.missions.daily=FA.MISSIONS_DAILY.map(t=>({id:t.id,prog:0,claimed:false}));
    }
    if(force||S.missions.wDay!==wk){
      S.missions.wDay=wk;
      S.missions.weekly=FA.MISSIONS_WEEKLY.map(t=>({id:t.id,prog:0,claimed:false}));
    }
  }
  function missionProg(list,type,amount){
    const all=[...FA.MISSIONS_DAILY,...FA.MISSIONS_WEEKLY];
    list.forEach(m=>{
      const t=all.find(x=>x.id===m.id);
      if(t&&t.type===type&&!m.claimed) m.prog=Math.min(t.n,m.prog+amount);
    });
  }
  /* O‘yin statistikasini missiyalarga yozish */
  function trackMatch(st){
    refreshMissions();
    missionProg(S.missions.daily,"match",1);missionProg(S.missions.weekly,"match",1);
    if(st.win){missionProg(S.missions.daily,"win",1);missionProg(S.missions.weekly,"win",1);}
    for(const [k,v] of [["goal",st.goals],["assist",st.assists],["shot",st.shots],["pass_ok",st.passesOk],["penalty_goal",st.penGoals],["tackle",st.tackles],["corner",st.corners]])
      if(v>0){missionProg(S.missions.daily,k,v);missionProg(S.missions.weekly,k,v);}
    if(st.cleanSheet){missionProg(S.missions.daily,"clean_sheet",1);missionProg(S.missions.weekly,"clean_sheet",1);}
  }
  function claimMission(list,mId){
    const all=[...FA.MISSIONS_DAILY,...FA.MISSIONS_WEEKLY];
    const m=list.find(x=>x.id===mId&&!x.claimed);
    if(!m) return null;
    const t=all.find(x=>x.id===mId);
    if(m.prog<t.n) return null;
    m.claimed=true;
    S.profile.coins+=t.coins;
    addXP(t.xp||50);
    save();
    return {coins:t.coins,xp:t.xp||50};
  }

  /* ---------- XP / daraja ---------- */
  const levelOf=xp=>Math.floor(Math.sqrt(xp/60))+1;
  const xpFor=lvl=>60*(lvl-1)*(lvl-1);
  function addXP(n){
    const before=levelOf(S.profile.xp);
    S.profile.xp+=n;
    return levelOf(S.profile.xp)>before;
  }

  /* ---------- Transfer bozori ---------- */
  function refreshMarket(force){
    const tk=todayKey();
    if(!force&&S.market.day===tk) return;
    S.market.day=tk;
    const r=FA.rng((Date.now()/864e5|0)*777+13);
    S.market.list=[];
    const tiersW=[[.5,0],[.3,1],[.13,2],[.05,3],[.02,4]];
    for(let i=0;i<14;i++){
      const x=r(); let acc=0,tier=0;
      for(const [w,ti] of tiersW){acc+=w;if(x<acc){tier=ti;break;}}
      const T=FA.TIERS[tier];
      const p=genPlayer(r,FA.ri(r,T.min,T.max));
      p.price=Math.round(p.price*(0.85+r()*0.3)/50)*50;
      const def=FA.pick(r,FA.CLUBS); p.club=def.name;
      S.market.list.push(p);
    }
    save();
  }

  /* ---------- Sotib olish / sotish ---------- */
  function buyPlayer(p){
    if(S.profile.coins<p.price) return {ok:false,err:FA.UZ.notEnough};
    if(S.squad.length+S.lineup.length>=30) return {ok:false,err:FA.UZ.squadFull};
    S.profile.coins-=p.price;
    p.club=S.club.name;
    addPlayer(p);
    S.squad.push(p.id);
    S.market.list=S.market.list.filter(x=>x.id!==p.id);
    save();
    return {ok:true};
  }
  function sellPlayer(id){
    const p=S.players[id]; if(!p) return {ok:false};
    if(S.lineup.includes(id)){
      if(S.lineup.length<=11) { /* tarkibda kamida 11 bo‘lishi kerak */ }
      S.lineup=S.lineup.filter(x=>x!==id);
      /* zaxiradan to‘ldirish */
      const pos=p.pos, sub=S.squad.map(i=>S.players[i]).filter(x=>x&&FA.roleOf(x.pos)===FA.roleOf(pos)).sort((a,b)=>b.ovr-a.ovr)[0]
        ||S.squad.map(i=>S.players[i]).sort((a,b)=>b.ovr-a.ovr)[0];
      if(sub) S.lineup.push(sub.id);
    }
    S.squad=S.squad.filter(x=>x!==id);
    const gain=Math.round(p.price*0.85/50)*50;
    S.profile.coins+=gain;
    delete S.players[id];
    save();
    return {ok:true,gain};
  }

  /* ---------- Paketlar ---------- */
  function openPack(pack){
    if(S.profile.coins<pack.price) return {ok:false,err:FA.UZ.notEnough};
    S.profile.coins-=pack.price;
    S.stats.packsOpened++;
    const r=FA.rng(Date.now()&0x7fffffff);
    const got=[];
    for(let i=0;i<pack.n;i++){
      const x=r();let acc=0,tier=0;
      for(const [w,ti] of pack.odds){acc+=w;if(x<acc){tier=ti;break;}}
      const T=FA.TIERS[tier];
      const p=genPlayer(r,FA.ri(r,Math.max(50,T.min),T.max));
      p.club=S.club.name;
      got.push(p);
      addPlayer(p);
      S.squad.push(p.id);
    }
    addXP(30);
    save();
    return {ok:true,players:got};
  }

  /* ---------- Rivojlantirish ---------- */
  const TRAIN_CAP={oddiy:75,noyob:82,elita:88,afsonaviy:94,maxsus:99};
  const trainCost=p=>Math.round(((p.ovr-52)*90+p.lvl*220)/50)*50;
  function trainPlayer(id){
    const p=S.players[id]; if(!p) return {ok:false};
    const cap=TRAIN_CAP[p.tier.id]||75;
    if(p.ovr>=cap) return {ok:false,err:FA.UZ.maxLevel};
    const cost=trainCost(p);
    if(S.profile.coins<cost) return {ok:false,err:FA.UZ.notEnough};
    S.profile.coins-=cost;
    p.lvl++;
    /* eng past 2 atributni yaxshilash */
    const keys=Object.keys(p.attrs).sort((a,b)=>p.attrs[a]-p.attrs[b]).slice(0,3);
    const k=keys[Math.floor(Math.random()*keys.length)];
    p.attrs[k]=clamp(p.attrs[k]+FA.ri(Math.random,1,3),28,99);
    const oldTier=p.tier;
    p.ovr=calcOvr(p);
    p.tier=FA.tierByOvr(p.ovr);
    addXP(15);
    save();
    return {ok:true,attr:k,cost};
  }

  /* ---------- Match natijasi ---------- */
  function matchResult(o){
    /* o: {mode, my, opp, stats:{goals,assists,shots,passOk,tackles,penGoals,corners,cleanSheet}} */
    const pr=S.profile;
    pr.matches++;
    const win=o.my>o.opp, draw=o.my===o.opp;
    if(win)pr.wins++; else if(draw)pr.draws++; else pr.losses++;
    if(o.mode==="online"&&win)pr.onlineWins++;
    pr.goals+=o.stats.goals||0;
    pr.assists+=o.stats.assists||0;
    if(o.stats.cleanSheet)pr.cleanSheets++;
    /* mukofot */
    let coins=150+o.stats.goals*40+(win?250:draw?90:40);
    if(o.mode==="ranked"||o.mode==="online") coins+=300;
    if(o.mode==="tournament"||o.mode==="cup") coins+=200;
    if(o.mode==="league") coins+=120;
    let rating=0;
    if(o.mode==="ranked"||o.mode==="online"){
      const pts=win?28:draw?8:-18;
      pr.rating=Math.max(0,pr.rating+pts); rating=pts;
    }
    const lvlUp=addXP(60+(win?60:20));
    S.profile.coins+=coins;
    trackMatch({win,goals:o.stats.goals||0,assists:o.stats.assists||0,shots:o.stats.shots||0,
      passesOk:o.stats.passOk||0,penGoals:o.stats.penGoals||0,tackles:o.stats.tackles||0,
      corners:o.stats.corners||0,cleanSheet:o.stats.cleanSheet});
    save();
    return {coins,rating,lvlUp};
  }

  /* ---------- Liga ---------- */
  function startLeague(){
    const r=FA.rng(Date.now()&0xffff);
    const me=meShort();
    const pool=[...FA.CLUBS].sort(()=>r()-.5).slice(0,10); /* 10 tur — 10 raqib */
    S.league={round:0,
      teams:pool.map(c=>({def:c,ovr:FA.ri(r,62,82)})),
      fixtures:pool.map(c=>c.short),
      table:{}};
    S.league.table[me]={p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0};
    pool.forEach(c=>S.league.table[c.short]={p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0});
    save();
  }
  function simOther(l){
    /* boshqa o‘yinlar natijasini taxminiy hisoblash */
    l.teams.forEach(t=>{
      if(t.played) return;
    });
  }
  function leaguePlayResult(my,opp){
    const l=S.league; if(!l) return;
    const t=l.table, me=meShort(), op=l.fixtures[l.round];
    t[me].p++;t[op].p++;
    t[me].gf+=my;t[me].ga+=opp;t[op].gf+=opp;t[op].ga+=my;
    if(my>opp){t[me].w++;t[me].pts+=3;t[op].l++;}
    else if(my<opp){t[op].w++;t[op].pts+=3;t[me].l++;}
    else{t[me].d++;t[op].d++;t[me].pts++;t[op].pts++;}
    /* qolgan jamoalar simulyatsiyasi */
    const others=l.teams.map(x=>x.def.short).filter(x=>x!==me&&x!==op);
    for(let i=0;i<others.length;i+=2){
      if(!others[i+1])break;
      const a=others[i],b=others[i+1],r=Math.random;
      const ga=Math.floor(r()*4),gb=Math.floor(r()*4);
      t[a].p++;t[b].p++;t[a].gf+=ga;t[a].ga+=gb;t[b].gf+=gb;t[b].ga+=ga;
      if(ga>gb){t[a].w++;t[a].pts+=3;t[b].l++;}else if(ga<gb){t[b].w++;t[b].pts+=3;t[a].d++;t[a].d++;}
      else{t[a].d++;t[b].d++;t[a].pts++;t[b].pts++;}
    }
    l.round++;
    l.done=l.round>=l.fixtures.length;
    if(l.done){
      const sorted=Object.entries(t).sort((a,b)=>b[1].pts-a[1].pts||(b[1].gf-b[1].ga)-(a[1].gf-a[1].ga));
      const place=sorted.findIndex(x=>x[0]===me)+1;
      l.finalPlace=place;
      if(place===1){S.profile.coins+=8000;S.stats.trophies++;}
      else if(place<=3)S.profile.coins+=3500;
      else S.profile.coins+=1000;
    }
    save();
  }
  const meShort=()=>S.club.short||"MKL";

  /* ---------- Turnir / Kubok (bracket) ---------- */
  function startBracket(size,isCup){
    const r=FA.rng(Date.now()&0xffff);
    const teams=[{short:meShort(),name:S.club.name,me:true,ovr:teamOvr()}];
    const pool=[...FA.CLUBS].sort(()=>r()-.5).slice(0,size-1);
    pool.forEach(c=>teams.push({short:c.short,name:c.name,def:c,ovr:FA.ri(r,60,84)}));
    /* tasodifiy juftlik */
    teams.sort(()=>r()-.5);
    const rounds=Math.log2(size);
    const st={size,rounds,cur:0,teams,
      pairs:[Array.from({length:size/2},(_,i)=>[teams[i*2],teams[i*2+1]])],
      results:[],isCup};
    S[isCup?"cup":"tournament"]=st;
    save();
  }
  function teamOvr(){
    const lp=S.lineup.map(id=>S.players[id]).filter(Boolean);
    if(!lp.length) return 65;
    return Math.round(lp.reduce((a,p)=>a+p.ovr,0)/lp.length);
  }
  /* Turnirda o‘z o‘yinim natijasi; yutqazsam — turnir tugadi */
  function bracketMyResult(my,opp,which){
    const st=which?S[which]:null; if(!st) return null;
    const roundPairs=st.pairs[st.cur];
    let myPair=null;
    for(const pr of roundPairs) if(pr[0].me||pr[1].me) myPair=pr;
    if(!myPair) return null;
    const meWin=my>opp;
    const winners=[];
    for(const pr of roundPairs){
      if(pr===myPair){ winners.push(meWin?(pr[0].me?pr[0]:pr[1]):(pr[0].me?pr[1]:pr[0])); st.results.push({a:pr[0].name,b:pr[1].name,as:pr[0].me?my:opp,bs:pr[1].me?my:opp}); }
      else{
        const ta=pr[0].ovr+Math.random()*8, tb=pr[1].ovr+Math.random()*8;
        let as,bs;
        if(ta>tb){as=Math.floor(Math.random()*4)+1;bs=Math.floor(Math.random()*as);}
        else{bs=Math.floor(Math.random()*4)+1;as=Math.floor(Math.random()*bs);}
        if(as===bs) as++;
        winners.push(as>bs?pr[0]:pr[1]);
        st.results.push({a:pr[0].name,b:pr[1].name,as,bs});
      }
    }
    if(!meWin){ st.out=true; finishBracket(st); save(); return {win:false,champion:false}; }
    if(winners.length===1){ st.champion=true; finishBracket(st,true); save(); return {win:true,champion:true}; }
    st.pairs.push(Array.from({length:winners.length/2},(_,i)=>[winners[i*2],winners[i*2+1]]));
    st.cur++;
    save();
    return {win:true,champion:false};
  }
  function finishBracket(st,won){
    if(won){ S.profile.coins+=st.isCup?15000:10000; S.stats.trophies++; }
    else S.profile.coins+=1500;
  }

  /* ---------- Reyting jadvali (offlayn minora) ---------- */
  function leaderboard(){
    const r=FA.rng(90210);
    const my=S.profile.rating;
    const rows=[];
    for(let i=0;i<50;i++){
      const pts=Math.max(0,Math.round(3600-i*62+r()*120));
      rows.push({name:FA.randLeaderName(r),pts,me:false});
    }
    rows.push({name:S.profile.name,pts:my,me:true});
    rows.sort((a,b)=>b.pts-a.pts);
    rows.forEach((x,i)=>x.rank=i+1);
    return rows;
  }

  /* ---------- Tarkib yordamchilari ---------- */
  function lineupPlayers(){ return S.lineup.map(id=>S.players[id]).filter(Boolean); }
  function benchPlayers(){ return S.squad.map(id=>S.players[id]).filter(Boolean); }
  function swapLineup(slotIdx,playerId){
    const idInLineup=S.lineup.indexOf(playerId);
    const prev=S.lineup[slotIdx];
    if(idInLineup>=0){ S.lineup[idInLineup]=prev; }
    else { S.squad=S.squad.filter(x=>x!==playerId); if(prev)S.squad.push(prev); }
    S.lineup[slotIdx]=playerId;
    save();
  }
  function setFormation(f){
    S.club.formation=f;
    /* slot pozitsiyalariga mos o‘yinchilarni qayta taqsimlash */
    const all=[...lineupPlayers(),...benchPlayers()];
    const slots=FA.FORMATIONS[f];
    const used=new Set(); S.lineup=[];
    slots.forEach((s,i)=>{
      const cand=all.filter(p=>!used.has(p.id)&&p.pos===s[0])
        .concat(all.filter(p=>!used.has(p.id)&&FA.roleOf(p.pos)===FA.roleOf(s[0])))
        .concat(all.filter(p=>!used.has(p.id)));
      if(cand[0]){S.lineup.push(cand[0].id);used.add(cand[0].id);}
      else S.lineup.push(null);
    });
    S.squad=all.filter(p=>!used.has(p.id)).map(p=>p.id);
    /* bo‘sh qolgan bo‘lsa */
    S.lineup=S.lineup.map(id=>id||(()=>{const p=genPlayer(FA.rng(Math.random()*1e9|0),62);addPlayer(p);return p.id;})());
    save();
  }
  function clubTeamFromSave(){
    /* Foydalanuvchi klubini o‘yinda ishlatiladigan formatga aylantirish */
    const lp=lineupPlayers();
    const kits=S.club.kits[S.club.kitSel]||S.club.kits[0];
    return {
      name:S.club.name, short:S.club.short, c1:kits[0], c2:kits[1],
      ovr:teamOvr(), formation:S.club.formation, mentality:S.club.mentality, pressing:S.club.pressing,
      players:lp, coach:S.club.coach, gkKit:[0x22ee66,0x111111], isMe:true
    };
  }
  function randomOpponent(ovrNear){
    const r=FA.rng(Date.now()&0xfffff);
    const def=FA.pick(r,FA.CLUBS);
    return genClubTeam(def,clamp(ovrNear+FA.ri(r,-4,4),55,92));
  }
  function marketOpponents(){
    return FA.CLUBS.map((c,i)=>({def:c,ovr:62+((i*7)%22)}));
  }

  /* ---------- API ---------- */
  const api={
    load,save,reset,defaultSave,genPlayer,genClubTeam,refreshMissions,refreshMarket,
    buyPlayer,sellPlayer,openPack,trainPlayer,trainCost,matchResult,
    startLeague,leaguePlayResult,leaderboard,startBracket,bracketMyResult,
    lineupPlayers,benchPlayers,swapLineup,setFormation,clubTeamFromSave,randomOpponent,
    calcOvr,levelOf,xpFor,meShort,teamOvr,marketOpponents,
    claimMission,
    get state(){return S;},
    get profile(){return S.profile;},
    get club(){return S.club;},
    get settings(){return S.settings;},
    get marketList(){return S.market.list;},
    get missions(){return S.missions;}
  };
  return api;
})();
