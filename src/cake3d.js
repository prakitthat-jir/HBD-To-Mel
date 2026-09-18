import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $=id=>document.getElementById(id), screen=$('screen-cake'), canvas=$('cake-canvas');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true}); }
catch {
  // A canvas cannot switch from WebGL to 2D, so use a fresh canvas for fallback.
  canvas.replaceWith(canvas.cloneNode());screen.dataset.renderer='fallback';
  const script=document.createElement('script');script.src='assets/cake-fallback.js?v=20260918-show';document.head.append(script);
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

  const layout=count=>Array.from({length:count},(_,i)=>({r:1.4-i*.38,b:.38+i*.86,h:.82}));
  const cake={size:2,flavor:'#f5a9bd',tiers:Array.from({length:2},()=>({flavor:'#f5a9bd',layers:2,filling:'#fff6e9'})),topper:true,frosting:'drip',frostColor:'#fff6e9',items:[]};
  let surfaces=[],bodyMaterials=[],itemMeshes=new Map(),labelTexture=null;
  const sound=()=>document.dispatchEvent(new Event('cake-sound'));
  const status=text=>{$('cake-status').textContent=text;};
  function add(type,x,y,z,scale=1,angle=0){cake.items.push({id:cake.items.length+1,type,p:[x,y,z],scale,angle,lit:true});}
  // A complete, fixed strawberry-and-patisserie arrangement, viewed from every side.
  for(let i=0;i<10;i++){const a=i*Math.PI/5;add('strawberry',Math.cos(a)*1.19,1.24,Math.sin(a)*1.19,1.15,-a*180/Math.PI);}
  for(let i=0;i<8;i++){const a=i*Math.PI/4;add(i%2?'cream':'strawberry',Math.cos(a)*.76,2.10,Math.sin(a)*.76,i%2?1:1.18);}
  for(const [type,x,z,s] of [['macaron',-.5,.43,1.1],['macaron',.46,.47,1],['chocolate',-.45,-.05,.9],['blueberry',.53,.04,1.15],['flower',0,.72,.8]])add(type,x,2.10,z,s);
  for(let i=0;i<6;i++){const a=(i+.5)*Math.PI/3;add(i%2?'flower':'blueberry',Math.cos(a)*1.19,1.24,Math.sin(a)*1.19,.85);}
  for(const x of [-.34,0,.34])add('candle',x,2.10,.22,1.1);
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
    const hoop=mesh(new THREE.TorusGeometry(.66,.018,10,100),gold,base,0,top+.96,-.37);
    for(const x of [-.4,.4])mesh(new THREE.CylinderGeometry(.011,.011,.72,8),gold,base,x,top+.36,-.37);
    const label=document.createElement('canvas');label.width=1024;label.height=768;const c=label.getContext('2d');
    c.textAlign='center';c.fillStyle='#f6d892';c.font='bold 112px Georgia';c.fillText('Happy',512,215);c.fillText('Birthday',512,345);c.font='210px Pacifico, cursive';c.fillText('Mel',512,570);c.font='32px Georgia';c.fillText('A LITTLE MAGIC, JUST FOR YOU',512,665);
    labelTexture=new THREE.CanvasTexture(label);labelTexture.colorSpace=THREE.SRGBColorSpace;
    const labelMat=new THREE.MeshBasicMaterial({map:labelTexture,transparent:true,side:THREE.DoubleSide,depthWrite:false});bodyMaterials.push(labelMat);
    mesh(new THREE.PlaneGeometry(1.35,1.0125),labelMat,base,0,top+.96,-.35).castShadow=false;
    // Small stars crown the gold hoop, rather than using flat emoji sprites.
    for(const [x,y,s] of [[-.59,top+1.46,.085],[.53,top+1.47,.11],[.1,top+1.73,.065]]){
      const shape=new THREE.Shape();for(let k=0;k<10;k++){const a=k/10*Math.PI*2+Math.PI/2,r=k%2?s*.42:s;if(!k)shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();mesh(new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:false}),gold,base,x,y,-.37);
    }
  }

  function buildArt(){
    for(const item of cake.items){const anchor=new THREE.Group(),g=template(item.type).clone(true);anchor.position.fromArray(item.p);g.scale.setScalar(item.scale);g.rotation.y=THREE.MathUtils.degToRad(item.angle);anchor.add(g);anchor.userData.itemID=item.id;art.add(anchor);itemMeshes.set(item.id,anchor);}
  }
  // Porcelain pedestal contact shadow and subtle floating gold dust.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const sc=shadowCanvas.getContext('2d'),gradient=sc.createRadialGradient(64,64,8,64,64,62);gradient.addColorStop(0,'rgba(62,30,30,.32)');gradient.addColorStop(1,'rgba(62,30,30,0)');sc.fillStyle=gradient;sc.fillRect(0,0,128,128);
  const ground=mesh(new THREE.PlaneGeometry(5,5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),scene,0,-.37,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  const dustPositions=[];for(let i=0;i<70;i++){const a=i*2.399,r=2.1+(i%7)*.09;dustPositions.push(Math.cos(a)*r,.1+(i%19)*.18,Math.sin(a)*r);}
  const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3));
  const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:'#e8c08d',size:.018,transparent:true,opacity:.55,depthWrite:false}));scene.add(dust);
  let yaw=.18,targetYaw=.18,elevation=.38,targetElevation=.38,zoom=1,auto=!reduced.matches,frame=0,last=0,visible=true,lost=false,celebrated=false;
  const cameraTarget=new THREE.Vector3(),raycaster=new THREE.Raycaster(),pointers=new Map();
  function setAuto(value){auto=value;$('cake-auto').setAttribute('aria-pressed',String(value));$('cake-auto').textContent=value?'Ⅱ หยุดหมุน':'▶ หมุนโชว์';}
  function updateCamera(){const distance=7.8*Math.max(1,.88/camera.aspect)/zoom;cameraTarget.set(0,1.65,0);camera.position.set(0,1.65+Math.sin(elevation)*distance,Math.cos(elevation)*distance);camera.lookAt(cameraTarget);camera.updateMatrixWorld();model.rotation.y=yaw;model.updateMatrixWorld(true);}
  function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height||lost)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();updateCamera();renderer.render(scene,camera);}
  function sync(){
    const remaining=cake.items.filter(i=>i.type==='candle'&&i.lit).length;
    canvas.dataset.items=cake.items.length;canvas.dataset.lit=remaining;canvas.dataset.candles=3;
    $('btn-blow').disabled=!remaining;$('cake-relight').disabled=remaining===3;$('cake-continue').disabled=remaining>0;
    $('cake-candle-count').textContent=remaining?'เทียนยังติดอยู่ '+remaining+' / 3 เล่ม':'เป่าเทียนครบแล้ว ขอให้พรของเธอเป็นจริง ♡';
    screen.dataset.complete=String(!remaining);
    for(const item of cake.items)if(item.type==='candle')itemMeshes.get(item.id).traverse(o=>{if(o.name==='flame'||o.name==='core')o.visible=item.lit;});
  }
  function blowOne(id){const candle=cake.items.find(i=>i.type==='candle'&&i.lit&&(!id||i.id===id));if(!candle)return;candle.lit=false;sync();sound();status('ฟู่ววว~ ดับไปอีกหนึ่งเล่ม 💨');if(!cake.items.some(i=>i.type==='candle'&&i.lit)&&!celebrated){celebrated=true;document.dispatchEvent(new Event('cake-celebrate'));status('สุขสันต์วันเกิดนะเมล 💗');}}
  function blowAt(event){const r=canvas.getBoundingClientRect();updateCamera();raycaster.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);const hit=raycaster.intersectObjects([...itemMeshes.values()],true)[0];if(!hit)return;let node=hit.object;while(node&&!node.userData.itemID)node=node.parent;if(node)blowOne(node.userData.itemID);}
  function render(time){frame=0;if(document.hidden||!screen.classList.contains('active')||!visible||lost){last=0;return;}const dt=Math.max(0,Math.min((time-(last||time))/1000,.05));last=time;if(auto&&!pointers.size)targetYaw+=dt*.13;const speed=reduced.matches?1:1-Math.exp(-dt*12);yaw+=(targetYaw-yaw)*speed;elevation+=(targetElevation-elevation)*speed;updateCamera();dust.rotation.y=reduced.matches?0:time*.000025;
    for(const item of cake.items)if(item.type==='candle'&&item.lit){const flame=itemMeshes.get(item.id).getObjectByName('flame'),f=reduced.matches?1:1+Math.sin(time*.009+item.id)*.09;flame.scale.set(.043*f,.1/f,.043*f);}
    renderer.render(scene,camera);canvas.dataset.yaw=yaw.toFixed(3);canvas.dataset.elevation=elevation.toFixed(3);frame=requestAnimationFrame(render);
  }
  function reconcile(){if(document.hidden||!screen.classList.contains('active')||!visible||lost){cancelAnimationFrame(frame);frame=0;last=0;}else if(!frame)frame=requestAnimationFrame(render);}
  let press=null,pinch=0;
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0||lost)return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});setAuto(false);if(pointers.size===1)press={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,moved:false};else{const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);press=null;}});
  canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)zoom=THREE.MathUtils.clamp(zoom*d/pinch,.8,1.35);pinch=d;$('cake-zoom').value=zoom;return;}if(!press)return;const dx=e.clientX-press.lx,dy=e.clientY-press.ly;if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>6)press.moved=true;if(press.moved){targetYaw+=dx*.009;targetElevation=THREE.MathUtils.clamp(targetElevation+dy*.005,.05,1.2);}press.lx=e.clientX;press.ly=e.clientY;});
  function finish(e,cancelled=false){if(press&&!press.moved&&!cancelled)blowAt(e);press=null;pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
  canvas.addEventListener('pointerup',e=>finish(e));canvas.addEventListener('pointercancel',e=>finish(e,true));canvas.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);press=null;});
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Enter'].includes(e.key))return;e.preventDefault();setAuto(false);if(e.key==='ArrowLeft')targetYaw-=.2;if(e.key==='ArrowRight')targetYaw+=.2;if(e.key==='ArrowUp')targetElevation=Math.min(1.2,targetElevation+.12);if(e.key==='ArrowDown')targetElevation=Math.max(.05,targetElevation-.12);if(e.key==='Home')$('cake-reset-view').click();if(e.key==='Enter')blowOne();});
  $('cake-auto').addEventListener('click',()=>setAuto(!auto));
  $('cake-reset-view').addEventListener('click',()=>{setAuto(false);targetYaw=.18;targetElevation=.38;zoom=1;$('cake-zoom').value=1;});
  $('cake-zoom').addEventListener('input',e=>{zoom=Number(e.target.value);});
  $('btn-blow').addEventListener('click',()=>blowOne());
  $('cake-relight').addEventListener('click',()=>{cake.items.filter(i=>i.type==='candle').forEach(i=>i.lit=true);celebrated=false;sync();status('จุดเทียนแล้ว อธิษฐานอีกครั้งได้เลย ✨');});
  $('cake-continue').addEventListener('click',()=>{if(!cake.items.some(i=>i.type==='candle'&&i.lit))document.dispatchEvent(new Event('cake-finished'));});
  new ResizeObserver(()=>{resize();reconcile();}).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;reconcile();}).observe(canvas);
  new MutationObserver(()=>{resize();reconcile();}).observe(screen,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',reconcile);reduced.addEventListener('change',()=>setAuto(!reduced.matches));
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;status('กำลังคืนภาพเค้ก… ยังใช้ปุ่มเป่าเทียนได้');reconcile();});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;resize();status('ลากเพื่อหมุนชมเค้ก · แตะเทียนหรือกดปุ่มเป่า');reconcile();});
  ambient.intensity=.85;key.intensity=3;rim.intensity=3.5;fill.intensity=.75;scene.environmentIntensity=.5;
  buildBase();buildArt();sync();setAuto(!reduced.matches);screen.dataset.renderer='webgl';
  $('cake-status').textContent='ลากเพื่อหมุนชมเค้ก · แตะเทียนหรือกดปุ่มเป่า';
  document.fonts.ready.then(()=>{buildBase();resize();});resize();reconcile();
}
