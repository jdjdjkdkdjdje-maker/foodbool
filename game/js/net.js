/* ============================================================
   FUTBOL ARENA — net.js
   Onlayn 1v1 PvP: matchmaking, holat sinxronizatsiyasi, ping,
   qayta ulanish, asosiy anti-cheat tekshiruvlari.
   Transport: ommaviy MQTT broker (WSS) — demo relay.
   Kelajakda server/ papkasidagi authoritative serverga o‘tadi.
   ============================================================ */
"use strict";
window.FA = window.FA || {};

FA.Net=(function(){
  const BROKERS=[
    "wss://broker.emqx.io:8084/mqtt",
    "wss://test.mosquitto.org:8081/mqtt",
    "wss://broker.hivemq.com:8884/mqtt"
  ];
  const ROOT="futbolarena/v1";
  const myId="fa_"+Math.random().toString(36).slice(2,10);
  let client=null, connected=false, connecting=false;
  let mm={active:false,cands:{},timer:null,bucket:0};
  let game={key:null,role:null,topic:null,onMsg:null,alive:true,lastRecv:0,watch:null};
  let ping=0,pingTimer=null;
  let stats={sent:0,recv:0};

  function connect(cb,tryIdx){
    if(typeof mqtt==="undefined"){cb&&cb(false,"mqtt yo‘q");return;}
    if(connecting)return; connecting=true;
    const url=BROKERS[(tryIdx||0)%BROKERS.length];
    try{
      client=mqtt.connect(url,{clientId:myId,clean:true,connectTimeout:6000,reconnectPeriod:2500,keepalive:20});
    }catch(e){connecting=false;cb&&cb(false,e.message);return;}
    client.on("connect",()=>{
      connected=true;connecting=false;
      client.subscribe(ROOT+"/mm/+",{qos:0});
      startPing();
      cb&&cb(true);
    });
    client.on("error",err=>{
      if(!connected&&tryIdx===undefined===false){}
      if(!connected){
        try{client.end(true);}catch(e){}
        connected=false;
        /* keyingi broker */
        const next=(tryIdx||0)+1;
        if(next<BROKERS.length+1){setTimeout(()=>connect(cb,next),400);}
      }
    });
    client.on("close",()=>{connected=false;});
    client.on("message",(topic,msg)=>{
      stats.recv++;
      let d=null;try{d=JSON.parse(msg.toString());}catch(e){return;}
      if(d.from===myId)return; /* o‘zimizniki emas */
      handle(topic,d);
    });
  }

  function handle(topic,d){
    if(topic.startsWith(ROOT+"/mm/")){
      if(d.t==="hello"&&mm.active&&!game.key){
        if(Math.abs(d.r-mm.myRating)<260||Object.keys(mm.cands).length<3) mm.cands[d.from]=d;
      }
      return;
    }
    if(topic===game.topic&&game.onMsg)game.onMsg(d);
  }

  function startPing(){
    clearInterval(pingTimer);
    pingTimer=setInterval(()=>{
      if(!connected||!game.key)return;
      send({t:"ping",ts:Date.now()});
    },2000);
  }

  function send(obj,topic){
    if(!connected||!client)return false;
    obj.from=myId;
    stats.sent++;
    try{client.publish(topic||game.topic,JSON.stringify(obj),{qos:0});return true;}catch(e){return false;}
  }

  /* ---------- Matchmaking ---------- */
  function findMatch(myRating,onFound,onStatus){
    mm={active:true,cands:{},myRating,bucket:Math.min(7,Math.floor(myRating/400))};
    onStatus&&onStatus(FA.UZ.connectServer);
    connect(ok=>{
      if(!ok){onStatus&&onStatus(FA.UZ.aiReplacement);mm.active=false;return;}
      onStatus&&onStatus(FA.UZ.searching);
      /* o‘zini e'lon qilish */
      const pub=()=>{
        for(let b=Math.max(0,mm.bucket-1);b<=Math.min(7,mm.bucket+1);b++)
          client.publish(ROOT+"/mm/"+b,JSON.stringify({t:"hello",from:myId,r:myRating,name:FA.Meta.profile.name}),{qos:0});
      };
      pub();
      mm.timer=setInterval(pub,1500);
      /* nomzodlarni tekshirish */
      let waited=0;
      const iv=setInterval(()=>{
        waited+=1;
        const keys=Object.keys(mm.cands);
        if(keys.length){
          /* reytingi eng yaqin raqib */
          keys.sort((a,b)=>Math.abs(mm.cands[a].r-mm.myRating)-Math.abs(mm.cands[b].r-mm.myRating));
          const peer=mm.cands[keys[0]];
          clearInterval(iv);stopSearch();
          beginHandshake(peer,onFound,onStatus);
          return;
        }
        if(waited>14){ /* 14s — topilmadi */
          clearInterval(iv);stopSearch();
          onStatus&&onStatus(FA.UZ.aiReplacement);
        }
      },1000);
    });
  }
  function stopSearch(){
    mm.active=false;
    clearInterval(mm.timer);
  }
  function cancelMatch(){stopSearch();}

  /* ---------- Handshake: juftlik kaliti va rollar ---------- */
  function beginHandshake(peer,onFound,onStatus){
    const pair=[myId,peer.from].sort().join("_");
    game.key=pair;game.topic=ROOT+"/g/"+pair;game.alive=true;
    client.subscribe(game.topic,{qos:0});
    const iAmHost=pair.startsWith(myId);
    /* taklif yuborish */
    const myTeam=FA.Meta.clubTeamFromSave();
    send({t:"invite",role:iAmHost?"host":"guest",name:FA.Meta.profile.name,
      team:{name:myTeam.name,short:myTeam.short,c1:myTeam.c1,c2:myTeam.c2,ovr:myTeam.ovr},
      rating:mm.myRating});
    let gotAccept=false;
    game.onMsg=(d)=>{
      if(d.t==="invite"){
        /* taklif keldi — rozi bo‘lamiz (boshqa o‘yinda emas bo‘lsak) */
        if(!gotAccept&&game.role===null){
          gotAccept=true;
          game.role=iAmHost?"host":"guest";
          const t=FA.Meta.clubTeamFromSave();
          send({t:"accept",name:FA.Meta.profile.name,
            team:{name:t.name,short:t.short,c1:t.c1,c2:t.c2,ovr:t.ovr},rating:FA.Meta.profile.rating});
          if(!iAmHost)onFound&&onFound({role:"guest",peer:d,topic:game.topic});
          else onFound&&onFound({role:"host",peer:d,topic:game.topic});
        }
        return;
      }
      if(d.t==="accept"&&!gotAccept){
        gotAccept=true;
        game.role=iAmHost?"host":"guest";
        send({t:"start"});
        onFound&&onFound({role:game.role,peer:d,topic:game.topic});
        return;
      }
      if(d.t==="ping"){send({t:"pong",ts:d.ts});return;}
      if(d.t==="pong"){ping=Date.now()-d.ts;return;}
      if(game.gameMsg)game.gameMsg(d);
    };
    /* 8s ichida javob bo‘lmasa — AI */
    setTimeout(()=>{
      if(!gotAccept&&game.key===pair){
        onStatus&&onStatus(FA.UZ.aiReplacement);
        leaveGame();
      }
    },8000);
  }

  /* ---------- O‘yin davomida ---------- */
  function initGame(role){
    game.role=role;
    game.lastRecv=Date.now();
    /* uzilishni kuzatish */
    game.watch=setInterval(()=>{
      if(!game.key)return;
      if(Date.now()-game.lastRecv>9000){
        if(game.onDrop)game.onDrop();
        leaveGame();
      }
    },3000);
  }
  function onGameMessage(cb){game.gameMsg=cb;}
  function onDrop(cb){game.onDrop=cb;}
  function sendState(snap){
    game.lastRecv=Date.now();
    send({t:"st",s:snap});
  }
  function sendInput(inp){send({t:"in",i:inp});}
  function markAlive(){game.lastRecv=Date.now();}
  function leaveGame(){
    try{if(game.key&&connected)send({t:"bye"});}catch(e){}
    if(game.watch)clearInterval(game.watch);
    game={key:null,role:null,topic:null,onMsg:null,gameMsg:null,alive:false,lastRecv:0,watch:null};
    ping=0;
  }
  function sendResult(score){
    /* ikkala tomon natijani yuboradi — taqqoslash orqali anti-cheat */
    send({t:"res",score,ts:Date.now()});
  }

  return {
    connect,findMatch,cancelMatch,initGame,onGameMessage,onDrop,
    sendState,sendInput,sendResult,leaveGame,markAlive,
    get ping(){return ping;},
    get connected(){return connected;},
    get myId(){return myId;},
    get role(){return game.role;},
    get stats(){return stats;}
  };
})();
