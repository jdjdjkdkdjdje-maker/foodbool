/* ============================================================
   FUTBOL ARENA — engine.js
   3D dvigatel: stadion, maydon, futbolchi modellari, to‘p,
   yorug‘lik, ob-havo, kameralar, grafik darajalari (LOD)
   ============================================================ */
"use strict";
window.FA = window.FA || {};

FA.QUALITY_PRESETS = {
  past:  {pr:0.6,  aa:false, shadows:false, shMap:512,  crowd:0.28, rain:250, flood:0.5},
  orta:  {pr:0.8,  aa:false, shadows:false, shMap:512,  crowd:0.5,  rain:400, flood:0.7},
  yuqori:{pr:1.0,  aa:true,  shadows:true,  shMap:1024, crowd:0.75, rain:600, flood:0.85},
  juda:  {pr:1.35, aa:true,  shadows:true,  shMap:1024, crowd:0.95, rain:900, flood:1.0},
  ultra: {pr:2.0,  aa:true,  shadows:true,  shMap:2048, crowd:1.2,  rain:1400, flood:1.15}
};

FA.Engine = (function(){
  const FIELD_W=105, FIELD_H=68; /* x: ±52.5, z: ±34 */
  let renderer, scene, cam, canvas;
  let quality="orta", preset=FA.QUALITY_PRESETS.orta;
  let fpsCap=60, lastRender=0;
  let night=false, raining=false;
  let crowdMesh=null, crowdData=[], rainPts=null, rainVel=[];
  let scoreCanvas=null, scoreTex=null, scoreCtx=null, scoreLast="";
  let dirLight=null, floods=[];
  let disposed=false;
  const camPos=new THREE.Vector3(0,26,46), camLook=new THREE.Vector3(0,0,0);
  const tmpV=new THREE.Vector3(), tmpV2=new THREE.Vector3();

  /* ---------- Maydon chizig‘i teksturasi ---------- */
  function fieldTexture(){
    const W=2048,H=1330,c=document.createElement("canvas");c.width=W;c.height=H;
    const g=c.getContext("2d");
    g.fillStyle="#2e8b4e";g.fillRect(0,0,W,H);
    for(let i=0;i<12;i++){ g.fillStyle=i%2?"#2f9153":"#2a854b"; g.fillRect(i*W/12,0,W/12,H); }
    g.strokeStyle="rgba(255,255,255,.92)";g.lineWidth=5;
    const m=60, gw=W-2*m, gh=H-2*m;
    g.strokeRect(m,m,gw,gh);
    g.beginPath();g.moveTo(W/2,m);g.lineTo(W/2,H-m);g.stroke();
    g.beginPath();g.arc(W/2,H/2,gh*0.13,0,7);g.stroke();
    g.fillStyle="rgba(255,255,255,.92)";
    g.beginPath();g.arc(W/2,H/2,8,0,7);g.fill();
    for(const side of [0,1]){
      const sx = side? m : W-m;
      g.strokeRect(side?m:W-m-gw*0.157, H/2-gh*0.305, gw*0.157, gh*0.61);
      g.beginPath();g.arc(sx,H/2,gh*0.13,side?Math.PI/2:-Math.PI/2,side?Math.PI*1.5:Math.PI/2,side?false:true);g.stroke();
      /* penalti maydonchasi */
      g.strokeRect(side?m:W-m-gw*0.44, H/2-gh*0.403, gw*0.44, gh*0.806);
      g.fillStyle="rgba(255,255,255,.92)";
      g.beginPath();g.arc(side?m+gw*0.11:W-m-gw*0.11,H/2,6,0,7);g.fill();
    }
    const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t;
  }

  /* ---------- Reklama taxtalari ---------- */
  function adTexture(txt,bg,fg){
    const c=document.createElement("canvas");c.width=512;c.height=64;
    const g=c.getContext("2d");
    g.fillStyle=bg;g.fillRect(0,0,512,64);
    g.fillStyle=fg;g.font="900 34px Arial";g.textAlign="center";g.textBaseline="middle";
    g.fillText(txt,256,34);
    return new THREE.CanvasTexture(c);
  }

  /* ---------- Darvoza ---------- */
  function buildGoal(x){
    const grp=new THREE.Group();
    const postMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.35,metalness:.3});
    const r=0.06, W=7.32/2, H=2.44, D=1.9;
    for(const z of [-W,W]){
      const p=new THREE.Mesh(new THREE.CylinderGeometry(r,r,H,10),postMat);
      p.position.set(0,H/2,z);p.castShadow=preset.shadows;grp.add(p);
    }
    const bar=new THREE.Mesh(new THREE.CylinderGeometry(r,r,W*2+0.12,10),postMat);
    bar.rotation.x=Math.PI/2;bar.position.set(0,H,0);bar.castShadow=preset.shadows;grp.add(bar);
    /* to‘r */
    const netMat=new THREE.MeshBasicMaterial({color:0xdddddd,transparent:true,opacity:.28,side:THREE.DoubleSide,wireframe:true});
    const back=new THREE.Mesh(new THREE.PlaneGeometry(W*2,H),netMat);
    back.position.set(x>0?D:-D,H/2,0);back.rotation.y=Math.PI/2;grp.add(back);
    const topN=new THREE.Mesh(new THREE.PlaneGeometry(D,W*2),netMat);
    topN.rotation.z=Math.PI/2;topN.rotation.y=Math.PI/2;topN.position.set(x>0?D/2:-D/2,H,0);grp.add(topN);
    for(const z of [-W,W]){
      const side=new THREE.Mesh(new THREE.PlaneGeometry(D,H),netMat);
      side.position.set(x>0?D/2:-D/2,H/2,z);grp.add(side);
    }
    grp.position.set(x,0,0);
    return grp;
  }

  /* ---------- Stadion: tribunalar, tomoshabinlar, chiroqlar ---------- */
  function buildStadium(opts){
    /* Yorug‘lik */
    scene.add(new THREE.HemisphereLight(night?0x20344f:0xbfd8ff, 0x0c2415, night?0.55:0.85));
    const amb=new THREE.AmbientLight(0xffffff, night?0.18:0.25); scene.add(amb);
    dirLight=new THREE.DirectionalLight(night?0xdfe8ff:0xfff4e0, night?1.15:1.0);
    dirLight.position.set(-40,60,30);
    if(preset.shadows){
      dirLight.castShadow=true;
      dirLight.shadow.mapSize.set(preset.shMap,preset.shMap);
      const sc=dirLight.shadow.camera;
      sc.left=-62;sc.right=62;sc.top=42;sc.bottom=-42;sc.far=160;
    }
    scene.add(dirLight);

    /* Osmon */
    scene.background=new THREE.Color(night?0x060a18:0x87b8e8);
    scene.fog=new THREE.Fog(night?0x060a18:0x87b8e8, 120, night?260:420);

    /* Maydon */
    const field=new THREE.Mesh(new THREE.PlaneGeometry(FIELD_W,FIELD_H),
      new THREE.MeshLambertMaterial({map:fieldTexture()}));
    field.rotation.x=-Math.PI/2;field.receiveShadow=preset.shadows;scene.add(field);
    /* atrof pomidor maydon */
    const apron=new THREE.Mesh(new THREE.PlaneGeometry(FIELD_W+18,FIELD_H+14),
      new THREE.MeshLambertMaterial({color:0x1f6b3a}));
    apron.rotation.x=-Math.PI/2;apron.position.y=-0.02;scene.add(apron);

    /* Darvozalar */
    scene.add(buildGoal(-52.5)); scene.add(buildGoal(52.5));
    /* Burchoq bayroqlari */
    for(const x of [-52.5,52.5]) for(const z of [-34,34]){
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1.6,6),new THREE.MeshLambertMaterial({color:0xeeeeee}));
      pole.position.set(x,0.8,z);scene.add(pole);
      const fl=new THREE.Mesh(new THREE.PlaneGeometry(.5,.34),new THREE.MeshLambertMaterial({color:0xffd54f,side:THREE.DoubleSide}));
      fl.position.set(x+(x>0?-.25:.25),1.4,z);scene.add(fl);
    }

    /* Reklama taxtalari */
    const ads=[["FA ARENA","#041e3d","#00e676"],["ARENA COLA","#7a0e0e","#fff"],["ZOMIN CHOY","#0d5c2e","#ffef9f"],["REGISTON AIR","#123c78","#9fd6ff"],["UZMOBILE","#3d1155","#ffc4ff"],["SIRDARYO ENERGO","#c96a00","#ffe9b0"]];
    let ai=0;
    const adGeo=new THREE.BoxGeometry(6,0.9,0.16);
    const mkAd=()=>new THREE.MeshStandardMaterial({map:adTexture(...ads[ai++%ads.length]),roughness:.6});
    for(let i=-4;i<=4;i++){ if(Math.abs(i)<1) continue;
      const a=new THREE.Mesh(adGeo,mkAd());a.position.set(i*11.2,.45,-37.4);scene.add(a);
      const b=new THREE.Mesh(adGeo,mkAd());b.position.set(i*11.2,.45,37.4);scene.add(b);
    }
    for(let i=-2;i<=2;i++){
      const a=new THREE.Mesh(adGeo,mkAd());a.rotation.y=Math.PI/2;a.position.set(-56.4,.45,i*12.4);scene.add(a);
      const b=new THREE.Mesh(adGeo,mkAd());b.rotation.y=Math.PI/2;b.position.set(56.4,.45,i*12.4);scene.add(b);
    }

    /* Tribunalar + tomoshabinlar */
    buildStands();

    /* Projektor minoralari */
    floods=[];
    for(const [x,z] of [[-62,-46],[62,-46],[-62,46],[62,46]]){
      const tw=new THREE.Mesh(new THREE.CylinderGeometry(.5,.8,34,8),new THREE.MeshLambertMaterial({color:0x9aa8b8}));
      tw.position.set(x,17,z);scene.add(tw);
      const panelG=new THREE.Group();
      for(let r=0;r<3;r++)for(let cIdx=0;cIdx<4;cIdx++){
        const lamp=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.1,.3),
          new THREE.MeshBasicMaterial({color:night?0xf8fbff:0x8a97a8}));
        lamp.position.set((cIdx-1.5)*1.8,(r-1)*1.4,0);panelG.add(lamp);
      }
      panelG.position.set(x,35,z);panelG.lookAt(0,0,0);scene.add(panelG);
      const spot=new THREE.SpotLight(0xf2f6ff,preset.flood*(night?1.25:0.35),190,.7,.55);
      spot.position.set(x,35,z);spot.target.position.set(x*0.15,0,z*0.1);
      scene.add(spot);scene.add(spot.target);floods.push(spot);
    }

    /* Tablo (skorbor) */
    scoreCanvas=document.createElement("canvas");scoreCanvas.width=512;scoreCanvas.height=192;
    scoreCtx=scoreCanvas.getContext("2d");
    scoreTex=new THREE.CanvasTexture(scoreCanvas);
    const board=new THREE.Mesh(new THREE.BoxGeometry(18,7,.6),
      new THREE.MeshBasicMaterial({map:scoreTex}));
    board.position.set(0,17,-47);scene.add(board);
    const frame=new THREE.Mesh(new THREE.BoxGeometry(19.4,8.2,1.6),
      new THREE.MeshLambertMaterial({color:0x14213a}));
    frame.position.set(0,17,-47.8);scene.add(frame);
    updateScoreboard("0 - 0","00:00","FUTBOL ARENA");

    /* Zaxira o‘rindig‘i va tunnel */
    const benchMat=new THREE.MeshLambertMaterial({color:0x1a263f});
    for(const z of [-40.5,40.5]){
      const bench=new THREE.Mesh(new THREE.BoxGeometry(12,1.6,2),benchMat);
      bench.position.set(-6,0.8,z);scene.add(bench);
      const roof=new THREE.Mesh(new THREE.BoxGeometry(13,.25,3),new THREE.MeshLambertMaterial({color:0x0d1524}));
      roof.position.set(-6,3.1,z);scene.add(roof);
    }
    const tunnel=new THREE.Mesh(new THREE.BoxGeometry(6,3,4),new THREE.MeshLambertMaterial({color:0x060b16}));
    tunnel.position.set(-24,1.5,-38.5);scene.add(tunnel);

    /* Yomg‘ir */
    buildRain(opts.rain?preset.rain:0);
  }

  function buildStands(){
    const standMat=new THREE.MeshLambertMaterial({color:night?0x111a2c:0x27354c});
    const rowMat=new THREE.MeshLambertMaterial({color:0x39485f});
    crowdData=[]; const seats=[];
    const rows=14, seatH=0.85, seatW=1.15;
    /* yon tribunalar (z tomonda) */
    for(const side of [-1,1]){
      for(let r=0;r<rows;r++){
        const zBase=(38+r*seatH)*side;
        const step=new THREE.Mesh(new THREE.BoxGeometry(124,seatH,seatW*side>0?1.15:1.15),r%2?standMat:rowMat);
        step.position.set(0,0.4+r*seatH*0.75,zBase);scene.add(step);
        const count=Math.floor(108/1.5);
        for(let s=0;s<count;s++){
          if(Math.random()>Math.min(1,preset.crowd)) continue;
          seats.push([ -54+s*1.5+(Math.random()-.5)*.4, 0.85+r*seatH*0.75+seatH*0.35, zBase+side*0.35 ]);
        }
      }
    }
    /* oxirgi tribunalar (x tomonda, darvoza ortida) */
    for(const side of [-1,1]){
      for(let r=0;r<rows;r++){
        const xBase=(58+r*seatH)*side;
        const step=new THREE.Mesh(new THREE.BoxGeometry(1.15,seatH,74),r%2?standMat:rowMat);
        step.position.set(xBase,0.4+r*seatH*0.75,0);scene.add(step);
        const count=Math.floor(66/1.5);
        for(let s=0;s<count;s++){
          if(Math.random()>Math.min(1,preset.crowd)) continue;
          seats.push([ xBase+side*0.35, 0.85+r*seatH*0.75+seatH*0.35, -33+s*1.5+(Math.random()-.5)*.4 ]);
        }
      }
    }
    /* Tomoshabinlar — instanced */
    const geo=new THREE.BoxGeometry(0.42,0.95,0.34);
    const mat=new THREE.MeshLambertMaterial();
    const N=seats.length;
    crowdMesh=new THREE.InstancedMesh(geo,mat,N);
    const dummy=new THREE.Object3D(); const col=new THREE.Color();
    const kit=new THREE.Color(0x0e5c3a);
    for(let i=0;i<N;i++){
      const s=seats[i];
      dummy.position.set(s[0],s[1],s[2]);
      dummy.rotation.y=Math.atan2(-s[0],-s[2])+Math.PI;
      dummy.scale.setScalar(0.85+Math.random()*0.35);
      dummy.updateMatrix();
      crowdMesh.setMatrixAt(i,dummy.matrix);
      col.setHSL(Math.random(),0.55,0.32+Math.random()*0.35);
      if(Math.random()<0.3) col.copy(kit).offsetHSL(0,0,(Math.random()-.5)*.15);
      crowdMesh.setColorAt(i,col);
      crowdData.push({x:s[0],y:s[1],z:s[2],ph:Math.random()*6.28,mat:dummy.matrix.clone()});
    }
    crowdMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    crowdMesh.frustumCulled=false;
    scene.add(crowdMesh);
  }

  /* Gol nishonlash — tomoshabinlar sakraydi */
  function crowdCelebrate(on){
    if(!crowdMesh) return;
    crowdMesh.userData.cheer=on;
  }
  function animateCrowd(t){
    if(!crowdMesh) return;
    const cheer=crowdMesh.userData.cheer;
    if(!cheer){ if(crowdMesh.userData.moved){ crowdMesh.position.y=0; crowdMesh.userData.moved=false; } return; }
    /* Silliq: butun to‘rga yengil sakrash (arzon, tez) */
    crowdMesh.position.y=Math.abs(Math.sin(t*6))*0.22;
    crowdMesh.userData.moved=true;
  }

  /* ---------- Yomg‘ir ---------- */
  function buildRain(count){
    if(rainPts){scene.remove(rainPts);rainPts=null;}
    if(!count) return;
    const geo=new THREE.BufferGeometry();
    const pos=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      pos[i*3]=camPos.x+(Math.random()-.5)*90;
      pos[i*3+1]=Math.random()*38;
      pos[i*3+2]=camPos.z+(Math.random()-.5)*90;
    }
    geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
    rainVel=new Float32Array(count);
    for(let i=0;i<count;i++) rainVel[i]=22+Math.random()*14;
    rainPts=new THREE.Points(geo,new THREE.PointsMaterial({color:0xaac4e8,size:.14,transparent:true,opacity:.6}));
    rainPts.frustumCulled=false;
    scene.add(rainPts);
  }
  function animateRain(dt){
    if(!rainPts||!raining) return;
    const p=rainPts.geometry.attributes.position, a=p.array;
    for(let i=0;i<rainVel.length;i++){
      a[i*3+1]-=rainVel[i]*dt;
      if(a[i*3+1]<0){
        a[i*3]=camPos.x+(Math.random()-.5)*90;
        a[i*3+1]=36+Math.random()*8;
        a[i*3+2]=camPos.z+(Math.random()-.5)*90;
      }
    }
    p.needsUpdate=true;
  }

  /* ---------- Tablo ---------- */
  function updateScoreboard(score,time,txt){
    if(!scoreCtx||scoreLast===score+time) return;
    scoreLast=score+time;
    const g=scoreCtx;
    g.fillStyle="#02060f";g.fillRect(0,0,512,192);
    g.strokeStyle="#00e676";g.lineWidth=6;g.strokeRect(6,6,500,180);
    g.fillStyle="#ffffff";g.font="900 64px Arial";g.textAlign="center";
    g.fillText(score,256,74);
    g.fillStyle="#00e676";g.font="700 40px Arial";
    g.fillText(time,256,122);
    g.fillStyle="#9fb2d4";g.font="700 24px Arial";
    g.fillText(txt,256,164);
    if(scoreTex) scoreTex.needsUpdate=true;
  }

  /* ---------- To‘p ---------- */
  function ballTexture(){
    const c=document.createElement("canvas");c.width=256;c.height=128;
    const g=c.getContext("2d");
    g.fillStyle="#f8f8f8";g.fillRect(0,0,256,128);
    g.fillStyle="#111";
    for(let i=0;i<10;i++){
      const x=(i%5)*52+((i/5|0)?26:0), y=(i/5|0)*64+32;
      g.beginPath();
      for(let k=0;k<5;k++){const a=k/5*6.283-1.57;g.lineTo(x+Math.cos(a)*13,y+Math.sin(a)*13);}
      g.closePath();g.fill();
    }
    return new THREE.CanvasTexture(c);
  }
  function makeBall(){
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.115,20,16),
      new THREE.MeshStandardMaterial({map:ballTexture(),roughness:.35}));
    m.castShadow=preset.shadows;
    return m;
  }

  /* ---------- Blob soya (arzon) ---------- */
  function makeBlobShadow(scale){
    const c=document.createElement("canvas");c.width=64;c.height=64;
    const g=c.getContext("2d");
    const gr=g.createRadialGradient(32,32,4,32,32,30);
    gr.addColorStop(0,"rgba(0,0,0,.4)");gr.addColorStop(1,"rgba(0,0,0,0)");
    g.fillStyle=gr;g.fillRect(0,0,64,64);
    const sp=new THREE.Mesh(new THREE.PlaneGeometry(scale,scale),
      new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));
    sp.rotation.x=-Math.PI/2;
    return sp;
  }

  /* ---------- Futbolchi modeli ---------- */
  const SKINS=[0xf1c27d,0xe0ac69,0xc68642,0x8d5524,0xffdbac];
  const HAIRS=[0x1a1a1a,0x2e1a0a,0x5a3a1a,0x0a0a0a,0x4a4a4a,0x7a5a2a];
  function numberTexture(num,bg,fg){
    const c=document.createElement("canvas");c.width=128;c.height=128;
    const g=c.getContext("2d");
    g.fillStyle=bg;g.fillRect(0,0,128,128);
    g.fillStyle=fg;g.font="900 86px Arial";g.textAlign="center";g.textBaseline="middle";
    g.fillText(String(num),64,70);
    return new THREE.CanvasTexture(c);
  }
  function makePlayer(o){
    /* o: {c1,c2,shorts,socks,gk,num,skin,hair} */
    const gk=o.gk;
    const shirtC=gk?0x22ee66:o.c1, shortsC=gk?0x111111:o.shorts, socksC=gk?0x111111:o.socks;
    const root=new THREE.Group();
    const body=new THREE.Group(); root.add(body);
    const M=(c)=>new THREE.MeshLambertMaterial({color:c});
    const shirtM=M(shirtC), skinM=M(o.skin), shortsM=M(shortsC), sockM=M(socksC), bootM=M(0x181818);

    /* tana */
    const torso=new THREE.Mesh(new THREE.BoxGeometry(.38,.52,.24),shirtM);
    torso.position.y=1.12; torso.castShadow=preset.shadows; body.add(torso);
    const shorts=new THREE.Mesh(new THREE.BoxGeometry(.36,.22,.25),shortsM);
    shorts.position.y=.78; body.add(shorts);

    /* bosh */
    const headG=new THREE.Group(); headG.position.y=1.56; body.add(headG);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.125,14,12),skinM);
    head.position.y=.12; head.castShadow=preset.shadows; headG.add(head);
    const hairCol=o.hair;
    const hair=new THREE.Mesh(new THREE.SphereGeometry(.13,12,10,0,Math.PI*2,0,Math.PI*.55),M(hairCol));
    hair.position.y=.155; headG.add(hair);
    /* ko‘zlar */
    const eyeM=M(0x101010);
    for(const s of [-1,1]){
      const eye=new THREE.Mesh(new THREE.BoxGeometry(.028,.02,.02),eyeM);
      eye.position.set(.05*s,.13,.115);headG.add(eye);
    }

    /* qo‘llar */
    const armL=new THREE.Group(), armR=new THREE.Group();
    armL.position.set(.245,1.34,0); armR.position.set(-.245,1.34,0);
    const armGeo=new THREE.BoxGeometry(.1,.5,.11);
    const upperSkin=new THREE.Mesh(armGeo,skinM);upperSkin.position.y=-.24;
    armL.add(upperSkin.clone());armR.add(upperSkin);
    const sleeveL=new THREE.Mesh(new THREE.BoxGeometry(.12,.2,.13),shirtM);sleeveL.position.y=-.08;armL.add(sleeveL);
    const sleeveR=sleeveL.clone();armR.add(sleeveR);
    body.add(armL);body.add(armR);

    /* oyoqlar */
    const legL=new THREE.Group(), legR=new THREE.Group();
    legL.position.set(.1,.68,0); legR.position.set(-.1,.68,0);
    const mkLeg=(parent)=>{
      const thigh=new THREE.Mesh(new THREE.BoxGeometry(.13,.34,.14),shortsM);thigh.position.y=-.17;parent.add(thigh);
      const shin=new THREE.Mesh(new THREE.BoxGeometry(.11,.3,.12),sockM);shin.position.y=-.5;parent.add(shin);
      const boot=new THREE.Mesh(new THREE.BoxGeometry(.12,.09,.24),bootM);boot.position.set(0,-.66,.05);parent.add(boot);
    };
    mkLeg(legL);mkLeg(legR);
    body.add(legL);body.add(legR);

    /* orqa raqam */
    const numTex=numberTexture(o.num, gk?"#111":"#"+shirtC.toString(16).padStart(6,"0"), gk?"#2f2":"#fff");
    const numPlane=new THREE.Mesh(new THREE.PlaneGeometry(.26,.26),
      new THREE.MeshBasicMaterial({map:numTex,transparent:true}));
    numPlane.position.set(0,1.16,-.128);numPlane.rotation.y=Math.PI;body.add(numPlane);

    if(!preset.shadows){ const bs=makeBlobShadow(.9); bs.position.y=.02; root.add(bs); }
    root.userData.anim={body,torso,headG,armL,armR,legL,legR,phase:Math.random()*6};
    return root;
  }

  /* ---------- Protsedura animatsiyasi ---------- */
  function posePlayer(mesh,dt,ps){
    const a=mesh.userData.anim; if(!a) return;
    const sp=ps.speed||0, norm=Math.min(1,sp/8.5);
    let bob=0;
    if(ps.state==="run"||ps.state==="idle"){
      const f = ps.state==="idle" ? 2 : 4.2+norm*9;
      a.phase+=f*dt*(ps.state==="idle"?1:norm*1.6+.35);
      const amp = ps.state==="idle" ? .06 : .28+norm*.75;
      a.legL.rotation.x=Math.sin(a.phase)*amp;
      a.legR.rotation.x=-Math.sin(a.phase)*amp;
      a.armL.rotation.x=-Math.sin(a.phase)*amp*.8;
      a.armR.rotation.x=Math.sin(a.phase)*amp*.8;
      a.armL.rotation.z=.12; a.armR.rotation.z=-.12;
      a.body.rotation.x=norm*.22; a.body.rotation.z=0; a.body.rotation.y=0;
      a.body.position.y=Math.abs(Math.sin(a.phase))*norm*.05; bob=a.body.position.y;
      a.headG.rotation.x=norm*.1;
    }
    else if(ps.state==="kick"){
      a.phase+=14*dt;
      const k=Math.min(1,a.phase);
      a.legR.rotation.x = k<.4 ? -1.5*(k/.4) : -1.5+2.9*((k-.4)/.6);
      a.legL.rotation.x=.15;
      a.armL.rotation.x=-.5; a.armR.rotation.x=.4;
      a.body.rotation.x=.12;
      if(k>=1){a.phase=0;}
    }
    else if(ps.state==="slide"){
      a.body.rotation.x=-1.15; a.body.position.y=-.42;
      a.legL.rotation.x=1.3; a.legR.rotation.x=1.05; a.legR.rotation.y=-.3;
      a.armL.rotation.x=-.4; a.armR.rotation.x=-.6;
    }
    else if(ps.state==="fall"){
      a.body.rotation.x=-1.35; a.body.position.y=-.55;
      a.legL.rotation.x=.3;a.legR.rotation.x=.15;
      a.armL.rotation.x=-.2;a.armR.rotation.x=-.3;
    }
    else if(ps.state==="celebrate"){
      a.phase+=7*dt;
      a.body.position.y=Math.abs(Math.sin(a.phase))*.3;
      a.armL.rotation.x=Math.PI-.4+Math.sin(a.phase)*.2;
      a.armR.rotation.x=Math.PI-.4-Math.sin(a.phase)*.2;
      a.armL.rotation.z=.5;a.armR.rotation.z=-.5;
      a.legL.rotation.x=0;a.legR.rotation.x=0;
    }
    else if(ps.state==="dive"){
      a.body.rotation.z=ps.diveDir*1.2; a.body.position.y=-.3;
      a.armL.rotation.x=Math.PI/2*ps.diveDir;a.armR.rotation.x=Math.PI/2*ps.diveDir;
      a.armL.rotation.z=.9*ps.diveDir; a.armR.rotation.z=-.9*ps.diveDir;
    }
    else if(ps.state==="gkidle"){
      a.phase+=3*dt;
      a.armL.rotation.x=.5;a.armR.rotation.x=.5;
      a.armL.rotation.z=.55;a.armR.rotation.z=-.55;
      a.legL.rotation.x=0;a.legR.rotation.x=0;
      a.body.position.y=Math.abs(Math.sin(a.phase*2))*.02;
    }
    if(ps.state!=="slide"&&ps.state!=="fall"&&ps.state!=="dive"){
      a.body.position.y=bob||0;
      if(ps.state!=="celebrate") a.body.rotation.z=0;
    }
  }

  /* ---------- Kamera ---------- */
  function updateCamera(mode,ball,dt,dir){
    let tx,ty,tz,lx,ly,lz;
    const bx=THREE.MathUtils.clamp(ball.x,-46,46), bz=THREE.MathUtils.clamp(ball.z,-26,26);
    if(mode==="dynamic"){
      tx=bx-dir*15; ty=8.5; tz=bz*.85;
      lx=bx+dir*14; ly=1.2; lz=bz*.9;
      cam.fov=52;
    } else {
      tx=bx*.8; ty=25+Math.abs(bz)*.1; tz=44+Math.abs(bz)*.22;
      lx=bx*.92; ly=0; lz=bz*.5;
      cam.fov=38;
    }
    const k=1-Math.pow(0.0018,dt);
    camPos.lerp(tmpV.set(tx,ty,tz),k);
    camLook.lerp(tmpV2.set(lx,ly,lz),k);
    cam.position.copy(camPos);
    cam.lookAt(camLook);
    cam.updateProjectionMatrix();
  }

  /* ---------- Sifat almashish (avto-optimizatsiya) ---------- */
  const ORDER=["past","orta","yuqori","juda","ultra"];
  function setQuality(q,allowRebuild){
    if(!FA.QUALITY_PRESETS[q]) q="orta";
    quality=q; preset=FA.QUALITY_PRESETS[q];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,preset.pr));
    renderer.shadowMap.enabled=preset.shadows;
    if(dirLight){
      dirLight.castShadow=preset.shadows;
      dirLight.shadow.mapSize.set(preset.shMap,preset.shMap);
    }
    floods.forEach(f=>f.intensity=preset.flood*(night?1.25:0.35));
    if(rainPts) rainPts.visible=raining&&preset.rain>0;
    if(crowdMesh) crowdMesh.count=Math.floor(crowdData.length*Math.min(1,preset.crowd)/Math.min(1,FA.QUALITY_PRESETS.ultra.crowd)*FA.QUALITY_PRESETS.ultra.crowd)||crowdData.length;
  }
  function detectQuality(){
    const hc=navigator.hardwareConcurrency||4, dpr=Math.min(window.devicePixelRatio||1,2);
    const mem=navigator.deviceMemory||4;
    if(hc>=8&&dpr>=2.5&&mem>=6) return "ultra";
    if(hc>=6&&dpr>=2) return "juda";
    if(hc>=4) return "yuqori";
    if(hc>=3) return "orta";
    return "past";
  }

  /* ---------- Yaratish ---------- */
  function create(cv,opts){
    canvas=cv; disposed=false;
    opts=opts||{};
    quality=opts.quality||detectQuality();
    preset=FA.QUALITY_PRESETS[quality];
    renderer=new THREE.WebGLRenderer({canvas,antialias:preset.aa,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,preset.pr));
    renderer.setSize(window.innerWidth,window.innerHeight,false);
    renderer.shadowMap.enabled=preset.shadows;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene=new THREE.Scene();
    cam=new THREE.PerspectiveCamera(38,window.innerWidth/window.innerHeight,.5,600);
    cam.position.copy(camPos);
    night=!!opts.night; raining=!!opts.rain;
    buildStadium({rain:raining});
    window.addEventListener("resize",onResize);
    return api;
  }
  function onResize(){
    if(disposed) return;
    renderer.setSize(window.innerWidth,window.innerHeight,false);
    cam.aspect=window.innerWidth/window.innerHeight;
    cam.updateProjectionMatrix();
  }

  /* ---------- Render (FPS cheklovi bilan) ---------- */
  function render(now){
    const minMs=1000/fpsCap-1.5;
    if(now-lastRender<minMs) return false;
    lastRender=now;
    animateCrowd(now/1000);
    animateRain(1/60);
    renderer.render(scene,cam);
    return true;
  }

  const api={
    create, render, updateCamera, makeBall, makePlayer, posePlayer,
    updateScoreboard, setQuality, detectQuality, crowdCelebrate,
    setNight(v){night=v;}, setRaining(v){raining=v;if(rainPts)rainPts.visible=v;},
    setFpsCap(n){fpsCap=n||60;},
    getQuality(){return quality;},
    get scene(){return scene;},
    get camera(){return cam;},
    dispose(){
      disposed=true;
      window.removeEventListener("resize",onResize);
      scene.traverse(o=>{ if(o.geometry)o.geometry.dispose(); if(o.material){ (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ if(m.map)m.map.dispose(); m.dispose(); }); } });
      renderer.dispose();
    }
  };
  return api;
})();
