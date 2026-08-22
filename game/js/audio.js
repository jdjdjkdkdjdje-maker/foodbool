/* ============================================================
   FUTBOL ARENA — audio.js
   WebAudio sintezi: to‘p, hushtak, tomoshabinlar, gol shovqini
   + o‘zbek TTS kommentator (qurilmada mavjud bo‘lsa)
   ============================================================ */
"use strict";
window.FA = window.FA || {};

FA.Audio = (function(){
  let ctx=null, master, sfxG, crowdG, commG, crowdSrc=null, crowdLfo=null, crowdLevel=0.35;
  let vol={sfx:0.8, crowd:0.6, comm:0.9};
  let uzVoice=null, voiceChecked=false;

  function ensure(){
    if(ctx) return true;
    try{
      const AC = window.AudioContext||window.webkitAudioContext;
      if(!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value=0.9; master.connect(ctx.destination);
      sfxG = ctx.createGain(); sfxG.gain.value=vol.sfx; sfxG.connect(master);
      crowdG = ctx.createGain(); crowdG.gain.value=vol.crowd*0.5; crowdG.connect(master);
      commG = ctx.createGain(); commG.gain.value=vol.comm; commG.connect(master);
      startCrowd();
    }catch(e){ return false; }
    return true;
  }
  function resume(){ if(ctx && ctx.state==="suspended") ctx.resume(); }

  function noiseBuf(sec){
    const len = Math.floor(ctx.sampleRate*sec), buf = ctx.createBuffer(1,len,ctx.sampleRate), d = buf.getChannelData(0);
    let last=0;
    for(let i=0;i<len;i++){ const w=Math.random()*2-1; last=(last+0.02*w)/1.02; d[i]=last*3.5; }
    return buf;
  }

  /* Stadion g‘uvuri (doimiy fon) */
  function startCrowd(){
    if(!ctx||crowdSrc) return;
    crowdSrc = ctx.createBufferSource();
    crowdSrc.buffer = noiseBuf(4); crowdSrc.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=520; bp.Q.value=0.45;
    const lp = ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=1400;
    crowdSrc.connect(bp); bp.connect(lp); lp.connect(crowdG);
    crowdSrc.start();
  }
  /* G‘uvur darajasi (0..1) — xavfli hujumda oshadi */
  function crowdSet(v){
    if(!ctx) return; crowdLevel=Math.max(0.05,Math.min(1,v));
    const t=ctx.currentTime;
    crowdG.gain.cancelScheduledValues(t);
    crowdG.gain.setTargetAtTime(vol.crowd*0.5*(0.5+crowdLevel*0.9), t, 0.6);
  }

  /* Umumiy shovqin portlashi (gol / wow) */
  function burst(f0,f1,dur,volx,type){
    if(!ensure()) return;
    const n = ctx.createBufferSource(); n.buffer = noiseBuf(dur+0.1);
    const bp = ctx.createBiquadFilter(); bp.type=type||"bandpass"; bp.Q.value=0.8;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    bp.frequency.setValueAtTime(f0,t); bp.frequency.exponentialRampToValueAtTime(f1,t+dur);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(volx,t+0.04);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    n.connect(bp); bp.connect(g); g.connect(sfxG);
    n.start(t); n.stop(t+dur+0.1);
  }
  function tone(f0,f1,dur,volx,type){
    if(!ensure()) return;
    const o = ctx.createOscillator(); o.type=type||"sine";
    const g = ctx.createGain(); const t=ctx.currentTime;
    o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+dur);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(volx,t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(sfxG); o.start(t); o.stop(t+dur+0.05);
  }

  const S = {
    ui(){ tone(660,880,0.07,0.15,"triangle"); },
    /* To‘p zarbasi: kuchga qarab */
    kick(p){ p=p||0.5; burst(180,60,0.09+p*0.06,0.35+p*0.4,"lowpass"); tone(120+p*80,60,0.08,0.25,"sine"); },
    /* Uzun pas / oshirib berish */
    long(){ burst(240,90,0.14,0.5,"lowpass"); },
    /* Darvoza to‘ri */
    net(){ burst(3000,600,0.25,0.3,"bandpass"); },
    /* Ustun */
    post(){ tone(880,860,0.4,0.5,"square"); tone(1760,1720,0.3,0.2,"sine"); },
    /* Ushlash */
    catchSfx(){ burst(500,150,0.12,0.3,"lowpass"); },
    /* Hushtak */
    whistle(kind){
      if(!ensure()) return;
      const t = ctx.currentTime;
      const blow=(at,dur,f)=>{
        const o=ctx.createOscillator(), o2=ctx.createOscillator(), g=ctx.createGain();
        o.type="sine"; o2.type="sine"; o.frequency.value=f; o2.frequency.value=f*1.5;
        const lf=ctx.createOscillator(), lg=ctx.createGain();
        lf.frequency.value=38; lg.gain.value=140; lf.connect(lg); lg.connect(o.frequency);
        g.gain.setValueAtTime(0.0001,t+at); g.gain.exponentialRampToValueAtTime(0.4,t+at+0.03);
        g.gain.setValueAtTime(0.4,t+at+dur-0.05); g.gain.exponentialRampToValueAtTime(0.0001,t+at+dur);
        o.connect(g); o2.connect(g); g.connect(sfxG);
        o.start(t+at); o2.start(t+at); lf.start(t+at);
        o.stop(t+at+dur); o2.stop(t+at+dur); lf.stop(t+at+dur);
      };
      if(kind==="start"){ blow(0,0.35,2100); }
      else if(kind==="end"){ blow(0,0.22,2100); blow(0.3,0.22,2100); blow(0.6,0.7,2100); }
      else blow(0,0.5,2100);
    },
    /* Gol shovqini */
    cheer(){
      burst(400,1200,2.6,0.9,"bandpass"); setTimeout(()=>burst(600,900,2.2,0.6,"bandpass"),180);
      crowdSet(1); setTimeout(()=>crowdSet(0.45),4200);
    },
    aww(){ burst(700,300,1.2,0.5,"bandpass"); crowdSet(0.75); setTimeout(()=>crowdSet(0.4),1600); },
    boo(){ burst(300,120,1.6,0.4,"lowpass"); },
    card(){ tone(1200,900,0.15,0.25,"square"); },

    /* TTS kommentator — o‘zbek ovozi bo‘lsa */
    speak(text){
      if(vol.comm<=0) return;
      try{
        if(!("speechSynthesis" in window)) return;
        if(!voiceChecked){
          voiceChecked=true;
          const vs = speechSynthesis.getVoices();
          uzVoice = vs.find(v=>/^uz/i.test(v.lang)) || vs.find(v=>/uzbek/i.test(v.name)) || null;
        }
        if(!uzVoice && speechSynthesis.getVoices().length===0){ speechSynthesis.onvoiceschanged=()=>{voiceChecked=false;}; }
        if(!uzVoice) return; /* ovoz bo‘lmasa — faqat matn banneri */
        const u = new SpeechSynthesisUtterance(text);
        u.voice = uzVoice; u.lang = uzVoice.lang; u.volume = vol.comm; u.rate = 1.05;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      }catch(e){}
    },
    setVol(k,v){
      vol[k]=v;
      if(!ctx) return;
      if(k==="sfx") sfxG.gain.value=v;
      if(k==="crowd") crowdG.gain.value=v*0.5*(0.5+crowdLevel*0.9);
      if(k==="comm") commG.gain.value=v;
    },
    ensure, resume
  };
  return S;
})();
