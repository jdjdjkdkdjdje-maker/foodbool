/* ============================================================
   FUTBOL ARENA — match.js
   11 ga 11 o‘yin simulyatsiyasi: qoidalar (ofsayd, kartalar,
   penalti...), AI, boshqaruv, to‘p fizikasi, kameralar, HUD
   ============================================================ */
"use strict";
window.FA = window.FA || {};

FA.Match = function(opts){
  "use strict";
  const UZ=FA.UZ;
  const W=105, H=68, GX=52.5, GZW=3.66, GZH=2.44, BR=0.115;
  const DT=1/60;

  const o=Object.assign({
    mode:"ai", home:null, away:null, userSide:"home",
    duration:4, difficulty:1, night:false, rain:false, quality:"orta",
    camera:"broadcast", fps:60, net:null,
    onEnd:null, onHide:null
  },opts);

  /* ---------- DOM ---------- */
  const $=id=>document.getElementById(id);
  const elScore=$("hs-score"),elTime=$("hs-time"),elHalf=$("hs-half"),
    elHome=$("hs-home"),elAway=$("hs-away"),elNotif=$("hud-notif"),
    elComm=$("hud-commentary"),elSt=$("hud-st-fill"),elStam=$("hud-stamina"),
    elRadar=$("hud-radar"),elPing=$("hud-ping"),elPoss=$("hud-possess"),elBtns=$("btns");

  /* ---------- O‘yin holati ---------- */
  let engine, ball, players=[], teams=[], ballMesh;
  let score=[0,0], half=1, tHalf=0, halfSec=o.duration*30, added=0;
  let state="kickoff", stateT=0, playDir=[1,-1]; /* team0 hujum +x */
  let ballS={x:0,y:BR,z:0,vx:0,vy:0,vz:0,spin:0,owner:null,lastTouch:null,lastTeam:-1};
  let stats; let controlled=null, controlledSide=0, sprintHold=false, pressHold=false;
  let lastPasser=null, passTarget=null, offMarks=new Set(), passArmed=0;
  let radarCtx=elRadar?elRadar.getContext("2d"):null;
  let kickAnimT=0, shakeT=0;
  let ended=false, paused=false, rafId=0, lastT=0, acc=0;
  let commQ=[], commT=0;
  let pen={on:false}; /* penalti holati */
  let friendBoth = o.mode==="friend";
  let netState={snapT:0,lastSnap:null,lastSnap2:null,inputs:{}};

  function newStats(){ return {poss:[0,0],shots:[0,0],onT:[0,0],goals:[[],[]],passes:[0,0],passOk:[0,0],
    fouls:[0,0],ys:[0,0],rs:[0,0],off:[0,0],corners:[0,0],saves:[0,0],scorers:[[],[]]}; }
  stats=newStats();

  /* ---------- Yordamchi ---------- */
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  const dist=(a,b,c,d)=>Math.hypot(a-c,b-d);
  const rnd=Math.random;
  const pick=a=>a[Math.floor(rnd()*a.length)];
  function ang(x,z){return Math.atan2(z,x);}

  function notify(txt,sub,ms){
    elNotif.innerHTML=txt+(sub?`<small>${sub}</small>`:"");
    elNotif.classList.remove("hidden");
    clearTimeout(notify._t);
    notify._t=setTimeout(()=>elNotif.classList.add("hidden"),ms||1600);
  }
  function comment(key){
    const arr=UZ[key]; const t=Array.isArray(arr)?pick(arr):arr;
    elComm.textContent="🎙 "+t; elComm.classList.add("show");
    FA.Audio.speak(t);
    clearTimeout(comment._t); comment._t=setTimeout(()=>elComm.classList.remove("show"),3400);
  }

  /* ---------- Jamoa/futbolchi yaratish ---------- */
  function makeTeams(){
    const defs=[o.home,o.away];
    for(let ti=0;ti<2;ti++){
      const d=defs[ti];
      const slots=FA.FORMATIONS[d.formation]||FA.FORMATIONS["4-3-3"];
      const t={i:ti,def:d,name:d.name,short:d.short,dir:playDir[ti],
        players:[],mentality:d.mentality??1,pressing:d.pressing??1};
      /* 11 ta futbolchi */
      const list=d.players&&d.players.length?d.players.slice(0,11):null;
      slots.forEach((s,si)=>{
        const pd=list&&list[si]?list[si]:FA.Meta.genPlayer(FA.rng((ti*997+si*31+7)>>>0),d.ovr||68,s[0]);
        const mult=[0.9,0.97,1.03,1.09][o.difficulty]||1;
        const at={};for(const k in pd.attrs)at[k]=clamp(Math.round(pd.attrs[k]*(ti===1&&!isUserTeam(ti)?mult:1)),30,99);
        const p={
          id:ti*20+si, team:ti, si, pos:s[0], role:FA.roleOf(s[0]), gk:s[0]==="GK",
          num:pd.num||si+1, name:pd.name, attrs:at,
          baseX:s[1]*W-GX, baseZ:s[2]*30,
          x:0,z:0,vx:0,vz:0,face:ti===0?0:Math.PI,
          state:"run",stT:0,yellow:0,off:false,stam:100,
          mesh:null
        };
        t.players.push(p);
      });
      teams.push(t);
    }
  }
  function isUserTeam(ti){
    if(friendBoth) return true; /* do‘st rejimida to‘p kimda — o‘sha boshqaradi */
    return (o.userSide==="home"?0:1)===ti;
  }

  function buildScene(){
    engine=FA.Engine;
    engine.create($("game"),{quality:o.quality,night:o.night,rain:o.rain});
    engine.setFpsCap(o.fps);
    ballMesh=engine.makeBall();
    engine.scene.add(ballMesh);
    for(const t of teams) for(const p of t.players){
      const d=t.def;
      const gk=t.i===0?d.gkKit&&d.gkKit[0]:null;
      p.mesh=engine.makePlayer({
        c1:t.i===0?d.c1:d.c1, c2:d.c2, shorts:t.i===0?(d.c2||0xffffff):(d.c2||0xffffff),
        socks:d.c1, gk:p.gk, num:p.num, skin:p.skinT||pick(FA.SKINS_||[0xf1c27d,0xe0ac69,0xc68642,0x8d5524,0xffdbac]),
        hair:pick([0x1a1a1a,0x2e1a0a,0x5a3a1a,0x0a0a0a,0x4a4a4a])
      });
      engine.scene.add(p.mesh);
    }
    elHome.textContent=o.home.short||"UY"; elAway.textContent=o.away.short||"SF";
    if(friendBoth) elPoss.classList.remove("hidden");
  }

  /* ---------- Joylashuv ---------- */
  function homePos(p){
    const t=teams[p.team], d=t.dir;
    let x=p.baseX*d, z=p.baseZ;
    const hasBall=ballS.owner&&ballS.owner.team===p.team;
    const pull=p.gk?0.06:{DF:.28,MF:.42,FW:.48}[p.role]||.35;
    x+=(ballS.x-x)*pull; z+=(ballS.z-z)*.3;
    if(hasBall) x+=d*({DF:5,MF:11,FW:16}[p.role]||8);
    else x-=d*({DF:6,MF:8,FW:10}[p.role]||8);
    return {x:clamp(x,-GX+1,GX-1),z:clamp(z,-33,33)};
  }
  function kickoffPositions(kickTeam){
    for(const t of teams) for(const p of t.players){
      const bxOwn=Math.min(p.baseX,-1.5); /* o‘z yarmida turing */
      let x=bxOwn*t.dir, z=p.baseZ;
      if(t.i===kickTeam&&p.role==="FW"&&p.si===t.players.length-1){x=-t.dir*0.9;z=0;}
      p.x=x;p.z=z;p.vx=0;p.vz=0;p.face=t.dir>0?0:Math.PI;p.state="run";
      p.aiTarget={x,z};
    }
    ballS.x=0;ballS.y=BR;ballS.z=0;ballS.vx=0;ballS.vy=0;ballS.vz=0;ballS.owner=null;
  }

  /* ---------- Boshqaruv API (teginish/klaviatura) ---------- */
  const input={mx:0,mz:0,sprint:false};
  function onButton(name){
    if(paused||ended)return;
    /* Mehmon (onlayn) — tugmani mezbonga yuboradi */
    if(o.net&&o.net.role==="guest"&&o.net.sendInput){o.net.sendInput({btn:name});FA.Audio.ui();return;}
    if(pen.on||pen.so){penButton(name);return;}
    if(state!=="play"&&state!=="setpiece")return;
    const c=controlledOf(); if(!c)return;
    const attacking=ballS.owner&&ballS.owner.team===c.team;
    switch(name){
      case "pass": attacking?doPass(c,false):doTackle(c,false); break;
      case "shoot": attacking?doShoot(c,0.75):doSlide(c); break;
      case "long": attacking?doPass(c,true):doSwitch(); break;
      case "through": attacking?doPass(c,false,true):doSwitch(); break;
      case "tackle": doTackle(c,false); break;
      case "slide": doSlide(c); break;
      case "switch": doSwitch(); break;
      case "sprint": sprintHold=!sprintHold; break;
      case "press": pressHold=!pressHold; break;
    }
    updateBtns();
  }
  function onGesture(dir){ /* yuqori/past/chap/o‘ng surish */
    if(pen.on){if(dir==="up")penButton("shoot");return;}
    if(state!=="play")return;
    const c=controlledOf(); if(!c)return;
    const attacking=ballS.owner&&ballS.owner.team===c.team;
    if(attacking){
      if(dir==="up")doShoot(c,1.0,true);
      else if(dir==="down")doShoot(c,0.55,false,true);
      else fakeMove(c,dir);
    }
  }
  function fakeMove(c,dir){
    /* fint — qisqa tezlik portlashi burilish bilan */
    const d=teams[c.team].dir;
    const nx=dir==="left"?-1:dir==="right"?1:0;
    c.vx+=nx*7*d; c.vz+=(dir==="left"?3:-3)*d;
    FA.Audio.ui();
  }
  function setMove(mx,mz){input.mx=mx;input.mz=mz;}
  function controlledOf(){
    if(!controlled||controlled.off)doSwitch(true);
    return controlled&&!controlled.off?controlled:players.find(p=>!p.off&&isUserTeam(p.team)&&!p.gk);
  }

  /* ---------- Harakat ---------- */
  function movePlayer(p,dt){
    if(p.off){p.mesh.visible=false;return;}
    let want={x:0,z:0},maxs=1;
    const at=p.attrs;
    const base=(4.4+at.pac*0.045)*(0.85+p.stam/700);
    const isCtl=(p===controlled&&isUserTeam(p.team)&&state==="play")||
      (o.net&&o.net.role==="host"&&p===netGuestCtl&&!p.off);
    if(isCtl){
      /* kamera nisbiy boshqaruv */
      let wx,wz,jmx,jmz;
      if(p===netGuestCtl&&o.net&&o.net.role==="host"){jmx=p.gMx||0;jmz=p.gMz||0;}
      else {jmx=input.mx;jmz=input.mz;}
      if(o.camera==="dynamic"){
        const d=teams[p.team].dir;
        wx=-jmz*d; wz=jmx*d;
      } else { wx=jmx; wz=jmz; }
      want.x=wx; want.z=wz;
      maxs=(sprintHold&&p.stam>5?1.32:1);
      if(sprintHold&&Math.hypot(wx,wz)>.1)p.stam=Math.max(0,p.stam-dt*7);
      else p.stam=Math.min(100,p.stam+dt*4);
    } else {
      /* AI nishonga yurish */
      const tgt=p.aiTarget||homePos(p);
      const dx=tgt.x-p.x,dz=tgt.z-p.z,d=Math.hypot(dx,dz);
      if(d>0.25){want.x=dx/d;want.z=dz/d;}
      const urg=clamp(d/6,0.25,1);
      maxs=(p.gk?0.9:1)*(0.5+urg*0.6)*(p.aiSprint?1.15:1);
      p.stam=Math.min(100,p.stam+dt*3);
    }
    const spd=base*maxs*clamp(Math.hypot(want.x,want.z),0,1);
    const tvx=want.x*spd, tvz=want.z*spd;
    const acc=(9+at.acc*0.06)*dt, dec=(14+at.acc*0.08)*dt;
    p.vx+=clamp(tvx-p.vx,-acc,acc);
    p.vz+=clamp(tvz-p.vz,-acc,dec===0?acc:acc);
    if(p.state==="slide"){
      const s=7.5*(1-p.stT/0.65); p.vx=Math.cos(p.face)*s; p.vz=Math.sin(p.face)*s;
    }
    if(p.state==="fall"||p.stT<(p.state==="kick"?0.18:0)){
      if(p.state==="fall"){p.vx*=0.9;p.vz*=0.9;}
      if(p.state==="kick"&&p.stT<0.15){}
    }
    p.x=clamp(p.x+p.vx*dt,-GX-2,GX+2); p.z=clamp(p.z+p.vz*dt,-H/2-2,H/2+2);
    const mv=Math.hypot(p.vx,p.vz);
    if(mv>0.4)p.face=ang(p.vx,p.vz);
    /* animatsiya holati */
    if(p.state==="run"||p.state==="idle") p.state=mv>0.5?"run":"idle";
    if(p.gk&&mv<0.5&&p.state==="idle")p.state="gkidle";
    p.stT+=dt;
    if(p.state==="kick"&&p.stT>0.45)p.state="run";
    if(p.state==="slide"&&p.stT>0.65){p.state="fall";p.stT=0;p.slideDone=false;}
    if(p.state==="fall"&&p.stT>0.9)p.state="run";
    if(p.state==="celebrate"&&p.stT>3)p.state="run";
    if(p.state==="dive"&&p.stT>1.1){p.state="gkidle";p.stT=0;}
    if(p.state==="dive"){p.x+=Math.cos(p.diveA)*2*dt;p.z+=Math.sin(p.diveA)*4*dt;}
  }

  /* ---------- To‘p fizikasi ---------- */
  function ballPhys(dt){
    const b=ballS;
    if(b.owner){
      const p=b.owner;
      const fx=Math.cos(p.face),fz=Math.sin(p.face);
      const carry=0.42+(p===controlled&&sprintHold?0.18:0);
      const tx=p.x+fx*carry, tz=p.z+fz*carry;
      b.vx=(tx-b.x)/dt*0.55; b.vz=(tz-b.z)/dt*0.55;
      b.x+=b.vx*dt; b.z+=b.vz*dt; b.y=BR+Math.abs(Math.sin(perfNow*9))*0.04;
      b.spin=0;
      return;
    }
    b.vy-=9.81*dt;
    /* Magnus kuchi */
    if(b.spin){
      const mx=-b.vz*b.spin*0.045, mz=b.vx*b.spin*0.045;
      b.vx+=mx*dt*9; b.vz+=mz*dt*9;
    }
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.z+=b.vz*dt;
    if(b.y<BR){
      b.y=BR;
      if(Math.abs(b.vy)>1.2){b.vy=-b.vy*0.58;FA.Audio.kick(0.15);}
      else b.vy=0;
      /* ishqalanish */
      const f=2.6*dt; const sp=Math.hypot(b.vx,b.vz);
      if(sp>0){const ns=Math.max(0,sp-f*(sp>6?2.2:1));b.vx*=ns/sp;b.vz*=ns/sp;}
      b.spin*=Math.pow(0.5,dt*2);
    } else { b.spin*=Math.pow(0.72,dt); }
  }
  let perfNow=0;

  /* ---------- To‘pni olish / nazorat ---------- */
  function tryCapture(){
    const b=ballS; if(b.owner)return;
    const sp=Math.hypot(b.vx,b.vz);
    let best=null,bd=9;
    for(const p of players){
      if(p.off||p.state==="fall")continue;
      const d=dist(p.x,p.z,b.x,b.z);
      const reach=p.gk?1.5:0.85;
      if(d<reach&&b.y<(p.gk?2.3:1.3)){
        const ctl=10+p.attrs.dri*0.09;
        if(sp<ctl+(p.gk?12:0)){
          const score=d-(p.gk?-2:0);
          if(score<bd){bd=score;best=p;}
        }
      }
    }
    if(best){
      b.owner=best; b.lastTouch=best; b.lastTeam=best.team;
      /* penalti yechimi — darvozabon yoki hujumchi ushladi */
      if(pen.so&&pen.phase==="flown"){
        pen.so._res=false;state="so-wait";stateT=0;
        FA.Audio.aww();return;
      }
      if(pen.on&&!pen.so){
        if(best.gk&&best.team!==pen.shootTeam){notify("QAYTARILDI!","",1600);FA.Audio.aww();}
        pen.on=false;
        if(state==="penalty")state="play";
      }
      /* ofsayd tekshiruvi */
      if(passArmed>0&&offMarks.has(best.id)){
        whistleOffside(best); return;
      }
      passArmed=0;offMarks.clear();
      if(lastPasser&&lastPasser.team===best.team&&lastPasser!==best){
        stats.passOk[best.team]++;
        assistCandidate={passer:lastPasser,receiver:best};
      }
      if(best.gk&&Math.hypot(b.vx,b.vz)>6){stats.saves[best.team]++;comment("commSave");FA.Audio.catchSfx();}
      b.vx=0;b.vz=0;b.vy=0;
      autoSwitch();
    }
  }
  let assistCandidate=null;
  function whistleOffside(p){
    stats.off[p.team]++;
    notify("OFSAYD"); FA.Audio.whistle(); comment("commOffside");
    setPiece("freekick",p.team===0?1:0,{x:clamp(p.x,-GX+8,GX-8),z:clamp(p.z,-30,30)});
  }

  /* ---------- Zarba/pas funksiyalari ---------- */
  function kickBall(p,tx,tz,power,loft,curl){
    const b=ballS;
    b.owner=null;
    const dx=tx-b.x,dz=tz-b.z,d=Math.hypot(dx,dz)||1;
    const v=power;
    b.vx=dx/d*v; b.vz=dz/d*v;
    b.vy=v*Math.tan(loft);
    b.spin=curl||0;
    b.lastTouch=p;b.lastTeam=p.team;
    p.state="kick";p.stT=0;
    FA.Audio.kick(clamp(power/28,0.2,1));
    kickAnimT=0.3;
  }
  function laneBlocked(x1,z1,x2,z2,team,ignore){
    for(const p of players){
      if(p.off||p.team===team||p===ignore||p.gk)continue;
      /* kesmadan masofa */
      const dx=x2-x1,dz=z2-z1,L2=dx*dx+dz*dz||1;
      let t=((p.x-x1)*dx+(p.z-z1)*dz)/L2;t=clamp(t,0,1);
      if(dist(x1+dx*t,z1+dz*t,p.x,p.z)<1.1)return true;
    }
    return false;
  }
  function bestPassTarget(p,forceDir,longBall,through){
    let best=null,bs=-1;
    const t=teams[p.team],d=t.dir;
    for(const q of t.players){
      if(q===p||q.off)continue;
      const dd=dist(p.x,p.z,q.x,q.z);
      if(dd<3||dd>(longBall?55:32))continue;
      if(through&&((q.x-p.x)*d<6))continue;
      let s=8-Math.abs(dd-(longBall?34:12))*0.18;
      /* hujum yo‘nalishi bonus */
      s+=((q.x-p.x)*d)*0.14;
      s-=Math.abs(q.z-p.z)*0.05;
      if(laneBlocked(p.x,p.z,q.x,q.z,p.team,p))s-=6;
      if(offMarksActive(q,p))s-=8;
      if(s>bs){bs=s;best=q;}
    }
    return best;
  }
  function offMarksActive(q,p){
    /* ofsayd xavfi: raqib oxirgi 2 himoyachi ortida */
    const opp=teams[1-p.team],d=teams[p.team].dir;
    const defsX=opp.players.filter(x=>!x.off).map(x=>x.x).sort((a,b)=>d>0?b-a:a-b);
    const secondLast=defsX[1]??(d>0?-GX:GX);
    return (q.x*d)>(Math.max(secondLast*d,ballS.x*d))&&q.x*d>0;
  }
  function doPass(p,longBall,through){
    const b=ballS;if(b.owner!==p)return;
    let tgt=bestPassTarget(p,0,longBall,through);
    if(!tgt){ /* bo‘sh joyga uzun to‘p */
      const d=teams[p.team].dir;
      kickBall(p,p.x+d*38,clamp(p.z+rnd()*20-10,-30,30),longBall?24:16,longBall?0.38:0.12);
      stats.passes[p.team]++;lastPasser=p;passTarget=null;armOffside(p.team);
      return;
    }
    /* harakatdagi futbolchiga oldindan uzatish */
    const lead=through?0.9:0.5;
    const tx=tgt.x+tgt.vx*lead+teams[p.team].dir*(through?6:1.5);
    const tz=tgt.z+tgt.vz*lead;
    const dd=dist(p.x,p.z,tx,tz);
    kickBall(p,clamp(tx,-GX,GX),clamp(tz,-32,32),clamp(dd*0.95+7,9,longBall?28:22),longBall?0.35:0.1);
    stats.passes[p.team]++;
    lastPasser=p;passTarget=tgt;
    armOffside(p.team,tgt);
    if(longBall)FA.Audio.long();
  }
  function armOffside(team,tgt){
    offMarks.clear();passArmed=2.2;
    const t=teams[team],opp=teams[1-team],d=t.dir;
    const defsX=opp.players.filter(x=>!x.off).map(x=>x.x).sort((a,b)=>d>0?b-a:a-b);
    const secondLast=defsX[1]??0;
    for(const q of t.players){
      if(q===ballS.lastTouch)continue;
      if(q.x*d>Math.max(secondLast*d,ballS.x*d)&&q.x*d>0)offMarks.add(q.id);
    }
  }
  function doShoot(p,power,high,forcedLow){
    const b=ballS;if(b.owner!==p)return;
    const t=teams[p.team],d=t.dir;
    const gx=d>0?GX:-GX;
    /* darvozabondan uzoq burchakka */
    const gk=teams[1-p.team].players.find(x=>x.gk&&!x.off);
    let tz=0;
    if(gk)tz=(gk.z>0?-1:1)*2.6;
    /* aniqlik: masofa + bosim + atribut */
    const dd=dist(p.x,p.z,gx,0);
    const pressure=nearestOpp(p)<2?8:0;
    const err=(100-p.attrs.sho)*0.0016*dd+pressure*0.12+rnd()*0.9;
    tz+= (rnd()*2-1)*err*2.2;
    const loft=forcedLow?0.04:high?0.2:(0.1+rnd()*0.08);
    const v=15+power*16;
    kickBall(p,gx,clamp(tz,-4.4,4.4),v,loft,(rnd()-.5)*0.8);
    stats.shots[p.team]++;
    shotInfo={team:p.team,x:p.x,shooter:p};
    FA.Audio.crowdSet(0.8);
    if(dd>24)FA.Audio.speak(pick(["Uzoqdan zarba!","Zarba keldi!"]));
  }
  let shotInfo=null;
  function headerAttempt(p){
    /* havo to‘pi yaqinida zarba bosilganda */
    if(ballS.y>1.5&&dist(p.x,p.z,ballS.x,ballS.z)<1.6&&!ballS.owner){
      const t=teams[p.team],d=t.dir;
      const gx=d>0?GX:-GX;
      kickBall(p,gx,(rnd()*2-1)*3,13+rnd()*8,0.06+Math.random()*0.1,0);
      p.attrs._hdr=true;
      stats.shots[p.team]++;shotInfo={team:p.team,x:p.x,shooter:p};
    }
  }
  function doTackle(p,slide){
    const b=ballS;
    const opp=b.owner;
    if(!opp||opp.team===p.team)return;
    const dd=dist(p.x,p.z,opp.x,opp.z);
    if(slide){
      if(dd<2.4){p.state="slide";p.stT=0;p.face=ang(opp.x-p.x,opp.z-p.z);}
      return;
    }
    if(dd<1.6){
      const chance=0.34+p.attrs.def*0.0045-opp.attrs.dri*0.0035;
      if(rnd()<chance){
        winBall(p,opp);
        stats.passes;FA.Audio.kick(0.3);
      } else {
        p.state="fall";p.stT=0;
        if(rnd()<0.3)foul(p,opp);
      }
    }
  }
  function doSlide(p){doTackle(p,true);}
  function winBall(p,from){
    ballS.owner=p;ballS.lastTouch=p;ballS.lastTeam=p.team;
    from.vx*=-0.3;from.vz*=-0.3;
    p.stam=Math.max(0,p.stam-4);
    if(passArmed>0){passArmed=0;offMarks.clear();}
    autoSwitch();
  }
  function nearestOpp(p){
    let m=99;for(const q of players){if(q.off||q.team===p.team)continue;m=Math.min(m,dist(p.x,p.z,q.x,q.z));}return m;
  }
  function foul(p,victim){
    stats.fouls[p.team]++;
    FA.Audio.whistle();comment("commFoul");
    notify(UZ.foul);
    /* kartalar */
    const dd=dist(p.x,p.z,GX,0);
    if(rnd()<0.35||p.state==="slide"){
      p.yellow++;
      if(p.yellow>=2||rnd()<0.08){redCard(p);}
      else{stats.ys[p.team]++;comment("commCardSariq");FA.Audio.card();notify("🟨 "+UZ.yellowCard);}
    }
    /* jarima maydonchasida penalti */
    const t=teams[p.team],inOwnBox=(t.dir>0? p.x<-GX+16.5 : p.x>GX-16.5)&&Math.abs(p.z)<20;
    if(inOwnBox){ startPenalty(1-p.team); }
    else setPiece("freekick",1-p.team,{x:clamp(victim.x,-GX+8,GX-8),z:clamp(victim.z,-30,30)});
    /* jarohat animatsiyasi (kam hollarda) */
    if(rnd()<0.12){victim.state="fall";victim.stT=0;setTimeout(()=>notify(UZ.injury, "", 1200),700);}
  }
  function redCard(p){
    stats.rs[p.team]++;p.off=true;p.yellow=2;
    comment("commCardQizil");FA.Audio.card();
    notify("🟥 "+UZ.redCard);
    if(p.mesh)p.mesh.visible=false;
  }

  /* ---------- Almashtirish / avtomatik tanlash ---------- */
  function doSwitch(force){
    const side=friendBoth?(ballS.owner?ballS.owner.team:(ballS.lastTeam>=0?ballS.lastTeam:0)):(o.userSide==="home"?0:1);
    let cands=players.filter(p=>!p.off&&p.team===side&&!p.gk);
    if(!cands.length)return;
    cands.sort((a,b)=>dist(a.x,a.z,ballS.x,ballS.z)-dist(b.x,b.z,ballS.x,ballS.z));
    let idx=controlled?cands.indexOf(controlled):-1;
    controlled=cands[(idx+1)%cands.length];
    if(force)controlled=cands[0];
    FA.Audio.ui();
  }
  function autoSwitch(){
    if(!ballS.owner){updateBtns();return;}
    const side=friendBoth?ballS.owner.team:(o.userSide==="home"?0:1);
    if(ballS.owner.team===side&&!ballS.owner.gk)controlled=ballS.owner;
    else if(ballS.owner.team!==side)doSwitch(true);
    updateBtns();
  }

  /* ---------- Darvozabon AI ---------- */
  function gkAI(gk,dt){
    const t=teams[gk.team],d=t.dir;
    const gx=-d*GX; /* o‘z darvozasi */
    let tx=gx+d*clamp(dist(gk.x,gk.z,ballS.x,ballS.z)*0.12,0.6,5);
    let tz=clamp(ballS.z*0.42,-3.4,3.4);
    const b=ballS,toUs=(b.vx*(gx-b.x))>4&&!b.owner;
    let tReach=99;
    if(toUs){
      /* kesishish nuqtasi */
      tReach=(gx+d*1-b.x)/(b.vx||0.001);
      if(tReach>0&&tReach<1.6){
        const zAt=b.z+b.vz*tReach, yAt=b.y+b.vy*tReach-4.9*tReach*tReach;
        tz=clamp(zAt,-4.6,4.6);
        gk.aiSprint=true;
        /* qutqarish tekshiruvi */
        if(Math.abs(gx+d*0.7-b.x)<1.6&&Math.abs(gk.z-zAt)<1.5&&yAt<2.5){
          const sp=Math.hypot(b.vx,b.vz);
          stats.saves[gk.team]++;
          if(sp<11&&yAt<1.7){ /* ushlash */
            b.owner=gk;b.lastTouch=gk;b.lastTeam=gk.team;b.vx=0;b.vy=0;b.vz=0;
            FA.Audio.catchSfx();comment("commSave");
          } else { /* qaytarish */
            b.vx=-b.vx*0.4+rnd()*3;b.vz=(rnd()*2-1)*8;b.vy=Math.abs(b.vy)*0.4+2;
            gk.state="dive";gk.stT=0;gk.diveA=ang(0,zAt-gk.z);gk.diveDir=Math.sign(zAt-gk.z)||1;
            FA.Audio.catchSfx();comment("commSave");FA.Audio.aww();
          }
        }
      }
    } else gk.aiSprint=false;
    if(toUs&&tReach<0.5&&Math.abs(ballS.z-gk.z)>2.4){
      /* tez sho‘ng‘ish */
      gk.state="dive";gk.stT=0;gk.diveDir=Math.sign(ballS.z-gk.z)||1;gk.diveA=ang(0,ballS.z-gk.z);
    }
    gk.aiTarget={x:tx,z:tz};
  }

  /* ---------- Jamoa AI ---------- */
  let aiTick=0;
  function teamAI(dt){
    aiTick-=dt;
    const b=ballS;
    for(const t of teams){
      const userT=isUserTeam(t.i)&&!o.net; /* AI jamoada ham zaxira AI */
      const press=pressHold&&controlled&&controlled.team===t.i?3:(t.pressing);
      /* eng yaqin 2-3 ta to‘pni ta'qib qiladi */
      const chasers=t.players.filter(p=>!p.off&&!p.gk)
        .sort((a,c)=>dist(a.x,a.z,b.x,b.z)-dist(c.x,c.z,b.x,b.z));
      chasers.forEach((p,i)=>{
        if(b.owner&&b.owner.team===t.i){
          /* hujum: to‘p egasi AI boshqaruvi */
          if(p===b.owner&&!userControls(p)){
            if(aiTick<=0)aiDecide(p);
          }
          p.aiTarget=supportRun(p,i);
          p.aiSprint=false;
        } else if(b.owner){
          /* himoya */
          if(i<1+press){p.aiTarget={x:b.owner.x,z:b.owner.z};p.aiSprint=true;
            if(!userControls(p)&&i===0&&dist(p.x,p.z,b.owner.x,b.owner.z)<1.7&&rnd()<dt*1.4){
              doTackle(p,false);
            }
            if(!userControls(p)&&i===1&&dist(p.x,p.z,b.owner.x,b.owner.z)<2.6&&rnd()<dt*0.5){
              doTackle(p,true);
            }
          }
          else {p.aiTarget=homePos(p);p.aiSprint=false;}
        } else {
          /* erkin to‘p */
          if(i<2){p.aiTarget={x:b.x+b.vx*0.3,z:b.z+b.vz*0.3};p.aiSprint=true;}
          else {p.aiTarget=homePos(p);p.aiSprint=false;}
        }
      });
      const gk=t.players.find(p=>p.gk);if(gk&&!gk.off)gkAI(gk,dt);
    }
    if(aiTick<=0)aiTick=0.32;
  }
  function userControls(p){
    return p===controlled&&isUserTeam(p.team);
  }
  function supportRun(p,i){
    const t=teams[p.team],d=t.dir,h=homePos(p);
    if(p.role==="FW")return {x:clamp(h.x+d*8,-GX+2,GX-3),z:h.z};
    if(p.role==="MF"&&i<3)return {x:clamp(h.x+d*6,-GX+4,GX-4),z:h.z+((i%2)?4:-4)};
    return h;
  }
  function aiDecide(p){
    const t=teams[p.team],d=t.dir;
    const gx=d*GX;
    const dd=dist(p.x,p.z,gx,0);
    const noise=[0.5,0.3,0.18,0.1][o.difficulty]||0.3;
    const press=nearestOpp(p);
    /* Variantlar ballari */
    let shoot=dd<24?(24-dd)*0.14+(Math.abs(p.z)<14?0.6:0):0;
    if(laneBlocked(p.x,p.z,gx,0,p.team,null))shoot*=0.25;
    const tp=bestPassTarget(p,0,false,true);
    let through=tp?((tp.x-p.x)*d>8?1.3:0.3):0;
    const sp=bestPassTarget(p,0,false,false);
    let pass=sp?0.9:0;
    if(laneBlocked(p.x,p.z,sp?sp.x:0,sp?sp.z:0,p.team,p))pass*=0.3;
    let dribble=press>3?1.1:0.6;
    let clear=0;
    if((p.x*(-d))>GX-22&&press<2.5)clear=2.2;
    const opts=[["shoot",shoot],["through",through],["pass",pass],["dribble",dribble],["clear",clear]];
    for(const o2 of opts)o2[1]+=rnd()*noise*4;
    opts.sort((a,b)=>b[1]-a[1]);
    const act=opts[0][0];
    if(act==="shoot")doShoot(p,0.65+rnd()*0.3);
    else if(act==="through")doPass(p,false,true);
    else if(act==="pass")doPass(p,false,false);
    else if(act==="clear")doPass(p,true);
    else { /* dribble: oldinga */
      p.aiTarget={x:clamp(p.x+d*7,-GX+1,GX-1),z:clamp(p.z+(rnd()*10-5),-31,31)};
    }
  }

  /* ---------- Qoidalar: gol / aut / burchak ---------- */
  function checkBoundaries(){
    const b=ballS;
    if(state!=="play"&&state!=="penalty"&&state!=="shootout")return;
    /* aut (o‘yinda) */
    if(state==="play"&&Math.abs(b.z)>H/2+BR){
      const throwTeam=b.lastTeam===0?1:0;
      setPiece("throwin",throwTeam,{x:clamp(b.x,-GX+2,GX-2),z:Math.sign(b.z)*(H/2-0.3)});
      return;
    }
    /* gol */
    if(Math.abs(b.x)>GX+BR){
      const goalTeam=b.x>0?(teams[0].dir>0?0:1):(teams[0].dir>0?1:0);
      /* avval gol tekshiriladi */
      if(Math.abs(b.z)<GZW&&b.y<GZH&&Math.abs(b.x)<GX+1.2){
        goalScored(goalTeam);
        return;
      }
      if(pen.so&&pen.phase==="flown"){ /* seriya zarbasi o‘tdi */
        pen.so._res=false;state="so-wait";stateT=0;
        notify("O‘TDI!","",1400);FA.Audio.aww();return;
      }
      if(pen.on&&!pen.so){ /* penalti o'tdi */
        pen.on=false;
        if(state==="penalty")state="play";
        notify("O‘TDI!","",1500);FA.Audio.aww();
        setPiece("goalkick",1-goalTeam,{x:Math.sign(b.x)*(GX-5),z:0});
        return;
      }
      /* burchak yoki darvoza to‘pi */
      if(b.lastTeam===goalTeam){
        /* hujumchi tegdi → darvoza to‘pi */
        setPiece("goalkick",1-goalTeam,{x:Math.sign(b.x)*(GX-5),z:0});
      } else {
        stats.corners[1-goalTeam]++;
        setPiece("corner",1-goalTeam,{x:Math.sign(b.x)*(GX-0.3),z:Math.sign(b.z||1)*(H/2-0.3)});
      }
      return;
    }
  }
  function goalScored(ti){
    if(pen.so){ /* penaltilar seriyasi — hisobga alohida */
      notify("GOL!","",1500);FA.Audio.cheer();FA.Audio.net();
      try{if(FA.Meta.settings&&FA.Meta.settings.vibration&&navigator.vibrate)navigator.vibrate(70);}catch(e){}
      pen.so._res=true;state="so-wait";stateT=0;
      ballS.vx=0;ballS.vy=0;ballS.vz=0;ballS.owner=null;
      return;
    }
    score[ti]++;
    lastGoalTeam=ti;
    if(pen.on&&!pen.so)pen.on=false;
    stats.onT[ti]++;
    const scorer=ballS.lastTouch&&ballS.lastTouch.team===ti?ballS.lastTouch:null;
    stats.scorers[ti].push({name:scorer?scorer.name:"—",min:dispMin()});
    if(scorer){scorer.state="celebrate";scorer.stT=0;}
    if(assistCandidate&&assistCandidate.passer.team===ti&&scorer&&assistCandidate.receiver===scorer){
      /* assist statistikasi meta darajasida */
    }
    updateScoreUI();
    notify("GOOOL!",(scorer?scorer.name.toUpperCase()+"  ":"")+dispMin()+"'",2500);
    comment("commGoal");FA.Audio.cheer();FA.Audio.net();
    try{if(FA.Meta.settings&&FA.Meta.settings.vibration&&navigator.vibrate)navigator.vibrate(ti===(o.userSide==="home"?0:1)?90:40);}catch(e){}
    engine.crowdCelebrate(true);
    shotInfo=null;assistCandidate=null;passArmed=0;offMarks.clear();
    state="goal";stateT=0;
    ballS.owner=null;ballS.vx=0;ballS.vy=0;ballS.vz=0;
  }

  /* ---------- Set-pieces ---------- */
  function setPiece(kind,team,pos){
    state="setpiece";stateT=0;
    pen.kind=kind;pen.team=team;pen.pos=pos;
    ballS.x=pos.x;ballS.z=pos.z;ballS.y=kind==="throwin"?1.8:BR;
    ballS.vx=0;ballS.vy=0;ballS.vz=0;ballS.owner=null;
    /* to‘pni o‘ynaydigan eng yaqin futbolchi */
    const t=teams[team];
    let taker=t.players.filter(p=>!p.off&&!p.gk).sort((a,b)=>dist(a.x,a.z,pos.x,pos.z)-dist(b.x,b.z,pos.x,pos.z))[0];
    pen.taker=taker;
    if(kind==="goalkick")taker=t.players.find(p=>p.gk);
    if(taker){taker.x=pos.x-teams[team].dir*1;taker.z=pos.z;ballS.lastTouch=taker;ballS.lastTeam=team;}
    notify(kind==="throwin"?UZ.throwIn:kind==="corner"?UZ.cornerKick:kind==="goalkick"?UZ.goalKick:UZ.freeKick);
    /* boshqaruvni to‘p oluvchiga */
    if(isUserTeam(team)&&taker)controlled=taker;
  }
  function execSetPiece(dt){
    stateT+=dt;
    const k=pen.kind,t=teams[pen.team],p=pen.taker;
    if(!p){state="play";return;}
    /* 1.2s dan keyin bajariladi (AI) yoki darhol (foydalanuvchi tugmasi) */
    const user=isUserTeam(pen.team)&&!o.net;
    if(stateT>1.4&&!user){ aiExecSetPiece(); }
    else if(stateT>3.5){ aiExecSetPiece(); }
  }
  function aiExecSetPiece(){
    const p=pen.taker,k=pen.kind,t=teams[pen.team],d=t.dir;
    if(k==="corner"){
      const tz=(rnd()*2-1)*7;
      kickBall(p,d*GX- d*9,tz,19,0.42,(rnd()-.5)*1.2);
      comment("commCorner");
    } else if(k==="freekick"){
      const gx=d*GX,dd=dist(p.x,p.z,gx,0);
      if(dd<28&&Math.abs(p.z)<18&&rnd()<0.6){doShoot(p,0.85,true);}
      else doPass(p,dd>30);
    } else if(k==="goalkick"){ doPass(p,true); }
    else { doPass(p,false); }
    state="play";
    updateBtns();
  }
  function userSetPiece(btn){
    const p=pen.taker;if(!p)return;
    if(btn==="shoot"){doShoot(p,0.9,true);}
    else if(btn==="long"||btn==="pass"&&pen.kind==="corner"){aiExecSetPiece();return;}
    else doPass(p,btn==="long");
    state="play";updateBtns();
  }

  /* ---------- Penalti (o‘yinda) ---------- */
  function startPenalty(team){
    pen.on=true;pen.shootTeam=team;pen.phase="aim";pen.aim={x:0,z:0};pen.power=0;pen.dirT=0;
    state="penalty";
    const d=teams[team].dir, spot={x:d*(GX-11),z:0};
    ballS.x=spot.x;ballS.z=spot.z;ballS.y=BR;ballS.vx=0;ballS.vy=0;ballS.vz=0;ballS.owner=null;
    const t=teams[team];
    const taker=t.players.filter(p=>!p.off&&!p.gk).sort((a,b)=>b.attrs.pen-a.attrs.pen)[0]||t.players[10];
    pen.taker=taker;taker.x=spot.x-d*4;taker.z=0.5;
    const gk=teams[1-team].players.find(p=>p.gk);
    if(gk){gk.x=d*GX-d*0.5;gk.z=0;}
    comment("commPenalty");notify(UZ.penaltyKick,"",1800);FA.Audio.whistle();
    pen.isMatchPen=true;
    /* futbolchilarni to‘xtatish */
    for(const q of players){if(q!==taker&&!(q.gk&&q.team!==team)){q.aiTarget={x:clamp((q.x-spot.x)*0.6+spot.x-d*20,-GX,GX),z:q.z};}}
  }
  function penButton(name){
    if(pen.phase==="aim"&&name==="shoot"){
      /* kuch o‘sib boradi, yana bosilsa — uriladi */
      if(!pen.charging){pen.charging=true;pen.power=0;}
      else{pen.charging=false;penKick();}
    }
  }
  function penUpdate(dt){
    const d=teams[pen.shootTeam].dir;
    /* mo‘ljal — foydalanuvchi joystick bilan nishon oladi */
    if(!pen.so||pen.so.userTurn){
      if(pen.phase==="aim"&&!pen.charging){
        pen.aim.z=clamp((o.camera==="dynamic"?-input.mx:input.mx)*3.4,-3.4,3.4);
      }
      elStam&&(elStam.style.width=(pen.charging?pen.power*100:0)+"%");
    }
    if(pen.charging){pen.power=Math.min(1,pen.power+dt*0.9);}
    if(pen.phase==="flown"){
      pen.dirT+=dt;
      if(pen.dirT>2.2&&!pen.so){ /* o‘yindagi penalti — davom etish */
        pen.on=false;pen.phase="aim";pen.charging=false;
        state="play";
      }
    }
    /* seriya natijasi so-wait holatida soResult orqali keladi */
  }
  function penKick(){
    const p=pen.taker,d=teams[pen.shootTeam].dir;
    const acc=p.attrs.pen*0.01;
    const tx=clamp(pen.aim.z*(0.5+acc*0.5),-3.4,3.4);
    const pw=14+pen.power*15;
    kickBall(p,d*GX,tx+(rnd()*2-1)*(1.3-acc),pw,0.06+pen.power*0.1,0);
    pen.phase="flown";pen.dirT=0;
    const gk=teams[1-pen.shootTeam].players.find(x=>x.gk);
    if(gk){
      const guess=rnd()<0.35?Math.sign(tx||rnd()-0.5):(rnd()<0.5?-1:1);
      gk.state="dive";gk.stT=0;gk.diveDir=guess;
      gk.diveA=ang(0,guess*3);
      /* darvozabon taxmini to‘g‘ri bo‘lsa — qutqarish imkoniyati */
      if(guess===Math.sign(tx||0)&&rnd()<0.45+pen.power*0.2){
        setTimeout(()=>{if(ballS.owner===null&&Math.abs(ballS.x)>GX-2){
          ballS.vx=-Math.abs(ballS.vx)*0.5;ballS.vz=(rnd()*2-1)*6;ballS.x=d*(GX-1.2);
          stats.saves[gk.team]++;comment("commSave");FA.Audio.catchSfx();FA.Audio.aww();
        }},260);
      }
    }
  }

  /* ---------- Penaltilar seriyasi (alohida rejim / durrang) ---------- */
  function startShootout(){
    pen.on=false;pen.so={round:0,turn:0,shots:[0,0],taken:[[],[]]};
    state="shootout";
    nextSoKick();
  }
  function nextSoKick(){
    const team=pen.so.turn;
    pen.so.userTurn = isUserTeam(team)&&!o.net;
    pen.so._res=null;
    pen.shootTeam=team;pen.phase="aim";pen.charging=false;pen.power=0;pen.aim={x:0,z:0};
    const d=teams[team].dir, spot={x:d*(GX-11),z:0};
    ballS.x=spot.x;ballS.z=spot.z;ballS.y=BR;ballS.vx=0;ballS.vy=0;ballS.vz=0;ballS.owner=null;
    const t=teams[team];
    const alive=t.players.filter(p=>!p.off&&!p.gk);
    const taker=alive[pen.so.taken[team].length%alive.length]||t.players[10];
    pen.taker=taker;taker.x=spot.x-d*4;taker.z=0.4;taker.face=ang(d,0);
    const gk=teams[1-team].players.find(p=>p.gk);
    if(gk){gk.x=d*(GX-0.5);gk.z=0;gk.state="gkidle";}
    /* hamma joyida turadi */
    for(const q of players)if(q!==taker&&q!==gk)q.aiTarget={x:q.x,z:q.z};
    state="shootout";
    if(!pen.so.userTurn){setTimeout(()=>{if(state==="shootout"&&pen.phase==="aim"){pen.power=0.6+rnd()*0.35;pen.aim={x:0,z:(rnd()*2-1)*3};penKick();}},1400);}
    else notify("PENALTI","Siz urasiz — mo‘ljal oling va ZARBA bosing",2000);
  }
  function soResult(scored){
    const so=pen.so,team=so.turn;
    pen.phase="wait";
    so.taken[team].push(scored);
    if(scored)so.shots[team]++;
    notify(scored?"GOL!":"O‘TDI!","",1400);
    if(scored){FA.Audio.cheer();}else{FA.Audio.aww();}
    /* g‘olib aniqlash */
    const a=so.shots[0],b=so.shots[1],na=so.taken[0].length,nb=so.taken[1].length;
    if(na>=3&&nb>=3&&na===nb&&a!==b){finishShootout(a>b?0:1);return;}
    if(na<=5||nb<=5){
      const rem=t=>Math.max(0,5-so.taken[t].length);
      if(a>b+rem(1)){finishShootout(0);return;}
      if(b>a+rem(0)){finishShootout(1);return;}
    }
    so.turn=1-so.turn;
    setTimeout(nextSoKick,1200);
  }
  function finishShootout(winner){
    pen.so.winner=winner;
    notify(winner===(o.userSide==="home"?0:1)?UZ.victory:UZ.defeat,UZ.penalties,2200);
    setTimeout(()=>endMatch(),1600);
  }
  function scoredCheck(){
    return false;
  }

  /* ---------- Vaqt / bo‘limlar ---------- */
  function dispMin(){
    const frac=clamp(tHalf/halfSec,0,1);
    return Math.min(45,Math.floor(frac*45)+1);
  }
  function updateClockUI(){
    const frac=clamp(tHalf/halfSec,0,1);
    const mins=Math.floor(frac*45),secs=Math.floor((frac*45-mins)*60);
    elTime.textContent=String(mins).padStart(2,"0")+":"+String(secs).padStart(2,"0");
    elHalf.textContent=half===1?UZ.firstHalf:UZ.secondHalf+(added?"+":"");
  }
  function updateScoreUI(){
    elScore.textContent=score[0]+" : "+score[1];
    engine.updateScoreboard(score[0]+" - "+score[1],
      elTime?elTime.textContent:"00:00",
      (o.home.short||"H")+" vs "+(o.away.short||"A"));
  }

  /* ---------- Asosiy sikl ---------- */
  function tick(dt){
    perfNow+=dt;
    if(paused||ended){renderOnly(dt);return;}
    if(o.net&&o.net.role==="guest"){guestTick(dt);return;}
    if(pen.on||pen.so){penUpdate(dt);}
    if(state==="play"||state==="setpiece"||state==="penalty"||state==="shootout"||state==="so-wait"){
      if(state==="play")tHalf+=dt;
      /* to‘p egasi to‘g‘risida e'lon */
      if(ballS.owner)stats.poss[ballS.owner.team]+=dt;else if(ballS.lastTeam>=0)stats.poss[ballS.lastTeam]+=dt*0.5;
      if(passArmed>0)passArmed-=dt;
      if(state!=="shootout"&&state!=="so-wait")teamAI(dt);
      if(state==="setpiece")execSetPiece(dt);
      for(const p of players)movePlayer(p,dt);
      if(state!=="so-wait")ballPhys(dt);
      if(state==="play"||state==="penalty"||state==="shootout"){tryCapture();checkBoundaries();}
      /* zarba ustunga */
      if(shotInfo&&Math.abs(ballS.x)>GX-0.3&&Math.abs(ballS.z)<GZW+0.4&&ballS.y<GZH+0.3&&!ballS.owner){
        if(Math.abs(ballS.z)>GZW-0.15||ballS.y>GZH-0.12){FA.Audio.post();comment("commPost");shotInfo=null;}
      }
      /* penaltilar seriyasi — natijani kutish */
      if(state==="so-wait"){
        stateT+=dt;
        if(stateT>1.3){
          const r=!!pen.so._res;
          state="so-pause"; /* soResult bir marta chaqiriladi */
          soResult(r);
        }
      }
    }
    else if(state==="goal"){
      stateT+=dt;
      for(const p of players)if(p.state!=="celebrate")movePlayer(p,dt*0.3);
      if(stateT>2.6){
        engine.crowdCelebrate(false);
        kickoffPositions(1-lastGoalTeam);
        state="kickoff";stateT=0;
      }
    }
    else if(state==="kickoff"){
      stateT+=dt;
      if(stateT>0.8){state="play";FA.Audio.whistle("start");if(half===1&&tHalf<0.1)comment("commKickoff");}
    }
    else if(state==="halftime"){
      stateT+=dt;
      if(stateT>1.6){
        half=2;tHalf=0;
        playDir=[playDir[1],playDir[0]];
        for(const t of teams){t.dir*=-1;}
        kickoffPositions(1);
        state="kickoff";stateT=0;
        updateClockUI();
      }
    }
    /* bo‘lim oxiri */
    if(state==="play"&&tHalf>=halfSec){
      if(half===1){notify(UZ.halfTime);comment("commHalf");FA.Audio.whistle("end");state="halftime";stateT=0;}
      else{
        if(o.needWinner&&score[0]===score[1]){startShootout();}
        else endMatch();
      }
    }
    /* HUD */
    updateClockUI();
    const c=controlledOf();
    if(c)elSt.style.width=c.stam+"%";
    drawRadar();
    if(o.net&&o.net.role==="host"){
      netState.snapT-=dt;
      if(netState.snapT<=0){netState.snapT=0.07;o.net.sendState(snapshot());}
    }
  }
  let lastGoalTeam=0;
  function renderOnly(dt){drawRadar();}
  function guestTick(dt){
    /* Mezbon holatini qo‘llash */
    const snap=netState.lastSnap;
    if(snap){
      applySnapshot(snap);
      netState.lastSnap=null;
    }
    drawRadar();
  }
  function snapshot(){
    const ps=players.map(p=>[+p.x.toFixed(2),+p.z.toFixed(2),+p.face.toFixed(2),p.state==="kick"?1:p.state==="slide"?2:p.state==="fall"?3:p.state==="celebrate"?4:p.state==="dive"?5:0,+(Math.hypot(p.vx,p.vz)).toFixed(1)]);
    return {s:score,t:+tHalf.toFixed(2),h:half,st:state,b:[+ballS.x.toFixed(2),+ballS.y.toFixed(2),+ballS.z.toFixed(2)],o:ballS.owner?ballS.owner.id:-1,ps};
  }
  function applySnapshot(s){
    score=s.s;half=s.h;tHalf=s.t;
    state=s.st==="setpiece"?"play":s.st;
    for(let i=0;i<players.length;i++){
      const p=players[i],d=s.ps[i];
      if(!d)continue;
      p.x=d[0];p.z=d[1];p.face=d[2];
      const stMap=["run","kick","slide","fall","celebrate","dive"];
      const st=stMap[d[3]]||"run";
      if(st!==p.state){p.state=st;p.stT=0;}
      p.speed=d[4];
    }
    ballS.x=s.b[0];ballS.y=s.b[1];ballS.z=s.b[2];ballS.owner=s.o>=0?players.find(p=>p.id===s.o):null;
    updateScoreUI();updateClockUI();
    if(s.st==="goal"&&!elNotif.classList.contains("hidden")){}
  }

  /* ---------- Radar ---------- */
  function drawRadar(){
    if(!radarCtx)return;
    const g=radarCtx,wpx=elRadar.width,hpx=elRadar.height;
    g.clearRect(0,0,wpx,hpx);
    g.strokeStyle="rgba(255,255,255,.35)";g.strokeRect(4,4,wpx-8,hpx-8);
    g.beginPath();g.moveTo(wpx/2,4);g.lineTo(wpx/2,hpx-4);g.stroke();
    const mx=x=>wpx/2+x/GX*(wpx/2-6), mz=z=>hpx/2+z/(H/2)*(hpx/2-6);
    for(const p of players){
      if(p.off)continue;
      g.fillStyle=p.team===0?"#00e676":"#ff7043";
      if(p.gk)g.fillStyle=p.team===0?"#b388ff":"#ffd54f";
      g.beginPath();g.arc(mx(p.x),mz(p.z),p===controlled?3.4:2.2,0,7);g.fill();
    }
    g.fillStyle="#fff";g.beginPath();g.arc(mx(ballS.x),mz(ballS.z),2,0,7);g.fill();
  }

  /* ---------- Tugmalar (kontekst) ---------- */
  const BTN_ATK=[["pass",UZ.btnPass,"main"],["shoot",UZ.btnShoot,"main2"],["long",UZ.btnLong,"mid"],["through",UZ.btnThrough,"mid2"],["sprint",UZ.btnSprint,"small"]];
  const BTN_DEF=[["tackle",UZ.btnTackle,"main"],["slide",UZ.btnSlide,"main2"],["switch",UZ.btnSwitch,"mid"],["press",UZ.btnPress,"mid2"],["sprint",UZ.btnSprint,"small"]];
  function updateBtns(){
    const c=controlledOf();
    const atk=c&&ballS.owner&&ballS.owner.team===c.team;
    const set=state==="setpiece"?BTN_ATK:(atk?BTN_ATK:BTN_DEF);
    elBtns.innerHTML="";
    const pos={main:[8,58],main2:[78,66],mid:[16,4],mid2:[84,6],small:[86,66]};
    const P={main:{l:"6px",b:"10px",s:"b-main"},main2:{r:"6px",b:"64px",s:"b-main"},mid:{r:"82px",b:"10px",s:"b-mid"},mid2:{l:"66px",b:"66px",s:"b-mid"},small:{r:"76px",b:"142px",s:"b-small"}};
    set.forEach((b,i)=>{
      const el=document.createElement("button");
      el.className="abtn "+P[b[2]].s;
      el.style.left=P[b[2]].l||"";el.style.right=P[b[2]].r||"";
      el.style.bottom=P[b[2]].b;
      el.innerHTML=`<span class="ab-l">${b[1]}</span>`;
      el.dataset.btn=b[0];
      if((b[0]==="sprint"&&sprintHold)||(b[0]==="press"&&pressHold))el.classList.add("on");
      el.addEventListener("pointerdown",e=>{e.preventDefault();onButton(b[0]);},{passive:false});
      elBtns.appendChild(el);
    });
  }

  /* ---------- Klaviatura (test uchun) ---------- */
  function bindKeys(){
    const map={KeyJ:"pass",KeyK:"shoot",KeyL:"long",KeyU:"through",Space:"switch",KeyO:"tackle",KeyI:"slide",KeyP:"press"};
    addEventListener("keydown",e=>{
      if(e.code==="ShiftLeft"){sprintHold=true;updateBtns();}
      const b=map[e.code];if(b){onButton(b);updateBtns();}
      if(e.code==="KeyW"||e.code==="ArrowUp")setMove(input.mx,-1);
      if(e.code==="KeyS"||e.code==="ArrowDown")setMove(input.mx,1);
      if(e.code==="KeyA"||e.code==="ArrowLeft")setMove(-1,input.mz);
      if(e.code==="KeyD"||e.code==="ArrowRight")setMove(1,input.mz);
    });
    addEventListener("keyup",e=>{
      if(e.code==="ShiftLeft"){sprintHold=false;updateBtns();}
      if(["KeyW","ArrowUp","KeyS","ArrowDown"].includes(e.code))setMove(input.mx,0);
      if(["KeyA","ArrowLeft","KeyD","ArrowRight"].includes(e.code))setMove(0,input.mz);
    });
  }

  /* ---------- Loop ---------- */
  function loop(t){
    rafId=requestAnimationFrame(loop);
    const now=t/1000;
    let dt=Math.min(0.05,now-lastT);lastT=now;
    if(paused||ended){engine.render(t);return;}
    acc+=dt;
    let n=0;
    while(acc>=DT&&n<4){tick(DT);acc-=DT;n++;}
    /* vizual */
    for(const p of players){
      if(!p.mesh)continue;
      p.mesh.position.set(p.x,0,p.z);
      p.mesh.rotation.y=-p.face+Math.PI/2;
      engine.posePlayer(p.mesh,dt,{state:p.state,speed:Math.hypot(p.vx,p.vz),diveDir:p.diveDir});
    }
    ballMesh.position.set(ballS.x,ballS.y,ballS.z);
    ballMesh.rotation.x+=ballS.vx*dt*2;ballMesh.rotation.z-=ballS.vz*dt*2;
    /* kamera */
    let camMode=o.camera;
    if(state==="penalty"||state==="shootout")camMode="penalty";
    if(state==="goal"&&ballS.lastTouch){camMode="goal";}
    camUpdate(camMode,dt);
    engine.render(t);
  }
  function camUpdate(mode,dt){
    if(mode==="penalty"){
      const d=teams[pen.shootTeam].dir;
      const tx=ballS.x-d*11,tz=ballS.z+(ballS.z>0?6:-6)*0.6;
      engine.updateCamera("broadcast",{x:ballS.x-d*6,z:ballS.z},dt,d);
      return;
    }
    if(mode==="goal"){
      engine.updateCamera("broadcast",{x:ballS.lastTouch.x,z:ballS.lastTouch.z},dt,1);
      return;
    }
    engine.updateCamera(o.camera==="dynamic"?"dynamic":"broadcast",ballS,dt,controlled?teams[controlled.team].dir:1);
  }

  /* ---------- Pauza/tugatish ---------- */
  function pause(){paused=true;}
  function resume(){paused=false;lastT=performance.now()/1000;}
  function endMatch(){
    if(ended)return;ended=true;
    FA.Audio.whistle("end");
    comment(score[0]===score[1]?"commEnd":(score[myIdx()]>score[1-myIdx()]?"commWin":"commLose"));
    const myI=myIdx();
    const res={
      my:pen.so?(pen.so.winner===myI?1:0):score[myI],
      opp:pen.so?(pen.so.winner===1-myI?1:0):score[1-myI],
      shootout:pen.so?{my:pen.so.shots[myI],opp:pen.so.shots[1-myI],winner:pen.so.winner}:null,
      score:[...score],
      stats:buildEndStats(myI)
    };
    setTimeout(()=>{if(o.onEnd)o.onEnd(res);},600);
  }
  function myIdx(){return o.userSide==="away"?1:0;}
  function buildEndStats(myI){
    const tot=stats.poss[0]+stats.poss[1]||1;
    return {
      possession:[Math.round(stats.poss[0]/tot*100),Math.round(stats.poss[1]/tot*100)],
      shots:stats.shots, onTarget:stats.onT, goals:stats.scorers,
      passes:stats.passes, passOk:stats.passOk,
      fouls:stats.fouls,ys:stats.ys,rs:stats.rs,off:stats.off,corners:stats.corners,saves:stats.saves,
      my:{goals:score[myI],assists:0,shots:stats.shots[myI],passOk:stats.passOk[myI],tackles:0,penGoals:0,corners:stats.corners[myI],cleanSheet:score[1-myI]===0}
    };
  }

  /* ---------- Ochish / yopish ---------- */
  function start(){
    makeTeams();
    buildScene();
    players=[...teams[0].players,...teams[1].players];
    kickoffPositions(rnd()<0.5?0:1);
    controlled=teams[o.userSide==="home"?0:1].players.find(p=>!p.gk);
    updateBtns();updateScoreUI();
    FA.Audio.ensure();FA.Audio.crowdSet(0.4);
    bindKeys();
    if(o.net&&o.net.role==="guest"){/* guest: faqat ko‘rsatish */}
    if(o.mode==="penalties"){startShootout();}
    else{notify("O‘YIN BOSHLANDI",o.home.short+" — "+o.away.short,1800);comment("commKickoff");}
    lastT=performance.now()/1000;
    rafId=requestAnimationFrame(loop);
  }
  function dispose(){
    cancelAnimationFrame(rafId);
    try{engine.dispose();}catch(e){}
  }

  /* Penalti rejimi uchun umumiy gauge UI (aim ko‘rsatkichi) */
  function penOverlay(g){
    if(!pen.charging)return;
    g.save();
    /* ekran pastida quvvat chizig‘i — HUD stamina joyida */
    g.restore();
  }

  let netGuestCtl=null; /* mehmon boshqarayotgan o‘yinchi (mezbon tomonda) */
  function onGuestInput(d){
    /* Mehmon kiritishi — uning jamoasidagi eng mos o‘yinchiga ta'sir qiladi */
    const gsid=1; /* mezbon uy jamoa, mehmon safar */
    let g=(d.id!==undefined&&d.id!==null)?players.find(p=>p.id===d.id&&!p.off):null;
    if(!g)g=(ballS.owner&&ballS.owner.team===gsid&&!ballS.owner.gk)?ballS.owner:
      players.filter(p=>!p.off&&p.team===gsid&&!p.gk)
        .sort((a,b)=>dist(a.x,a.z,ballS.x,ballS.z)-dist(b.x,b.z,ballS.x,ballS.z))[0];
    if(!g)return;
    netGuestCtl=g;
    if(d.btn){
      if(d.btn==="pass"){ballS.owner===g?doPass(g,false):doTackle(g,false);}
      else if(d.btn==="shoot"){ballS.owner===g?doShoot(g,0.8):doSlide(g);}
      else if(d.btn==="long"){ballS.owner===g?doPass(g,true):doSwitch();}
      else if(d.btn==="through"){ballS.owner===g?doPass(g,false,true):doSwitch();}
    }
    if(d.mx!==undefined){g.gMx=d.mx;g.gMz=d.mz;}
  }

  return {
    start,dispose,pause,resume,
    setMove,onButton,onGesture,
    get score(){return score;},get state(){return state;},get ended(){return ended;},
    isPaused:()=>paused,
    applySnapshot:s=>{netState.lastSnap=s;},
    netInput:(id,d)=>onGuestInput(d),
    get lastInput(){return {mx:input.mx,mz:input.mz};}
  };
};

/* Penaltilar seriyasi mustaqil rejim sifatida */
FA.PenaltyMode = function(opts){
  opts.needWinner=true;
  return FA.Match(opts);
};
