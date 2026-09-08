import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const screen = document.getElementById('screen-cake');
const atelier = document.getElementById('cake-atelier');
const viewport = document.getElementById('cake-viewport');
const candleNodes = [...document.querySelectorAll('.candle')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
try { initialize(); }
catch (error) {
  renderer?.dispose();
  atelier.hidden = true;
  screen.classList.remove('has-3d');
  screen.dataset.renderer = 'fallback';
  console.warn('3D cake unavailable; using the interactive CSS cake.', error.message);
}

function initialize() {
  renderer = new THREE.WebGLRenderer({alpha:true, antialias:true, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .9;
  viewport.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 40);
  const model = new THREE.Group(); scene.add(model);
  const envScene = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(envScene, .04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = .65;
  envScene.dispose(); pmrem.dispose();
  const ambient = new THREE.HemisphereLight(0xfff3e5, 0x7b4c65, 2); scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffedd7, 3.8); key.position.set(-3,6,4); key.castShadow=true;
  key.shadow.mapSize.set(1024,1024); key.shadow.camera.left=-3; key.shadow.camera.right=3;
  key.shadow.camera.top=5; key.shadow.camera.bottom=-2; key.shadow.normalBias=.025; key.shadow.bias=-.0002;
  key.shadow.radius=4; scene.add(key);
  const rim = new THREE.DirectionalLight(0xffb7b9, 2); rim.position.set(3,4,-3); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xe3e8ff, 1.2); fill.position.set(2,2,5); scene.add(fill);
  const mat = (color, roughness=.6, metalness=0) => new THREE.MeshStandardMaterial({color,roughness,metalness});
  const ivory=mat('#fff2d8',.72), vanilla=mat('#f7d5b8',.85), rose=mat('#d47f91',.52), blush=mat('#efb7ba',.55);
  const gold=mat('#d4a75f',.28,.82), porcelain=mat('#f6dfd0',.25,.08), leaf=mat('#467155',.62);
  const glaze=new THREE.MeshPhysicalMaterial({color:'#fff0dc',roughness:.3,clearcoat:.35});
  const berryMat=new THREE.MeshPhysicalMaterial({color:'#b93250',roughness:.45,clearcoat:.25});
  const seedMat=mat('#e8b775',.55), wickMat=mat('#3a2425',1);
  const sphere = new THREE.SphereGeometry(1,16,12);
  const dummy = new THREE.Object3D();
  function mesh(geometry,material,parent=model,x=0,y=0,z=0) {
    const item=new THREE.Mesh(geometry,material); item.position.set(x,y,z); item.castShadow=true; item.receiveShadow=true; parent.add(item); return item;
  }
  function ring(radius,tube,y,material,parent=model) {
    const item=mesh(new THREE.TorusGeometry(radius,tube,10,100),material,parent,0,y,0); item.rotation.x=Math.PI/2; return item;
  }
  function lathe(profile,material,y=0,parent=model) {
    return mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),80),material,parent,0,y,0);
  }
  function instances(geometry,material,transforms,parent=model) {
    const batch=new THREE.InstancedMesh(geometry,material,transforms.length);
    transforms.forEach((t,i)=>{dummy.position.set(...t.p);dummy.rotation.set(...(t.r||[0,0,0]));dummy.scale.set(...(t.s||[1,1,1]));dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});
    batch.castShadow=true;batch.receiveShadow=true;parent.add(batch);return batch;
  }
  // A turned porcelain pedestal, with a rolled gold rim and a scalloped cake board.
  lathe([[0,-.36],[.5,-.36],[.58,-.31],[.55,-.25],[.28,-.20],[.20,-.1],[.20,.06],[.28,.14],[1.72,.20],[1.85,.25],[1.85,.30],[1.78,.33],[0,.33]],porcelain);
  ring(1.83,.018,.30,gold); ring(.54,.013,-.30,gold);
  mesh(new THREE.CylinderGeometry(1.59,1.59,.05,100),gold,model,0,.35,0);
  function tier(radius,bottom,height,material) {
    lathe([[0,0],[radius-.06,0],[radius,.04],[radius,height-.055],[radius-.025,height],[0,height]],material,bottom);
  }
  tier(1.40,.38,1.02,vanilla); tier(.98,1.44,.73,blush);
  const flutes=[];
  for(let i=0;i<88;i++){const a=i/88*Math.PI*2;flutes.push({p:[Math.cos(a)*1.391,.88,Math.sin(a)*1.391],s:[.027,.405,.027]});}
  instances(sphere,rose,flutes);
  ring(1.405,.018,.46,gold); ring(1.005,.012,1.56,gold);
  function frosting(radius,top,depth,frequency) {
    mesh(new THREE.CylinderGeometry(radius,radius,.065,96),glaze,model,0,top+.01,0);
    const positions=[],indices=[];
    const n=192;
    for(let i=0;i<=n;i++){
      const a=i/n*Math.PI*2;
      const drip=.045+depth*Math.pow((Math.cos(a*frequency)+1)/2,3)*( .75+.25*Math.cos(a*3));
      for(let j=0;j<3;j++){
        const r=radius+(j===2?-.008:.007);
        positions.push(Math.cos(a)*r,top+.02-j/2*drip,Math.sin(a)*r);
      }
      if(i<n){const k=i*3;indices.push(k,k+3,k+1,k+1,k+3,k+4,k+1,k+4,k+2,k+2,k+4,k+5);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
    const coating=glaze.clone();coating.side=THREE.DoubleSide;mesh(g,coating);
  }
  frosting(1.42,1.42,.25,18); frosting(1.002,2.19,.21,13);
  // Twisted six-point piping geometry, instanced around the borders.
  const pipedPositions=[],pipedIndices=[];
  for(let row=0;row<=18;row++){
    const t=row/18;
    for(let j=0;j<=36;j++){
      const a=j/36*Math.PI*2;
      const r=Math.pow(Math.sin(Math.PI*t),.65)*.112*(1-t*.3)*(1+.18*Math.cos(6*a-t*4));
      pipedPositions.push(Math.cos(a)*r+t*t*.028,t*.22,Math.sin(a)*r);
      if(row<18&&j<36){const k=row*37+j;pipedIndices.push(k,k+37,k+1,k+1,k+37,k+38);}
    }
  }
  const pipeGeo=new THREE.BufferGeometry();pipeGeo.setAttribute('position',new THREE.Float32BufferAttribute(pipedPositions,3));pipeGeo.setIndex(pipedIndices);pipeGeo.computeVertexNormals();
  const pipes=[];
  for(const [r,y,n,s] of [[1.36,.39,44,.85],[1.28,1.455,32,1],[.89,2.225,22,.78]])for(let i=0;i<n;i++){const a=i/n*Math.PI*2;pipes.push({p:[Math.cos(a)*r,y,Math.sin(a)*r],r:[0,-a,0],s:[s,s,s]});}
  instances(pipeGeo,ivory,pipes);
  const pearls=[];
  for(let i=0;i<70;i++){const a=i/70*Math.PI*2;pearls.push({p:[Math.cos(a)*1.46,.39,Math.sin(a)*1.46],s:[.028,.028,.028]});}
  instances(sphere,gold,pearls);
  // Sculpted berries, leafy crowns, and individually placed seeds.
  const berryProfile=[[0,0],[.055,.03],[.11,.08],[.155,.16],[.17,.22],[.145,.29],[.065,.335],[0,.34]];
  const berryGeometry=new THREE.LatheGeometry(berryProfile.map(p=>new THREE.Vector2(...p)),24);
  const seedTransforms=[],leafTransforms=[];
  const berries=[[-.71,1.47,.87],[.78,1.47,.86],[1.13,1.47,-.28],[-1.12,1.47,-.34],[.60,2.235,-.13],[-.59,2.235,-.16],[0,2.235,.70]];
  berries.forEach(([x,y,z],index)=>{
    mesh(berryGeometry,berryMat,model,x,y,z);
    for(let row=0;row<6;row++){
      const yy=.07+row*.043,rr=yy<.21?.1+(yy-.07)*.5:.17-(yy-.21)*.55;
      const n=9+row%2;
      for(let k=0;k<n;k++){const a=k/n*Math.PI*2+row*.37;seedTransforms.push({p:[x+Math.cos(a)*(rr+.005),y+yy,z+Math.sin(a)*(rr+.005)],r:[0,-a+Math.PI/2,.15],s:[.008,.014,.007]});}
    }
    for(let k=0;k<5;k++){const a=k/5*Math.PI*2+index;leafTransforms.push({p:[x+Math.cos(a)*.055,y+.335,z+Math.sin(a)*.055],r:[0,-a,Math.cos(a)*.15],s:[.085,.012,.035]});}
  });
  instances(sphere,seedMat,seedTransforms); instances(sphere,leaf,leafTransforms);
  // Delicate sugar daisies arranged on the ledge.
  const petals=[],centres=[];
  [[.13,1.48,1.17],[-.95,1.48,.65],[.91,1.48,-.74],[-.47,2.23,.49]].forEach(([x,y,z])=>{
    for(let k=0;k<7;k++){const a=k/7*Math.PI*2;petals.push({p:[x+Math.cos(a)*.08,y+.015,z+Math.sin(a)*.08],r:[0,-a,0],s:[.08,.022,.038]});}
    centres.push({p:[x,y+.035,z],s:[.035,.025,.035]});
  });
  instances(sphere,ivory,petals);instances(sphere,gold,centres);
  // The gold birthday hoop and double-sided calligraphic plaque.
  const hoop=mesh(new THREE.TorusGeometry(.53,.013,10,100),gold,model,0,3.03,-.45);
  for(const x of [-.34,.34])mesh(new THREE.CylinderGeometry(.009,.009,.75,8),gold,model,x,2.53,-.45);
  const labelCanvas=document.createElement('canvas');labelCanvas.width=1024;labelCanvas.height=512;
  const labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;
  function drawLabel(){const ctx=labelCanvas.getContext('2d');ctx.clearRect(0,0,1024,512);ctx.textAlign='center';ctx.fillStyle='#d6aa66';ctx.font='38px Georgia';ctx.fillText('H A P P Y  B I R T H D A Y',512,145);ctx.font='170px Pacifico, cursive';ctx.fillText('Mel',512,330);ctx.font='32px Georgia';ctx.fillText('WITH LOVE',512,422);labelTexture.needsUpdate=true;}
  drawLabel();document.fonts.ready.then(drawLabel);
  const label=mesh(new THREE.PlaneGeometry(1.25,.625),new THREE.MeshBasicMaterial({map:labelTexture,transparent:true,side:THREE.DoubleSide,depthWrite:false}),model,0,3.05,-.43);label.castShadow=false;
  // Candles are coupled to the original quiz/letter flow through the DOM state.
  const candles=[],hits=[];
  const candlePlaces=[[-.4,.23],[0,-.02],[.4,.23]];
  const waxMaterials=[mat('#cc738e',.36),mat('#f1d3a9',.4),mat('#cc738e',.36)];
  candlePlaces.forEach(([x,z],index)=>{
    const group=new THREE.Group();group.position.set(x,2.25,z);model.add(group);
    const wax=mesh(new THREE.CylinderGeometry(.047,.047,.48,18),waxMaterials[index],group,0,.24,0);
    const spiral=[];for(let i=0;i<=100;i++){const a=i/100*Math.PI*2*4;spiral.push(new THREE.Vector3(Math.cos(a)*.048,.03+i/100*.42,Math.sin(a)*.048));}
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral),90,.007,5,false),gold,group);
    mesh(new THREE.CylinderGeometry(.007,.007,.05,8),wickMat,group,0,.505,0);
    const flameShape=new THREE.LatheGeometry([[0,-1],[.65,-.85],[1,-.45],[.78,.2],[.38,.65],[0,1.5]].map(p=>new THREE.Vector2(...p)),20);
    const flame=mesh(flameShape,new THREE.MeshBasicMaterial({color:'#ffb238',transparent:true,opacity:.9}),group,0,.61,0);flame.scale.set(.044,.11,.044);flame.castShadow=false;
    const core=mesh(sphere,new THREE.MeshBasicMaterial({color:'#fff8d2'}),group,0,.58,.018);core.scale.set(.022,.052,.022);core.castShadow=false;
    const light=new THREE.PointLight(0xffa24a,0,2.5,2);light.position.set(0,.65,0);group.add(light);
    const target=mesh(new THREE.CylinderGeometry(.16,.15,.8,12),new THREE.MeshBasicMaterial({visible:false}),group,0,.38,0);target.userData.candle=index;hits.push(target);
    candles.push({group,flame,core,light,wasOut:false});
  });
  // Floating steam wisps are local geometry, never an external texture request.
  const smoke=[];
  function emitSmoke(index){for(let i=0;i<5;i++){const m=mesh(sphere,new THREE.MeshBasicMaterial({color:'#ddd2d4',transparent:true,opacity:.25,depthWrite:false}),model,...[candlePlaces[index][0],2.84,candlePlaces[index][1]]);m.castShadow=false;m.scale.setScalar(.02);smoke.push({mesh:m,age:-i*.1,seed:i});}}
  const ground=mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.17}),scene,0,-.38,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  // Soft contact shadow complements the real directional shadow on lower-powered devices.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,10,64,64,62);gradient.addColorStop(0,'rgba(35,12,20,.35)');gradient.addColorStop(1,'rgba(35,12,20,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const shadow=mesh(new THREE.PlaneGeometry(4.5,4.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),scene,0,-.37,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;

  let yaw=.18,targetYaw=.18,elevation=.29,targetElevation=.29,zoom=1,auto=!reduced.matches,frame=0,last=0,inView=true;
  let press=null,dragging=false,spinVelocity=0,darkBlend=0,failed=false;
  const pointers=new Map(); let pinchDistance=0;
  const autoButton=document.getElementById('cake-auto');
  function setAuto(value){auto=value;autoButton.setAttribute('aria-pressed',String(value));autoButton.textContent=value?'Ⅱ หยุดหมุน':'▶ หมุนช้าๆ';}
  setAuto(auto);
  const cameraTarget=new THREE.Vector3(0,1.57,0);
  function resize(){const r=viewport.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
  function syncCandles(){candles.forEach((c,i)=>{const lit=candleNodes[i].classList.contains('lit')&&!candleNodes[i].classList.contains('out');const out=candleNodes[i].classList.contains('out');c.flame.visible=c.core.visible=lit;c.light.intensity=lit?.65:0;if(out&&!c.wasOut)emitSmoke(i);c.wasOut=out;});}
  new MutationObserver(syncCandles).observe(document.querySelector('.candle-row'),{subtree:true,attributes:true,attributeFilter:['class']});syncCandles();
  function render(time){
    frame=0;if(failed||document.hidden||!screen.classList.contains('active')||!inView){last=0;return;}
    const dt=Math.min((time-(last||time))/1000,.05);last=time;
    if(auto&&!dragging)targetYaw+=dt*.12;
    if(!dragging&&!reduced.matches){targetYaw+=spinVelocity*dt;spinVelocity*=Math.exp(-dt*6);}
    const smoothing=reduced.matches?1:1-Math.exp(-dt*10);
    yaw+=(targetYaw-yaw)*smoothing;elevation+=(targetElevation-elevation)*smoothing;
    model.rotation.y=yaw;
    const narrow=Math.max(1,.88/camera.aspect),distance=7.8*narrow/zoom;
    camera.position.set(0,1.57+Math.sin(elevation)*distance,Math.cos(elevation)*distance);camera.lookAt(cameraTarget);
    darkBlend+=((document.body.classList.contains('lights-off')?1:0)-darkBlend)*(1-Math.exp(-dt*2));
    ambient.intensity=1.5-darkBlend*.45;key.intensity=3.2-darkBlend*.85;fill.intensity=.9-darkBlend*.25;scene.environmentIntensity=.65-darkBlend*.2;
    candles.forEach((c,i)=>{if(c.flame.visible){const f=reduced.matches?1:1+Math.sin(time*.009+i*3)*.09;c.flame.scale.set(.044*f,.11/f,.044*f);c.light.intensity=.65*f;}});
    for(let i=smoke.length-1;i>=0;i--){const s=smoke[i];s.age+=dt;if(s.age<0)continue;s.mesh.position.y+=dt*.24;s.mesh.position.x+=Math.sin(s.age*5+s.seed)*dt*.04;s.mesh.scale.setScalar(.025+s.age*.07);s.mesh.material.opacity=Math.max(0,.25-s.age*.15);if(s.age>1.7){model.remove(s.mesh);s.mesh.material.dispose();smoke.splice(i,1);}}
    renderer.render(scene,camera);
    viewport.dataset.yaw=yaw.toFixed(3);viewport.dataset.lit=String(candles.filter(c=>c.flame.visible).length);
    frame=requestAnimationFrame(render);
  }
  function resume(){if(!failed&&!frame&&!document.hidden&&screen.classList.contains('active')&&inView)frame=requestAnimationFrame(render);}
  function halt(){cancelAnimationFrame(frame);frame=0;last=0;}
  function reconcile(){if(document.hidden||!screen.classList.contains('active')||!inView)halt();else resume();}
  new MutationObserver(reconcile).observe(screen,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',reconcile);
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;reconcile();}).observe(viewport);
  new ResizeObserver(resize).observe(viewport);
  reduced.addEventListener('change',()=>{setAuto(false);spinVelocity=0;});
  function begin(event){if(event.button!==0)return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});viewport.setPointerCapture(event.pointerId);setAuto(false);spinVelocity=0;
    if(pointers.size===1){press={x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,time:performance.now()};dragging=true;}
    else{const p=[...pointers.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);press=null;}}
  viewport.addEventListener('pointerdown',begin);
  viewport.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinchDistance)zoom=THREE.MathUtils.clamp(zoom*d/pinchDistance,.85,1.3);pinchDistance=d;document.getElementById('cake-zoom').value=zoom;return;}
    if(!press)return;const dx=event.clientX-press.lastX,dy=event.clientY-press.lastY;
    targetYaw+=dx*.009;targetElevation=THREE.MathUtils.clamp(targetElevation+dy*.005,.04,.85);
    spinVelocity=dx*.09;press.lastX=event.clientX;press.lastY=event.clientY;
  });
  const raycaster=new THREE.Raycaster();
  function finish(event,cancelled=false){
    if(press&&!cancelled&&Math.hypot(event.clientX-press.x,event.clientY-press.y)<7&&performance.now()-press.time<600){
      const r=viewport.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);
      const hit=raycaster.intersectObjects(hits)[0];if(hit)candleNodes[hit.object.userData.candle].click();
    }
    pointers.delete(event.pointerId);press=null;dragging=pointers.size>0;if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
    if(cancelled)spinVelocity=0;
  }
  viewport.addEventListener('pointerup',event=>finish(event));viewport.addEventListener('pointercancel',event=>finish(event,true));
  viewport.addEventListener('lostpointercapture',event=>{pointers.delete(event.pointerId);press=null;dragging=false;});
  function rotate(delta){setAuto(false);spinVelocity=0;targetYaw+=delta;}
  document.getElementById('cake-rotate-left').addEventListener('click',()=>rotate(-Math.PI/6));
  document.getElementById('cake-rotate-right').addEventListener('click',()=>rotate(Math.PI/6));
  autoButton.addEventListener('click',()=>setAuto(!auto));
  document.getElementById('cake-reset').addEventListener('click',()=>{targetYaw=.18;targetElevation=.29;zoom=1;spinVelocity=0;setAuto(false);document.getElementById('cake-zoom').value=1;});
  document.getElementById('cake-zoom').addEventListener('input',e=>{zoom=Number(e.target.value);});
  viewport.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();if(event.key==='ArrowLeft')rotate(-.2);if(event.key==='ArrowRight')rotate(.2);if(event.key==='ArrowUp')targetElevation=Math.min(.85,targetElevation+.1);if(event.key==='ArrowDown')targetElevation=Math.max(.04,targetElevation-.1);if(event.key==='Home')document.getElementById('cake-reset').click();});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();failed=true;halt();atelier.hidden=true;screen.classList.remove('has-3d');screen.dataset.renderer='fallback';});
  atelier.hidden=false;resize();
  renderer.render(scene,camera);
  screen.classList.add('has-3d');screen.dataset.renderer='webgl';
  resume();
}
