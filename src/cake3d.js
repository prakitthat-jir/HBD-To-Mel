import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $=id=>document.getElementById(id), screen=$('screen-cake'), canvas=$('cake-canvas');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true}); }
catch {
  // A canvas cannot switch from WebGL to 2D, so use a fresh canvas for fallback.
  canvas.replaceWith(canvas.cloneNode());screen.dataset.renderer='fallback';
  const script=document.createElement('script');script.src='assets/cake-decorator.js';document.head.append(script);
}
if(renderer) initialize();

function initialize(){
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(0,0);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,40);
  const model=new THREE.Group(),base=new THREE.Group(),art=new THREE.Group();scene.add(model);model.add(base,art);
  const env=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),envTarget=pmrem.fromScene(env,.04);
  scene.environment=envTarget.texture;scene.environmentIntensity=.65;env.dispose();pmrem.dispose();
  const ambient=new THREE.HemisphereLight('#fff3df','#796079',1.5);scene.add(ambient);
  const key=new THREE.DirectionalLight('#ffe6c3',3.3);key.position.set(-3,6,4);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-3,right:3,top:5,bottom:-2});key.shadow.normalBias=.025;key.shadow.bias=-.0002;scene.add(key);
  const rim=new THREE.DirectionalLight('#ffc2d7',2);rim.position.set(3,4,-3);scene.add(rim);
  const fill=new THREE.DirectionalLight('#dce5ff',1.1);fill.position.set(2,2,5);scene.add(fill);
  const material=(color,roughness=.6,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const gold=material('#d6ab69',.22,.82),ivory=material('#fff6e9',.58),rose=material('#d590a5',.4),leaf=material('#46744b',.6);
  const berryMat=new THREE.MeshPhysicalMaterial({color:'#b82740',roughness:.32,clearcoat:.45});
  const cherryMat=new THREE.MeshPhysicalMaterial({color:'#820d29',roughness:.2,clearcoat:.7});
  const chocolate=material('#3d2020',.35),seedMat=material('#edc57e',.5),wick=material('#35212b',1);
  const porcelain=new THREE.MeshPhysicalMaterial({color:'#f2e0d4',roughness:.25,clearcoat:.6});
  const sphere=new THREE.SphereGeometry(1,16,12),dummy=new THREE.Object3D();
  const topColor=new THREE.Color('#f5a9bd');let targetColor=topColor.clone();
  const cakeMat=material('#f5a9bd',.72),glaze=new THREE.MeshPhysicalMaterial({color:'#fff6e9',roughness:.32,clearcoat:.35,side:THREE.DoubleSide});
  function mesh(g,m,parent,x=0,y=0,z=0){const v=new THREE.Mesh(g,m);v.position.set(x,y,z);v.castShadow=true;v.receiveShadow=true;parent.add(v);return v;}
  function orb(parent,m,x,y,z,sx,sy=sx,sz=sx){const v=mesh(sphere,m,parent,x,y,z);v.scale.set(sx,sy,sz);return v;}
  function ring(parent,r,t,y,m=gold){const v=mesh(new THREE.TorusGeometry(r,t,10,96),m,parent,0,y,0);v.rotation.x=Math.PI/2;return v;}
  function lathe(parent,profile,m,y=0){return mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),80),m,parent,0,y,0);}
  function batch(parent,g,m,transforms){const b=new THREE.InstancedMesh(g,m,transforms.length);transforms.forEach((t,i)=>{dummy.position.set(...t.p);dummy.rotation.set(...(t.r||[0,0,0]));dummy.scale.set(...(t.s||[1,1,1]));dummy.updateMatrix();b.setMatrixAt(i,dummy.matrix);});b.castShadow=true;b.receiveShadow=true;parent.add(b);return b;}
  function tube(parent,points,r,m){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(16,points.length*3),r,7,false),m,parent);}
  // Shared sculpted six-ridge cream tip, used for both borders and individual toppings.
  const vertices=[],indices=[];
  for(let row=0;row<=16;row++)for(let j=0;j<=30;j++){
    const t=row/16,a=j/30*Math.PI*2,r=Math.pow(Math.sin(Math.PI*t),.65)*.115*(1-t*.3)*(1+.18*Math.cos(6*a-t*4));
    vertices.push(Math.cos(a)*r+t*t*.03,t*.23,Math.sin(a)*r);
    if(row<16&&j<30){const k=row*31+j;indices.push(k,k+31,k+1,k+1,k+31,k+32);}
  }
  const pipeGeo=new THREE.BufferGeometry();pipeGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));pipeGeo.setIndex(indices);pipeGeo.computeVertexNormals();
  const berryGeo=new THREE.LatheGeometry([[0,0],[.055,.03],[.11,.08],[.155,.16],[.17,.22],[.145,.29],[.065,.335],[0,.34]].map(p=>new THREE.Vector2(...p)),24);
  const seedTransforms=[],leafTransforms=[];
  for(let row=0;row<6;row++){const y=.07+row*.043,r=y<.21?.1+(y-.07)*.5:.17-(y-.21)*.55;for(let k=0;k<10;k++){const a=k/10*Math.PI*2+row*.37;seedTransforms.push({p:[Math.cos(a)*(r+.005),y,Math.sin(a)*(r+.005)],r:[0,-a+Math.PI/2,.15],s:[.008,.014,.007]});}}
  for(let k=0;k<5;k++){const a=k/5*Math.PI*2;leafTransforms.push({p:[Math.cos(a)*.055,.335,Math.sin(a)*.055],r:[0,-a,.12],s:[.085,.012,.035]});}
  const templates=new Map(),toppingData=[['strawberry','🍓','สตรอว์เบอร์รี'],['cherry','🍒','เชอร์รี'],['cream','🧁','วิปครีม'],['flower','🌸','ดอกน้ำตาล'],['bow','🎀','โบว์'],['chocolate','🍫','ช็อกโกแลต'],['candle','🕯️','เทียน'],['sprinkles','✨','ไข่มุกทอง'],['oreo','🍪','คุกกี้โอริโอ้'],['macaron','🧁','มาการอง'],['heart','💗','หัวใจน้ำตาล'],['star','⭐','ดาวทอง'],['blueberry','🫐','บลูเบอร์รี']];
  function template(type){
    if(templates.has(type))return templates.get(type);
    const g=new THREE.Group();
    if(type==='strawberry'){mesh(berryGeo,berryMat,g);batch(g,sphere,seedMat,seedTransforms);batch(g,sphere,leaf,leafTransforms);}
    if(type==='cream'){mesh(pipeGeo,ivory,g).scale.setScalar(1.55);orb(g,gold,.02,.33,0,.022);}
    if(type==='cherry'){
      orb(g,cherryMat,-.07,.115,0,.115);orb(g,cherryMat,.09,.11,.045,.11);
      tube(g,[[-.07,.2,0],[-.04,.38,.01],[.02,.45,0]],.012,leaf);tube(g,[[.09,.19,.04],[.08,.35,.01],[.02,.45,0]],.01,leaf);orb(g,leaf,.075,.40,0,.07,.013,.027);
    }
    if(type==='flower'){
      for(let layer=0;layer<2;layer++)for(let i=0;i<7;i++){const a=i/7*Math.PI*2+layer*.4;const p=orb(g,layer?ivory:rose,Math.cos(a)*(.1-layer*.025),.025+layer*.025,Math.sin(a)*(.1-layer*.025),.1-layer*.018,.025,.047);p.rotation.y=-a;}
      orb(g,gold,0,.08,0,.043,.027,.043);
    }
    if(type==='bow'){
      for(const side of [-1,1]){
        const curve=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;curve.push([side*(.11-.1*Math.cos(a)),.11+Math.sin(a)*.08,Math.sin(a)*.035]);}
        tube(g,curve,.025,rose);tube(g,[[0,.11,0],[side*.06,.045,.06],[side*.09,.005,.16]],.028,rose);
      }orb(g,gold,0,.11,0,.04,.045,.03);
    }
    if(type==='chocolate'){
      const slab=mesh(new THREE.BoxGeometry(.27,.055,.34),chocolate,g,0,.05,0);slab.rotation.z=.12;
      for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)mesh(new THREE.BoxGeometry(.072,.025,.09),chocolate,g,x*.082,.09,z*.102);
      tube(g,[[-.1,.12,-.15],[-.02,.12,-.03],[.08,.12,.15]],.008,gold);
    }
    if(type==='sprinkles'){
      const colors=[gold,rose,ivory];for(let i=0;i<9;i++){const a=i*2.4,r=.035+Math.sqrt(i)*.035;orb(g,colors[i%3],Math.cos(a)*r,.025,Math.sin(a)*r,.021);}
    }
    if(type==='candle'){
      mesh(new THREE.CylinderGeometry(.045,.045,.48,18),rose,g,0,.24,0);
      const spiral=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*8;spiral.push([Math.cos(a)*.047,.03+i/80*.42,Math.sin(a)*.047]);}tube(g,spiral,.006,gold);
      mesh(new THREE.CylinderGeometry(.006,.006,.05,8),wick,g,0,.505,0);
      const flame=orb(g,new THREE.MeshBasicMaterial({color:'#ffb34d'}),0,.59,0,.043,.1,.043);flame.name='flame';flame.castShadow=false;
      const core=orb(g,new THREE.MeshBasicMaterial({color:'#fff6cb'}),0,.57,.015,.022,.05,.022);core.name='core';core.castShadow=false;
    }
    if(type==='oreo'){
      const dark=material('#282026',.78);for(const y of [.045,.115]){mesh(new THREE.CylinderGeometry(.17,.17,.055,32),dark,g,0,y,0);ring(g,.15,.009,y+.03,dark);}
      mesh(new THREE.CylinderGeometry(.151,.151,.028,32),ivory,g,0,.08,0);
      for(let i=0;i<12;i++){const a=i/12*Math.PI*2;orb(g,dark,Math.cos(a)*.1,.15,Math.sin(a)*.1,.019,.009,.019);}orb(g,dark,0,.15,0,.055,.01,.055);
    }
    if(type==='macaron'){
      for(const y of [.055,.15])orb(g,rose,0,y,0,.17,.07,.17);
      mesh(new THREE.CylinderGeometry(.155,.155,.045,28),ivory,g,0,.103,0);
      for(const y of [.075,.13])for(let i=0;i<24;i++){const a=i/24*Math.PI*2;orb(g,rose,Math.cos(a)*.153,y,Math.sin(a)*.153,.016,.018,.016);}
    }
    if(type==='blueberry'){
      const blue=material('#414366',.52);for(const [x,y,z] of [[-.06,.085,0],[.07,.08,.04],[0,.19,.02]]){orb(g,blue,x,y,z,.085);const crown=mesh(new THREE.TorusGeometry(.025,.007,5,7),blue,g,x,y+.079,z);crown.rotation.x=Math.PI/2;}
    }
    if(type==='star'||type==='heart'){
      const shape=new THREE.Shape();
      if(type==='star'){for(let i=0;i<10;i++){const a=i/10*Math.PI*2+Math.PI/2,r=i%2?.08:.18;if(i)shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);else shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();}
      else{shape.moveTo(0,-.15);shape.bezierCurveTo(-.34,.07,-.13,.28,0,.12);shape.bezierCurveTo(.13,.28,.34,.07,0,-.15);}
      const v=mesh(new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:2,steps:1}),type==='star'?gold:rose,g,0,.19,0);
    }
    templates.set(type,g);return g;
  }
  // Serialized cake state is independent of render meshes, so undo restores complete edits.
  const layout=count=>Array.from({length:count},(_,i)=>({r:1.4-i*.38,b:.38+i*.86,h:.82}));
  let nextID=0;
  const record=(type,p,extra={})=>({id:++nextID,type,p,n:[0,1,0],scale:1,angle:0,lit:true,...extra});
  const FLAVORS=[['#f5a9bd','สตรอว์เบอร์รี'],['#664035','ช็อกโกแลต'],['#f5e5bb','วานิลลา'],['#b4cc8e','มัทฉะ'],['#fff4dc','นม'],['#c9bfb0','โอริโอ้'],['#c7d6a3','มัทฉะลาเต้'],['#a47755','กาแฟ']];
  function initial(){return {size:2,flavor:'#f5a9bd',tiers:Array.from({length:3},()=>({flavor:'#f5a9bd',layers:2,filling:'#fff6e9'})),topper:true,frosting:'drip',frostColor:'#fff6e9',items:[],strokes:[]};}
  let phase='decorate',editingTier=0,placementScale=1;
  let cake=initial(),history=[],selectedID=null,tool='orbit',selectedType='strawberry',gala=false;
  let surfaces=[],bodyMaterials=[],itemMeshes=new Map(),labelTexture=null;
  const sound=()=>document.dispatchEvent(new Event('cake-sound'));
  const status=text=>{$('decorator-status').textContent=text;};
  const copy=v=>JSON.parse(JSON.stringify(v));
  function remember(){history.push(copy(cake));if(history.length>40)history.shift();}
  // Only dispose geometry owned by a rebuilt group, never the shared topping templates.
  function clearGroup(group){const geometries=new Set();group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&o.geometry!==sphere&&o.geometry!==pipeGeo)geometries.add(o.geometry);});group.clear();geometries.forEach(g=>g.dispose());}
  function buildBase(){
    clearGroup(base);bodyMaterials.forEach(m=>m.dispose());bodyMaterials=[];surfaces=[];labelTexture?.dispose();
    glaze.color.set(cake.frostColor);targetColor.set(cake.flavor);
    lathe(base,[[0,-.36],[.5,-.36],[.58,-.31],[.55,-.25],[.28,-.2],[.20,-.1],[.20,.06],[.28,.14],[1.72,.20],[1.85,.25],[1.85,.30],[1.78,.33],[0,.33]],porcelain);
    ring(base,1.83,.018,.30);ring(base,.54,.013,-.3);mesh(new THREE.CylinderGeometry(1.59,1.59,.05,96),gold,base,0,.35,0);
    for(const [i,t] of layout(cake.size).entries()){
      const top=t.b+t.h;
      const tier=cake.tiers[i],sponge=material(tier.flavor,.75),filling=material(tier.filling,.5);bodyMaterials.push(sponge,filling);
      const segment=t.h/tier.layers,gap=tier.layers>1?.045:0;
      for(let layer=0;layer<tier.layers;layer++){
        const height=segment-(layer<tier.layers-1?gap:0),y=t.b+layer*segment;
        const body=lathe(base,[[0,0],[t.r-.025,0],[t.r,.025],[t.r,height-.02],[t.r-.015,height],[0,height]],sponge,y);surfaces.push(body);
        if(layer<tier.layers-1){const stripe=mesh(new THREE.CylinderGeometry(t.r-.005,t.r-.005,gap,80),filling,base,0,y+height+gap/2,0);surfaces.push(stripe);}
      }
      if(tier.flavor==='#c9bfb0'){
        const crumbs=[];for(let n=0;n<100;n++){const angle=n*2.399;crumbs.push({p:[Math.cos(angle)*(t.r+.005),t.b+.07+((n*37)%100)/100*(t.h-.15),Math.sin(angle)*(t.r+.005)],s:[.018,.012,.015],r:[n,0,n*.7]});}batch(base,sphere,chocolate,crumbs);
      }
      if(tier.flavor==='#c7d6a3'){const stripe=mesh(new THREE.CylinderGeometry(t.r+.004,t.r+.004,.12,80),ivory,base,0,t.b+.13,0);surfaces.push(stripe);}
      ring(base,t.r+.006,.012,t.b+.095);ring(base,t.r+.006,.012,t.b+.18);
      if(cake.frosting!=='none'){
        const topMesh=mesh(new THREE.CylinderGeometry(t.r+.016,t.r+.016,.05,80),glaze,base,0,top+.012,0);surfaces.push(topMesh);
        if(cake.frosting==='drip'){
          const p=[],ind=[],n=144;for(let j=0;j<=n;j++){const a=j/n*Math.PI*2,d=.045+.21*Math.pow((Math.cos(a*(18-i*4))+1)/2,3);for(let k=0;k<2;k++)p.push(Math.cos(a)*(t.r+.02),top+.015-k*d,Math.sin(a)*(t.r+.02));if(j<n){const k=j*2;ind.push(k,k+2,k+1,k+1,k+2,k+3);}}
          const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(ind);geo.computeVertexNormals();mesh(geo,glaze,base);
        }
        if(cake.frosting!=='smooth'){
          const pipes=[];for(const [r,y,n,s] of [[t.r-.01,t.b+.015,44-i*10,.78],[t.r-.07,top+.045,36-i*8,.76]])for(let j=0;j<n;j++){const a=j/n*Math.PI*2;pipes.push({p:[Math.cos(a)*r,y,Math.sin(a)*r],r:[0,-a,0],s:[s,s,s]});}batch(base,pipeGeo,glaze,pipes);
        }
      }
      const pearls=[];for(let k=0;k<54;k++){const a=k/54*Math.PI*2;pearls.push({p:[Math.cos(a)*(t.r+.035),t.b+.015,Math.sin(a)*(t.r+.035)],s:[.024,.024,.024]});}batch(base,sphere,gold,pearls);
    }
    if(!cake.topper)return;
    const top=layout(cake.size).at(-1).b+.82;
    const hoop=mesh(new THREE.TorusGeometry(.53,.014,10,100),gold,base,0,top+.85,-.37);
    for(const x of [-.34,.34])mesh(new THREE.CylinderGeometry(.009,.009,.65,8),gold,base,x,top+.32,-.37);
    const label=document.createElement('canvas');label.width=1024;label.height=512;const c=label.getContext('2d');
    c.textAlign='center';c.fillStyle='#d3a65e';c.font='36px Georgia';c.fillText('H A P P Y  B I R T H D A Y',512,155);c.font='170px Pacifico, cursive';c.fillText('Mel',512,335);c.font='28px Georgia';c.fillText('A LITTLE MAGIC, JUST FOR YOU',512,422);
    labelTexture=new THREE.CanvasTexture(label);labelTexture.colorSpace=THREE.SRGBColorSpace;
    const labelMat=new THREE.MeshBasicMaterial({map:labelTexture,transparent:true,side:THREE.DoubleSide,depthWrite:false});bodyMaterials.push(labelMat);
    mesh(new THREE.PlaneGeometry(1.2,.6),labelMat,base,0,top+.85,-.35).castShadow=false;
    // Small stars crown the gold hoop, rather than using flat emoji sprites.
    for(const [x,y,s] of [[-.48,top+1.25,.07],[.43,top+1.26,.095],[.1,top+1.47,.055]]){
      const shape=new THREE.Shape();for(let k=0;k<10;k++){const a=k/10*Math.PI*2+Math.PI/2,r=k%2?s*.42:s;if(!k)shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();mesh(new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:false}),gold,base,x,y,-.37);
    }
  }
  const placementRing=ring(model,.19,.008,0,new THREE.MeshBasicMaterial({color:'#e9b365',transparent:true,opacity:.8,depthTest:false}));placementRing.visible=false;placementRing.renderOrder=8;placementRing.castShadow=false;
  const selectionRing=ring(model,.22,.009,0,new THREE.MeshBasicMaterial({color:'#f5c871',transparent:true,opacity:.85}));selectionRing.visible=false;selectionRing.castShadow=false;
  function buildArt(){
    // Mesh clones share cached geometries and materials; rebuilding never allocates
    // a second copy of strawberry seeds or leaves for every undo operation.
    art.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.owned){o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();}});art.clear();itemMeshes.clear();
    for(const item of cake.items){
      const anchor=new THREE.Group(),g=new THREE.Group();anchor.position.fromArray(item.p);anchor.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...item.n));g.rotation.y=THREE.MathUtils.degToRad(item.angle);g.scale.setScalar(item.scale);anchor.add(g);anchor.userData.itemID=item.id;art.add(anchor);
      if(item.type==='text'){
        const c=document.createElement('canvas');c.width=1024;c.height=256;const context=c.getContext('2d');context.fillStyle=item.color;context.textAlign='center';context.font='bold 70px sans-serif';context.fillText(item.text,512,155,960);
        const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
        const m=mesh(new THREE.PlaneGeometry(1.2,.3),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false}),g,0,.017,0);m.rotation.x=-Math.PI/2;m.userData.owned=true;m.castShadow=false;
      }else g.add(template(item.type).clone(true));
      anchor.traverse(o=>{if(o.name==='flame'||o.name==='core')o.visible=phase==='show'&&item.lit;});itemMeshes.set(item.id,anchor);
    }
    for(const stroke of cake.strokes){
      if(!stroke.points.length)continue;const m=material(stroke.color,.48);
      if(stroke.points.length===1){const dot=mesh(new THREE.SphereGeometry(stroke.width,10,8),m,art,...stroke.points[0]);dot.userData.owned=true;}
      else {const line=tube(art,stroke.points,stroke.width,m);line.userData.owned=true;}
    }
    sync();
  }
  function sync(){
    editingTier=Math.min(editingTier,cake.size-1);$('cake-flavor').value=cake.tiers[editingTier].flavor;$('cake-layers').value=cake.tiers[editingTier].layers;$('cake-filling').value=cake.tiers[editingTier].filling;$('cake-topper').checked=cake.topper;$('cake-size').value=cake.size;$('cake-frosting').value=cake.frosting;$('cake-frost-color').value=cake.frostColor;$('cake-undo').disabled=!history.length;
    canvas.dataset.items=cake.items.length;canvas.dataset.strokes=cake.strokes.length;canvas.dataset.lit=phase==='show'?cake.items.filter(i=>i.type==='candle'&&i.lit).length:0;canvas.dataset.candles=cake.items.filter(i=>i.type==='candle').length;canvas.dataset.tiers=JSON.stringify(cake.tiers.slice(0,cake.size));canvas.dataset.selected=selectedID||'';
    const item=cake.items.find(i=>i.id===selectedID);$('cake-selection').hidden=!item;selectionRing.visible=!!item&&phase==='decorate';
    if(item){$('cake-selected-name').textContent='กำลังแก้ไข: '+(toppingData.find(t=>t[0]===item.type)?.[2]||'ข้อความ');$('cake-item-scale').value=item.scale;$('cake-item-angle').value=item.angle;selectionRing.position.fromArray(item.p);selectionRing.quaternion.copy(itemMeshes.get(item.id).quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));selectionRing.scale.setScalar(item.scale);}
    renderTierControls();renderInventory();syncShow();
  }
  function changed(message,rebuildBase=false){if(rebuildBase)buildBase();buildArt();sound();if(message)status(message);}
  // Porcelain pedestal contact shadow and subtle floating gold dust.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const sc=shadowCanvas.getContext('2d'),gradient=sc.createRadialGradient(64,64,8,64,64,62);gradient.addColorStop(0,'rgba(62,30,30,.32)');gradient.addColorStop(1,'rgba(62,30,30,0)');sc.fillStyle=gradient;sc.fillRect(0,0,128,128);
  const ground=mesh(new THREE.PlaneGeometry(5,5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),scene,0,-.37,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  const dustPositions=[];for(let i=0;i<70;i++){const a=i*2.399,r=2.1+(i%7)*.09;dustPositions.push(Math.cos(a)*r,.1+(i%19)*.18,Math.sin(a)*r);}
  const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3));
  const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:'#e8c08d',size:.018,transparent:true,opacity:.55,depthWrite:false}));scene.add(dust);
  let yaw=.18,targetYaw=.18,elevation=.38,targetElevation=.38,zoom=1,auto=!reduced.matches,frame=0,last=0,visible=true,lost=false;
  const cameraTarget=new THREE.Vector3();
  function setAuto(value){auto=value;$('cake-auto').setAttribute('aria-pressed',String(value));$('cake-auto').textContent=value?'Ⅱ หยุดหมุน':'▶ หมุนโชว์';}
  function setTool(value){tool=value;placementRing.visible=false;setAuto(false);$('cake-orbit').setAttribute('aria-pressed',String(value==='orbit'));canvas.dataset.tool=value;document.querySelectorAll('[data-topping]').forEach(b=>b.setAttribute('aria-pressed',String(value==='place'&&b.dataset.topping===selectedType)));}
  function updateCamera(){const center=1.45+(cake.size-2)*.4,distance=(7.8+(cake.size-2)*1.2)*Math.max(1,.88/camera.aspect)/zoom;cameraTarget.set(0,center,0);camera.position.set(0,center+Math.sin(elevation)*distance,Math.cos(elevation)*distance);camera.lookAt(cameraTarget);camera.updateMatrixWorld();model.rotation.y=yaw;model.updateMatrixWorld(true);}
  function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();updateCamera();}
  function render(time){
    frame=0;if(document.hidden||$('cake-catalog').open||!screen.classList.contains('active')||!visible||lost){last=0;return;}
    const dt=Math.min((time-(last||time))/1000,.05);last=time;
    if(auto&&!pointers.size)targetYaw+=dt*.13;
    const speed=reduced.matches?1:1-Math.exp(-dt*12);yaw+=(targetYaw-yaw)*speed;elevation+=(targetElevation-elevation)*speed;
    cakeMat.color.lerp(targetColor,reduced.matches?1:1-Math.exp(-dt*7));updateCamera();
    dust.rotation.y=reduced.matches?0:time*.000025;dust.material.opacity=gala?.8:.45;
    for(const item of cake.items){const anchor=itemMeshes.get(item.id);if(!anchor)continue;
      const progress=reduced.matches?1:THREE.MathUtils.clamp((time-(item.born||0))/500,0,1);
      anchor.scale.setScalar(1+Math.sin(progress*Math.PI*2)*(1-progress)*.23);
      if(item.rain)anchor.position.y=item.p[1]+(1-progress)**2*1.9;
      if(item.type==='candle'&&item.lit&&phase==='show'){const f=reduced.matches?1:1+Math.sin(time*.009+item.id)*.09;const flame=anchor.getObjectByName('flame');flame.scale.set(.043*f,.1/f,.043*f);}
    }
    for(let i=smokePuffs.length-1;i>=0;i--){const puff=smokePuffs[i];puff.age+=dt;if(puff.age<0)continue;puff.mesh.position.y+=dt*.25;puff.mesh.position.x+=Math.sin(puff.age*5)*dt*.03;puff.mesh.scale.setScalar(.025+puff.age*.065);puff.mesh.material.opacity=Math.max(0,.3-puff.age*.25);if(puff.age>1.2){model.remove(puff.mesh);puff.mesh.material.dispose();smokePuffs.splice(i,1);}}
    if(phase==='show')for(const button of $('cake-candle-targets').children){const item=cake.items.find(i=>i.id===Number(button.dataset.candleId)),anchor=itemMeshes.get(item.id);if(!anchor)continue;const world=anchor.localToWorld(new THREE.Vector3(0,.59*item.scale,0)),projected=world.clone().project(camera);button.style.left=(projected.x*.5+.5)*100+'%';button.style.top=(-projected.y*.5+.5)*100+'%';button.style.visibility=projected.z>1||Math.abs(projected.x)>1||Math.abs(projected.y)>1?'hidden':'visible';}
    renderer.render(scene,camera);canvas.dataset.yaw=yaw.toFixed(3);canvas.dataset.elevation=elevation.toFixed(3);frame=requestAnimationFrame(render);
  }
  function reconcile(){if(document.hidden||$('cake-catalog').open||!screen.classList.contains('active')||!visible||lost){cancelAnimationFrame(frame);frame=0;last=0;}else if(!frame)frame=requestAnimationFrame(render);}
  new ResizeObserver(()=>{resize();reconcile();}).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;reconcile();}).observe(canvas);
  new MutationObserver(reconcile).observe(screen,{attributes:true,attributeFilter:['class']});document.addEventListener('visibilitychange',reconcile);
  reduced.addEventListener('change',()=>setAuto(false));
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;screen.dataset.renderer='recovering';status('กำลังคืนภาพ 3D ของตกแต่งยังอยู่ครบ');reconcile();});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;screen.dataset.renderer='webgl';resize();status('เค้ก 3D พร้อมแต่งต่อแล้ว');reconcile();});

  const raycaster=new THREE.Raycaster();
  // Pointer coordinates are CSS viewport pixels. Normalize the canvas-relative
  // position to WebGL NDC (-1..1), invert Y, then cast through the current camera.
  // Hit positions arrive in WORLD space. worldToLocal and the inverse world normal
  // matrix store them in MODEL space, so decorations stay attached while rotating.
  function ray(event){const r=canvas.getBoundingClientRect();updateCamera();raycaster.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);}
  function surfacePoint(event){ray(event);const hit=raycaster.intersectObjects(surfaces,false)[0];if(!hit)return null;
    const p=model.worldToLocal(hit.point.clone());const n=hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));
    n.applyMatrix3(new THREE.Matrix3().getNormalMatrix(model.matrixWorld.clone().invert())).normalize();
    if(n.y<-.2)return null;p.addScaledVector(n,.02);return {p:p.toArray(),n:n.toArray()};
  }
  function chooseAt(event){if(phase==='show'){blowAt(event);return;}ray(event);const hit=raycaster.intersectObjects([...itemMeshes.values()],true)[0];if(!hit){selectedID=null;sync();return;}let node=hit.object;while(node&&!node.userData.itemID)node=node.parent;selectedID=node?.userData.itemID||null;sync();if(selectedID){$('tab-toppings').click();setTool('orbit');status('เลือกชิ้นนี้แล้ว ปรับขนาด หมุน ย้าย หรือลบได้');}}
  function placeAt(event){
    if(phase!=='decorate')return;
    const hit=surfacePoint(event);if(!hit){status('แตะบนผิวเค้กเพื่อวางนะ ลากเพื่อหมุนหามุมได้');return;}
    if(tool==='move'){const item=cake.items.find(i=>i.id===selectedID);if(!item)return;remember();Object.assign(item,hit);changed('ย้ายชิ้นนี้แล้ว ♡');setTool('orbit');return;}
    if(tool==='text'&&!$('cake-message').value.trim()){status('พิมพ์ข้อความก่อนนะ');return;}
    if(cake.items.length>=180){status('เค้กแน่นแล้วน้า ลบของตกแต่งบางชิ้นก่อนเพิ่มนะ');return;}
    remember();const item=record(tool==='text'?'text':selectedType,hit.p,{n:hit.n,scale:placementScale,born:performance.now(),...(tool==='text'?{text:$('cake-message').value.trim(),color:$('cake-text-color').value}:{})});cake.items.push(item);selectedID=item.id;changed('วางแล้ว! แตะเพื่อวางอีกชิ้น หรือลากเพื่อหมุนเค้ก ♡');
  }
  const pointers=new Map();let press=null,pinch=0,stroke=null,strokeHistory=false;
  function pipeAt(event){if(phase!=='decorate')return;const hit=surfacePoint(event);if(!hit)return;
    if(!stroke){remember();strokeHistory=true;stroke={id:++nextID,color:$('icing-color').value,width:Number($('icing-width').value)/450,points:[]};cake.strokes.push(stroke);}
    const last=stroke.points.at(-1);if(!last||new THREE.Vector3(...last).distanceTo(new THREE.Vector3(...hit.p))>.025){stroke.points.push(hit.p);buildArt();}
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0||lost)return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});setAuto(false);
    if(pointers.size===1){press={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,moved:false};if(tool==='pipe')pipeAt(e);}
    else{const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);press=null;stroke=null;}
  });
  canvas.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId)){
      if(['place','move','text'].includes(tool)&&e.pointerType!=='touch'){
        const hit=surfacePoint(e);placementRing.visible=!!hit;
        if(hit){placementRing.position.fromArray(hit.p);placementRing.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...hit.n));}
      }return;
    }pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)zoom=THREE.MathUtils.clamp(zoom*d/pinch,.8,1.6);pinch=d;$('cake-zoom').value=zoom;return;}
    if(!press)return;if(tool==='pipe'){pipeAt(e);return;}
    const dx=e.clientX-press.lx,dy=e.clientY-press.ly;if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>6)press.moved=true;
    if(press.moved){targetYaw+=dx*.009;targetElevation=THREE.MathUtils.clamp(targetElevation+dy*.005,.05,1.35);}
    press.lx=e.clientX;press.ly=e.clientY;
  });
  function finish(e,cancelled=false){
    if(press&&!press.moved&&!cancelled&&tool!=='pipe'){if(phase==='show'||tool==='orbit')chooseAt(e);else placeAt(e);}
    if(stroke){if(cancelled&&strokeHistory){cake=history.pop();changed('ยกเลิกเส้นครีมนี้แล้ว');}else{sync();sound();status('บีบครีม 3D แล้ว ♡');}}
    stroke=null;strokeHistory=false;press=null;pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  }
  canvas.addEventListener('pointerup',e=>finish(e));canvas.addEventListener('pointercancel',e=>finish(e,true));canvas.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);press=null;stroke=null;});
  canvas.addEventListener('pointerleave',()=>{placementRing.visible=false;});
  canvas.addEventListener('dragover',e=>e.preventDefault());canvas.addEventListener('drop',e=>{e.preventDefault();const type=e.dataTransfer.getData('text/plain');if(!toppingData.some(t=>t[0]===type))return;selectedType=type;setTool('place');placeAt(e);});
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Enter','Delete','Escape'].includes(e.key))return;e.preventDefault();setAuto(false);
    if(e.key==='ArrowLeft')targetYaw-=.2;if(e.key==='ArrowRight')targetYaw+=.2;if(e.key==='ArrowUp')targetElevation=Math.min(1.35,targetElevation+.12);if(e.key==='ArrowDown')targetElevation=Math.max(.05,targetElevation-.12);
    if(e.key==='Home')$('cake-reset-view').click();if(e.key==='Escape')setTool('orbit');if(e.key==='Delete'&&selectedID)$('cake-delete-item').click();
    if(e.key==='Enter'){const r=canvas.getBoundingClientRect(),event={clientX:r.left+r.width/2,clientY:r.top+r.height/2};if(phase==='show'||tool==='orbit')chooseAt(event);else if(tool==='pipe'){pipeAt(event);stroke=null;sync();}else placeAt(event);}
  });

  const previewImages=new Map();let previewRenderer=null,previewScene=null,previewCamera=null,previewObject=null,previewFrame=0,previewType='strawberry',catalogOpener=null;
  function renderTierControls(){
    const select=$('cake-tier');if(select.options.length!==cake.size){select.replaceChildren(...Array.from({length:cake.size},(_,i)=>{const option=document.createElement('option');option.value=i;option.textContent='ชั้น '+(i+1)+(i===0?' · ชั้นล่าง':i===cake.size-1?' · ชั้นบน':' · ชั้นกลาง');return option;}));}select.value=editingTier;
    $('cake-tier-summary').textContent=cake.tiers.slice(0,cake.size).map((t,i)=>'ชั้น '+(i+1)+': '+FLAVORS.find(f=>f[0]===t.flavor)?.[1]+' · '+t.layers+' เลเยอร์').join(' / ');
  }
  function renderInventory(){
    const list=$('cake-item-list');list.replaceChildren();$('cake-item-count').textContent=cake.items.length+cake.strokes.length;
    if(!cake.items.length&&!cake.strokes.length){const p=document.createElement('p');p.textContent='ยังไม่มีของตกแต่ง เลือกชิ้นโปรดจากตู้ได้เลย';list.append(p);}
    cake.items.forEach((item,index)=>{
      const row=document.createElement('div');row.className='cake-item-row';row.dataset.itemId=item.id;
      const select=document.createElement('button');select.type='button';select.dataset.selectItem=item.id;select.setAttribute('aria-pressed',String(selectedID===item.id));
      const name=toppingData.find(t=>t[0]===item.type)?.[2]||'ข้อความ';
      if(previewImages.has(item.type)){const img=document.createElement('img');img.src=previewImages.get(item.type);img.alt='';select.append(img);}
      select.append(document.createTextNode((index+1)+'. '+name));select.addEventListener('click',()=>{selectedID=item.id;setTool('orbit');sync();status('เลือก '+name+' แล้ว กดลบเพื่อเอาเฉพาะชิ้นนี้ออก');});
      const remove=document.createElement('button');remove.type='button';remove.textContent='ลบ';remove.dataset.deleteItem=item.id;remove.setAttribute('aria-label','ลบ '+name+' ชิ้นที่ '+(index+1));
      remove.addEventListener('click',()=>{remember();cake.items=cake.items.filter(i=>i.id!==item.id);if(selectedID===item.id)selectedID=null;changed('ลบเฉพาะชิ้นนี้แล้ว กด Undo เพื่อคืนได้');});
      row.append(select,remove);list.append(row);
    });
    cake.strokes.forEach((stroke,index)=>{const row=document.createElement('div');row.className='cake-item-row';const label=document.createElement('span');label.textContent='เส้นครีม '+(index+1);const remove=document.createElement('button');remove.type='button';remove.textContent='ลบเส้น';remove.addEventListener('click',()=>{remember();cake.strokes=cake.strokes.filter(s=>s!==stroke);changed('ลบเส้นครีมนี้แล้ว');});row.append(label,remove);list.append(row);});
  }
  function syncShow(){
    const candles=cake.items.filter(i=>i.type==='candle'),remaining=candles.filter(i=>i.lit).length;
    $('cake-show-actions').hidden=phase!=='show';$('cake-show').hidden=phase==='show';
    $('btn-blow').disabled=!remaining;$('cake-relight').disabled=!candles.length;$('cake-continue').disabled=phase==='show'&&remaining>0;
    $('cake-candle-count').textContent=!candles.length?'เค้กก้อนนี้ไม่มีเทียน หมุนชมแล้วไปอ่านจดหมายได้เลย':remaining?'เทียนยังติดอยู่ '+remaining+' / '+candles.length+' เล่ม · แตะเทียนหรือกดเป่าทีละเล่ม':'เป่าครบ '+candles.length+' เล่มแล้ว ขอให้พรเป็นจริงทุกข้อ ♡';
    $('cake-title').textContent=phase==='show'?'เค้กของเธอ พร้อมให้ขอพรแล้ว ✨':'เค้กก้อนนี้ เป็นของเธอ 🎂';$('cake-subtitle').textContent=phase==='show'?'หมุนชมเค้ก แล้วแตะเทียนหรือกดเป่าทีละเล่ม':'เลือกของตกแต่งทีละชิ้น หมุนเค้กได้รอบตัว แล้วสร้างเค้กที่เป็นเธอ';
    screen.dataset.phase=phase;screen.dataset.complete=String(phase==='show'&&remaining===0);
    $('cake-candle-targets').replaceChildren();
    if(phase==='show')candles.forEach((item,index)=>{if(!item.lit)return;const button=document.createElement('button');button.type='button';button.dataset.candleId=item.id;button.setAttribute('aria-label','เป่าเทียนเล่มที่ '+(index+1));button.title='เป่าเทียนเล่มนี้';button.addEventListener('click',()=>blowOne(item.id));$('cake-candle-targets').append(button);});
  }
  let showCelebrated=false;const smokePuffs=[];
  function enterShow(){
    phase='show';selectedID=null;setTool('orbit');cake.items.filter(i=>i.type==='candle').forEach(i=>i.lit=true);showCelebrated=false;
    $('cake-step-edit').removeAttribute('aria-current');$('cake-step-show').setAttribute('aria-current','step');
    if(!gala)$('cake-gala').click();setAuto(!reduced.matches);targetYaw=.18;targetElevation=.38;zoom=1;$('cake-zoom').value=1;
    buildArt();status('เค้กที่เธอตั้งใจแต่ง พร้อมให้ขอพรแล้ว ✨');resize();canvas.scrollIntoView({block:'center',behavior:'instant'});sound();
  }
  function blowOne(id){
    if(phase!=='show')return;const candle=cake.items.find(i=>i.type==='candle'&&i.lit&&(!id||i.id===id));if(!candle)return;
    const anchor=itemMeshes.get(candle.id),position=anchor.localToWorld(new THREE.Vector3(0,.58*candle.scale,0));model.worldToLocal(position);
    candle.lit=false;
    if(!reduced.matches)for(let n=0;n<5;n++){const m=orb(model,new THREE.MeshBasicMaterial({color:'#eadce8',transparent:true,opacity:.3,depthWrite:false}),position.x,position.y,position.z,.025);m.castShadow=false;smokePuffs.push({mesh:m,age:-n*.06});}
    buildArt();sound();status('ฟู่ววว~ ดับไปอีกหนึ่งเล่ม 💨');
    if(!cake.items.some(i=>i.type==='candle'&&i.lit)&&!showCelebrated){showCelebrated=true;document.dispatchEvent(new Event('cake-celebrate'));status('ขอให้ทุกความปรารถนาของเธอเป็นจริง 💗');}
  }
  function blowAt(event){ray(event);const hit=raycaster.intersectObjects([...itemMeshes.values()],true)[0];if(!hit)return;let node=hit.object;while(node&&!node.userData.itemID)node=node.parent;if(node)blowOne(node.userData.itemID);}
  $('cake-show').addEventListener('click',enterShow);
  $('cake-back-edit').addEventListener('click',()=>{phase='decorate';setTool('orbit');$('cake-step-show').removeAttribute('aria-current');$('cake-step-edit').setAttribute('aria-current','step');buildArt();resize();status('กลับมาแต่งต่อได้ ของตกแต่งยังอยู่ครบ ♡');});
  $('cake-relight').addEventListener('click',()=>{if(phase!=='show')return;cake.items.filter(i=>i.type==='candle').forEach(i=>i.lit=true);showCelebrated=false;buildArt();sound();});
  $('cake-tier').addEventListener('change',()=>{editingTier=Number($('cake-tier').value);sync();status('กำลังปรับชั้น '+(editingTier+1));});
  for(const [id,keyName] of [['cake-flavor','flavor'],['cake-layers','layers'],['cake-filling','filling']])$(id).addEventListener('change',()=>{remember();cake.tiers[editingTier][keyName]=keyName==='layers'?Number($(id).value):$(id).value;changed('ปรับเฉพาะชั้น '+(editingTier+1)+' แล้ว ♡',true);});
  $('cake-topper').addEventListener('change',()=>{remember();cake.topper=$('cake-topper').checked;changed(cake.topper?'เพิ่มป้ายดาวแล้ว':'นำป้ายดาวออกแล้ว',true);});
  $('cake-copy-item').addEventListener('click',()=>{const item=cake.items.find(i=>i.id===selectedID);if(!item||cake.items.length>=180)return;remember();const duplicate=copy(item);duplicate.id=++nextID;duplicate.p[0]+=.12;duplicate.born=performance.now();cake.items.push(duplicate);selectedID=duplicate.id;changed('ทำสำเนาแล้ว แตะตำแหน่งใหม่เพื่อวาง');setTool('move');});
  $('cake-apply-preset').addEventListener('click',()=>{
    if(cake.items.length>160){status('ลบของตกแต่งบางชิ้นก่อนเพิ่มชุดนะ');return;}remember();const preset=$('cake-preset').value;
    for(const [i,t] of layout(cake.size).entries())for(let n=0;n<6;n++){const a=n/6*Math.PI*2,r=t.r-.17,type=preset==='cookie'?(n%2?'cream':'oreo'):preset==='romance'?(n%2?'heart':'flower'):(n%2?'blueberry':'strawberry');cake.items.push(record(type,[Math.cos(a)*r,t.b+t.h+.05,Math.sin(a)*r],{scale:.85,angle:n*60,born:performance.now()}));}
    const t=layout(cake.size).at(-1);for(const x of [-.3,0,.3])cake.items.push(record('candle',[x,t.b+t.h+.04,0]));changed('จัดเป็นชุดแล้ว แต่ละชิ้นยังเลือกย้ายหรือลบได้ ♡');
  });
  function disposePreviewObject(){if(!previewObject)return;previewObject.traverse(o=>{if(o.isInstancedMesh)o.dispose();});previewScene.remove(previewObject);previewObject=null;}
  function setPreview(type,scale=1){
    previewType=type;$('cake-preview-name').textContent=toppingData.find(t=>t[0]===type)[2];if(!previewRenderer)return;disposePreviewObject();const object=template(type).clone(true),box=new THREE.Box3().setFromObject(object),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    object.position.sub(center);previewObject=new THREE.Group();previewObject.add(object);previewObject.scale.setScalar(scale);previewScene.add(previewObject);
    // Both preview and placed meshes clone template(type), sharing the very same
    // geometry/materials. This is a model preview, not an illustrative icon.
    const distance=Math.max(size.x,size.y,size.z)*3.1;previewCamera.position.set(distance*.6,distance*.48,distance);previewCamera.lookAt(0,0,0);previewCamera.updateProjectionMatrix();
    $('cake-preview-name').textContent=toppingData.find(t=>t[0]===type)[2];$('cake-preview-canvas').dataset.model=type;
    document.querySelectorAll('[data-preview-type]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.previewType===type)));previewRenderer.render(previewScene,previewCamera);
  }
  function previewTick(time){previewFrame=0;if(!$('cake-catalog').open||document.hidden||!previewRenderer)return;if(previewObject&&!reduced.matches)previewObject.rotation.y=time*.00035;previewRenderer.render(previewScene,previewCamera);previewFrame=requestAnimationFrame(previewTick);}
  function openCatalog(type='strawberry',opener=document.activeElement){
    catalogOpener=opener;setAuto(false);$('cake-preview-scale').value=1;setPreview(type);$('cake-catalog').showModal();reconcile();if(previewRenderer){previewRenderer.setSize(360,330,false);previewCamera.aspect=360/330;previewCamera.updateProjectionMatrix();if(!previewFrame)previewFrame=requestAnimationFrame(previewTick);}sound();
  }
  function createCatalog(){
    try{
      previewRenderer=new THREE.WebGLRenderer({canvas:$('cake-preview-canvas'),alpha:true,antialias:true,preserveDrawingBuffer:true});previewRenderer.setPixelRatio(1);previewRenderer.setSize(240,220,false);previewRenderer.toneMapping=THREE.ACESFilmicToneMapping;previewRenderer.toneMappingExposure=1.02;
      previewScene=new THREE.Scene();previewScene.environment=envTarget.texture;previewScene.environmentIntensity=.65;previewScene.add(new THREE.HemisphereLight('#fff3df','#796079',1.5));const light=new THREE.DirectionalLight('#ffe6c3',3.3);light.position.set(-3,6,4);previewScene.add(light);const edge=new THREE.DirectionalLight('#ffc2d7',2);edge.position.set(3,4,-3);previewScene.add(edge);previewCamera=new THREE.PerspectiveCamera(36,240/220,.01,20);
    }catch{ $('cake-preview-canvas').hidden=true; }
    toppingData.forEach(([type,emoji,label])=>{
      if(previewRenderer){setPreview(type);previewImages.set(type,previewRenderer.domElement.toDataURL('image/png'));}
      for(const isModal of [false,true]){
        const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed','false');
        if(isModal)b.dataset.previewType=type;else b.dataset.topping=type;
        if(previewImages.has(type)){const image=document.createElement('img');image.src=previewImages.get(type);image.alt='โมเดล '+label;image.width=120;image.height=110;b.append(image);}else{const icon=document.createElement('span');icon.textContent=emoji;b.append(icon);}
        b.append(document.createTextNode(label));(isModal?$('cake-catalog-grid'):$('cake-toppings')).append(b);
        b.addEventListener('click',()=>{if(isModal){$('cake-preview-scale').value=1;setPreview(type);}else openCatalog(type,b);});
      }
    });
    $('cake-catalog').dataset.ready='true';
    $('cake-open-catalog').addEventListener('click',()=>openCatalog(selectedType));
    $('cake-catalog-close').addEventListener('click',()=>$('cake-catalog').close());
    $('cake-catalog').addEventListener('close',()=>{cancelAnimationFrame(previewFrame);previewFrame=0;catalogOpener?.focus();reconcile();});
    $('cake-preview-scale').addEventListener('input',()=>{if(previewObject)previewObject.scale.setScalar(Number($('cake-preview-scale').value));});
    $('cake-preview-use').addEventListener('click',()=>{selectedType=previewType;placementScale=Number($('cake-preview-scale').value);catalogOpener=canvas;$('cake-catalog').close();setTool('place');status('เลือก '+toppingData.find(t=>t[0]===selectedType)[2]+' แล้ว แตะบนเค้กเพื่อวางทีละชิ้น');canvas.scrollIntoView({block:'center',behavior:'instant'});canvas.focus({preventScroll:true});sound();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(previewFrame);previewFrame=0;}else if($('cake-catalog').open&&!previewFrame)previewFrame=requestAnimationFrame(previewTick);});
  }
  createCatalog();
  document.querySelectorAll('[data-panel]').forEach(b=>{
    b.addEventListener('click',()=>{document.querySelectorAll('[data-panel]').forEach(t=>{const active=t===b;t.setAttribute('aria-selected',String(active));$('panel-'+t.dataset.panel).hidden=!active;});setTool(b.dataset.panel==='piping'?'pipe':b.dataset.panel==='text'?'text':'orbit');sound();if(tool==='pipe')status('ลากเพื่อบีบครีมบนผิวเค้ก · กดหมุน / เลือกชิ้น เมื่อต้องการเปลี่ยนมุม');});
    b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const tabs=[...document.querySelectorAll('[data-panel]')],next=tabs[(tabs.indexOf(b)+(e.key==='ArrowRight'?1:3))%4];next.click();next.focus();});
  });
  $('cake-orbit').addEventListener('click',()=>{setTool('orbit');status('ลากเพื่อหมุน · แตะของตกแต่งที่วางแล้วเพื่อเลือกแก้ไข');});
  $('cake-auto').addEventListener('click',()=>{const next=!auto;setTool('orbit');setAuto(next);status(next?'หมุนโชว์เค้กช้า ๆ ✨':phase==='show'?'หยุดหมุนแล้ว พร้อมให้ขอพร ♡':'หยุดหมุนแล้ว เลือกของตกแต่งได้เลย');});
  $('cake-reset-view').addEventListener('click',()=>{setAuto(false);targetYaw=.18;targetElevation=.38;zoom=1;$('cake-zoom').value=1;});
  $('cake-top-view').addEventListener('click',()=>{setAuto(false);targetElevation=1.2;status('มุมด้านบน พร้อมวางของตกแต่งบนหน้าเค้ก');});
  $('cake-zoom').addEventListener('input',e=>{zoom=Number(e.target.value);});
  $('cake-gala').addEventListener('click',()=>{gala=!gala;screen.dataset.gala=gala;$('cake-gala').setAttribute('aria-pressed',String(gala));ambient.intensity=gala?.65:1.5;key.intensity=gala?2.7:3.3;rim.intensity=gala?3.5:2;fill.intensity=gala?.55:1.1;scene.environmentIntensity=gala?.4:.65;sound();});
  for(const [id,keyName] of [['cake-size','size'],['cake-frosting','frosting'],['cake-frost-color','frostColor']])$(id).addEventListener('change',()=>{
    remember();const oldSize=cake.size;cake[keyName]=keyName==='size'?Number($(id).value):$(id).value;
    if(keyName==='size'){
      const old=layout(oldSize),next=layout(cake.size);
      function remap(p){const index=Math.max(0,Math.min(oldSize-1,Math.floor((p[1]-.37)/.86)));const to=Math.min(index,cake.size-1),ratio=next[to].r/old[index].r;p[0]*=ratio;p[2]*=ratio;p[1]+=next[to].b-old[index].b;}
      cake.items.forEach(i=>remap(i.p));cake.strokes.forEach(s=>s.points.forEach(remap));
    }
    changed('ปรับเค้กแล้ว ของตกแต่งยังอยู่ครบ ♡',true);
  });
  for(const [id,keyName] of [['cake-item-scale','scale'],['cake-item-angle','angle']])$(id).addEventListener('change',()=>{const item=cake.items.find(i=>i.id===selectedID);if(!item)return;remember();item[keyName]=Number($(id).value);changed('ปรับชิ้นนี้แล้ว');});
  $('cake-move-item').addEventListener('click',()=>{if(!selectedID)return;setTool('move');status('แตะตำแหน่งใหม่บนเค้กเพื่อย้ายชิ้นที่เลือก');});
  $('cake-delete-item').addEventListener('click',()=>{if(!selectedID)return;remember();cake.items=cake.items.filter(i=>i.id!==selectedID);selectedID=null;changed('ลบชิ้นนี้แล้ว กด Undo เพื่อคืนได้');});
  $('cake-undo').addEventListener('click',()=>{if(!history.length)return;cake=history.pop();selectedID=null;changed('ย้อนกลับแล้ว',true);});
  $('cake-clear').addEventListener('click',()=>{remember();cake.items=[];cake.strokes=[];selectedID=null;changed('ล้างของตกแต่งแล้ว เลือกไอคอนเพื่อเริ่มแต่งใหม่ได้เลย');});
  $('cake-add-text').addEventListener('click',()=>{
    const text=$('cake-message').value.trim();if(!text){status('พิมพ์ข้อความก่อนนะ');return;}remember();const top=layout(cake.size).at(-1);const item=record('text',[0,top.b+top.h+.05,top.r*.32],{text,color:$('cake-text-color').value,born:performance.now()});cake.items.push(item);selectedID=item.id;changed('เพิ่มข้อความ 3D บนเค้กแล้ว');
  });
  $('cake-rain').addEventListener('click',()=>{if(cake.items.length>156){status('ลบของตกแต่งบางชิ้นก่อนโปรยเพิ่มนะ');return;}remember();for(let i=0;i<24;i++){const levels=layout(cake.size),index=i%cake.size,t=levels[index],inner=levels[index+1]?.r+.1||0;const a=i*2.399,r=inner+Math.random()*Math.max(.05,t.r-inner-.06);cake.items.push(record('sprinkles',[Math.cos(a)*r,t.b+t.h+.05,Math.sin(a)*r],{scale:.65,born:performance.now()+i*8,rain:true}));}changed('โปรยไข่มุกทองลงบนเค้ก ✨');});
  $('btn-blow').addEventListener('click',()=>blowOne());
  $('cake-continue').addEventListener('click',()=>{if(phase==='show'&&!cake.items.some(i=>i.type==='candle'&&i.lit))document.dispatchEvent(new Event('cake-finished'));});
  $('cake-export').addEventListener('click',()=>{
    if(lost)return;
    // Render the same 3D scene at export resolution, then composite its alpha over
    // the studio background. No remote textures are used, so PNG stays origin-clean.
    const ratio=renderer.getPixelRatio(),aspect=camera.aspect;renderer.setPixelRatio(1);renderer.setSize(1600,1300,false);camera.aspect=1600/1300;camera.updateProjectionMatrix();updateCamera();
    const wasSelected=selectionRing.visible,wasPlacement=placementRing.visible;selectionRing.visible=false;placementRing.visible=false;renderer.render(scene,camera);
    const output=document.createElement('canvas');output.width=1600;output.height=1300;const c=output.getContext('2d'),g=c.createRadialGradient(800,520,50,800,650,1050);g.addColorStop(0,gala?'#4b2e44':'#fff9ec');g.addColorStop(1,gala?'#171728':'#ead0d2');c.fillStyle=g;c.fillRect(0,0,1600,1300);c.drawImage(canvas,0,0);
    c.fillStyle=gala?'#efcea2':'#9b7057';c.textAlign='center';c.font='22px Georgia';c.fillText('MEL’S GRAND PÂTISSERIE · Made with love',800,1260);
    selectionRing.visible=wasSelected;placementRing.visible=wasPlacement;renderer.setPixelRatio(ratio);camera.aspect=aspect;resize();renderer.render(scene,camera);
    output.toBlob(blob=>{if(!blob){status('บันทึกไม่สำเร็จ ลองอีกครั้งนะ');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Mel-birthday-cake-3D.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);status('บันทึกภาพเค้ก 3D แล้ว ♡');},'image/png');sound();
  });
  buildBase();buildArt();setAuto(false);canvas.dataset.tool=tool;screen.dataset.renderer='webgl';
  document.fonts.ready.then(()=>{buildBase();reconcile();});resize();reconcile();
}
