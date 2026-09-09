/* 2D cake studio. No libraries or remote images are required for PNG export. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('cake-canvas'), ctx = canvas.getContext('2d');
  const W = 800, H = 650, reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toppings = [['strawberry','🍓','สตรอว์เบอร์รี'],['cherry','🍒','เชอร์รี'],['sprinkles','🌈','เรนโบว์'],['chocolate','🍫','ช็อกโกแลต'],['candle','🕯️','เทียน'],['cream','🍦','วิปครีม'],['flower','🌸','ดอกไม้'],['bow','🎀','โบว์']];
  const initial = () => ({flavor:'#f5a9bd',size:2,frosting:'drip',frostColor:'#fff6e9',items:[330,400,470].map(x=>({type:'candle',x,y:340,lit:true})),strokes:[]});
  let phase='decorate';
  let cake = initial(), history = [], mode = 'toppings', selected = 'strawberry', drawing = null;
  let keyboard = {x:400,y:365}, showCursor = false, frame = 0, finishing = false;
  let oldColor = cake.flavor, colorStart = 0;
  const clone = value => JSON.parse(JSON.stringify(value));
  const sound = () => document.dispatchEvent(new Event('cake-sound'));
  const status = text => { $('decorator-status').textContent = text; };
  function sync() {
    $('cake-flavor').value=cake.flavor; $('cake-size').value=cake.size;
    $('cake-frosting').value=cake.frosting; $('cake-frost-color').value=cake.frostColor;
    $('cake-undo').disabled=!history.length;
    canvas.dataset.items=cake.items.length; canvas.dataset.strokes=cake.strokes.length;
    canvas.dataset.lit=cake.items.filter(i=>i.type==='candle'&&i.lit).length;
  }
  function remember() { history.push(clone(cake)); if(history.length>50)history.shift(); }
  function changed(message) { sync(); sound(); if(message)status(message); draw(ctx,performance.now()); }
  // Logical coordinates always stay 800 × 650. The CSS canvas may be 330px wide
  // on a phone or 650px on desktop. Subtract the viewport rectangle origin, then
  // multiply by logical/CSS size. clientX/clientY and getBoundingClientRect use
  // the same viewport space, so page scrolling and responsive resizing are safe.
  // Pointer capture continues piping after a finger crosses the canvas edge.
  function point(event) {
    const r=canvas.getBoundingClientRect();
    return {x:Math.max(0,Math.min(W,(event.clientX-r.left)*W/r.width)),y:Math.max(0,Math.min(H,(event.clientY-r.top)*H/r.height))};
  }
  function tiers() { return Array.from({length:cake.size},(_,i)=>({x:400-(470-i*100)/2,y:430-i*90,w:470-i*100,h:90})); }
  function onCake(p) { return tiers().some(t=>p.x>=t.x&&p.x<=t.x+t.w&&p.y>=t.y-22&&p.y<=t.y+t.h); }
  function shape(c,t) {
    c.beginPath();c.moveTo(t.x,t.y);c.bezierCurveTo(t.x,t.y-32,t.x+t.w,t.y-32,t.x+t.w,t.y);
    c.lineTo(t.x+t.w,t.y+t.h);c.bezierCurveTo(t.x+t.w,t.y+t.h+32,t.x,t.y+t.h+32,t.x,t.y+t.h);c.closePath();
  }
  const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
  function colorAt(now,still) {
    const f=still||reduced.matches?1:Math.min(1,(now-colorStart)/350);
    const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
    const a=rgb(oldColor),b=rgb(cake.flavor);return `rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*f)).join(',')})`;
  }
  function item(c,i,now,still) {
    c.save(); c.translate(i.x,i.y);
    if(!still&&!reduced.matches&&i.born) {
      const p=Math.max(0,Math.min(1,(now-i.born)/500));
      if(i.rain)c.translate(0,-(1-p)*(1-p)*350);
      else {const scale=1+Math.sin(p*Math.PI*2)*(1-p)*.35;c.scale(scale,scale);}
    }
    if(i.type==='candle') {
      c.fillStyle='#fff0c9';c.strokeStyle='#cc7795';c.lineWidth=2;c.beginPath();c.roundRect(-8,-48,16,49,4);c.fill();c.stroke();
      c.strokeStyle='#ec96b4';for(let y=-40;y<-4;y+=12){c.beginPath();c.moveTo(-6,y);c.lineTo(6,y+7);c.stroke();}
      if(i.lit){const wobble=still||reduced.matches?0:Math.sin(now/140+i.x)*2;
        c.shadowColor='#ffd879';c.shadowBlur=18;ellipse(c,wobble,-61,7,12,'#ffb64c');ellipse(c,wobble,-58,3,7,'#fff5b5');c.shadowBlur=0;
        if(!still&&!reduced.matches)ellipse(c,Math.sin(now/300+i.x)*12,-77-(now/30+i.x)%14,1.8,1.8,'#ffd879');
      }
    } else if(i.type==='sprinkles') {
      c.strokeStyle=i.color||'#e774a5';c.lineWidth=5;c.lineCap='round';c.rotate(i.angle||.5);c.beginPath();c.moveTo(-4,0);c.lineTo(4,0);c.stroke();
    } else if(i.type==='cream') {
      for(let j=0;j<4;j++)ellipse(c,0,-j*7,19-j*4,8,'#fffdf3');
      c.strokeStyle='#ecd7cf';c.lineWidth=1;c.beginPath();c.moveTo(-9,1);c.quadraticCurveTo(6,-12,0,-27);c.stroke();
    } else if(i.type==='text') {
      c.font='600 27px "Noto Sans Thai", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=i.color;
      c.fillText(i.text,0,0,Math.min(340,2*Math.min(i.x-155,645-i.x))>40?Math.min(340,2*Math.min(i.x-155,645-i.x)):150);
    } else {c.font='42px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';c.textAlign='center';c.textBaseline='bottom';c.fillText(toppings.find(t=>t[0]===i.type)?.[1]||'🍓',0,7);}
    c.restore();
  }
  function draw(c,now,still=false) {
    c.clearRect(0,0,W,H);
    const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#fff7ed');bg.addColorStop(1,'#f8e0e8');c.fillStyle=bg;c.fillRect(0,0,W,H);
    c.fillStyle='#fffaf7';for(let x=20;x<W;x+=45)for(let y=20;y<H;y+=45){c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fill();}
    c.textAlign='center';c.fillStyle='#b77d90';c.font='italic 24px Georgia';c.fillText('a little sweetness, just for you',400,75);
    ellipse(c,400,561,275,35,'#d9b5c14d');ellipse(c,400,543,280,35,'#d8b4c5');ellipse(c,400,535,280,32,'#fffaf6');ellipse(c,400,535,254,24,'#f3dce3');
    for(const t of tiers()) {
      shape(c,t);c.fillStyle=colorAt(now,still);c.fill();
      c.save();shape(c,t);c.clip();const shade=c.createLinearGradient(t.x,0,t.x+t.w,0);shade.addColorStop(0,'#ffffff25');shade.addColorStop(.5,'#ffffff00');shade.addColorStop(1,'#40152830');c.fillStyle=shade;c.fillRect(t.x,t.y-35,t.w,t.h+70);c.restore();
      ellipse(c,400,t.y,t.w/2,24,cake.frosting==='none'?colorAt(now,still):cake.frostColor);
      if(cake.frosting!=='none') {
        if(cake.frosting==='drip')for(let x=t.x+10;x<t.x+t.w-5;x+=22){c.fillStyle=cake.frostColor;c.beginPath();c.roundRect(x-9,t.y,18,16+10*(.5+.5*Math.sin(x)),9);c.fill();}
        if(cake.frosting==='shell')for(let x=t.x+10;x<t.x+t.w;x+=20){ellipse(c,x,t.y+5,12,10,cake.frostColor);ellipse(c,x-2,t.y+2,5,4,'#ffffff66');}
      }
      if(cake.frosting!=='none')for(let x=t.x+12;x<t.x+t.w;x+=19)ellipse(c,x,t.y+t.h,10,6,cake.frostColor);
    }
    for(const s of cake.strokes) {
      c.strokeStyle=s.color;c.fillStyle=s.color;c.lineWidth=s.width;c.lineCap='round';c.lineJoin='round';
      c.beginPath();s.points.forEach((p,n)=>n?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
      if(s.points.length===1)ellipse(c,s.points[0].x,s.points[0].y,s.width/2,s.width/2,s.color);
    }
    cake.items.forEach(i=>item(c,i,now,still));
    c.font='14px Georgia';c.fillStyle='#aa7587';c.fillText('Made with love · Pyopapaya × Mel',400,615);
    if(showCursor&&!still){c.strokeStyle='#965773';c.lineWidth=2;c.setLineDash([4,4]);c.strokeRect(keyboard.x-15,keyboard.y-15,30,30);c.setLineDash([]);}
  }
  function place(p) {
    if(finishing)return;
    if(!onCake(p)){status('แตะบนตัวเค้กเพื่อวางของตกแต่งนะ');return;}
    if(mode==='text'&&!$('cake-message').value.trim()){status('พิมพ์ข้อความก่อนนะ');return;}
    remember();
    if(mode==='piping')cake.strokes.push({color:$('icing-color').value,width:Number($('icing-width').value),points:[p]});
    else cake.items.push(mode==='text'?{type:'text',...p,text:$('cake-message').value.trim(),color:$('cake-text-color').value,born:performance.now()}:{type:selected,...p,lit:true,born:performance.now()});
    changed('เพิ่มแล้ว! แต่งต่อได้เลย ♡');
  }
  toppings.forEach(([type,emoji,label])=>{
    const b=document.createElement('button');b.type='button';b.draggable=true;b.dataset.topping=type;b.setAttribute('aria-pressed',String(type===selected));
    const icon=document.createElement('span');icon.textContent=emoji;b.append(icon,document.createTextNode(label));$('cake-toppings').append(b);
    b.addEventListener('click',()=>{selected=type;mode='toppings';document.querySelectorAll('[data-topping]').forEach(e=>e.setAttribute('aria-pressed',String(e===b)));status(`เลือก${label}แล้ว แตะบนเค้กเพื่อวาง`);sound();});
    b.addEventListener('dragstart',e=>{b.click();e.dataTransfer.setData('text/plain',type);e.dataTransfer.effectAllowed='copy';});
  });
  canvas.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});
  canvas.addEventListener('drop',e=>{e.preventDefault();const type=e.dataTransfer.getData('text/plain');if(!toppings.some(t=>t[0]===type))return;selected=type;mode='toppings';place(point(e));});
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0||!e.isPrimary||finishing)return;showCursor=false;const p=point(e);
    if(mode==='piping'&&onCake(p)){remember();drawing={color:$('icing-color').value,width:Number($('icing-width').value),points:[p]};cake.strokes.push(drawing);canvas.setPointerCapture(e.pointerId);changed();}
    else place(p);
  });
  canvas.addEventListener('pointermove',e=>{if(!drawing)return;const p=point(e);if(onCake(p)){const last=drawing.points.at(-1);if(Math.hypot(last.x-p.x,last.y-p.y)>2)drawing.points.push(p);}});
  function finishStroke(){if(drawing){drawing=null;changed('บีบครีมเรียบร้อย ♡');}}
  canvas.addEventListener('pointerup',finishStroke);canvas.addEventListener('pointercancel',finishStroke);canvas.addEventListener('lostpointercapture',finishStroke);
  canvas.addEventListener('keydown',e=>{const delta={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(delta){e.preventDefault();keyboard.x=Math.max(0,Math.min(W,keyboard.x+delta[0]));keyboard.y=Math.max(0,Math.min(H,keyboard.y+delta[1]));showCursor=true;}if(e.key==='Enter'||e.key===' '){e.preventDefault();place({...keyboard});}});
  document.querySelectorAll('[data-panel]').forEach(b=>{
    b.addEventListener('click',()=>{document.querySelectorAll('[data-panel]').forEach(t=>{const active=t===b;t.setAttribute('aria-selected',String(active));$('panel-'+t.dataset.panel).hidden=!active;});mode=b.dataset.panel==='base'?'toppings':b.dataset.panel;sound();});
    b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const tabs=[...document.querySelectorAll('[data-panel]')],next=tabs[(tabs.indexOf(b)+(e.key==='ArrowRight'?1:3))%4];next.click();next.focus();});
  });
  for(const [id,key] of [['cake-flavor','flavor'],['cake-size','size'],['cake-frosting','frosting'],['cake-frost-color','frostColor']])$(id).addEventListener('change',()=>{
    remember();oldColor=cake.flavor;colorStart=performance.now();const oldSize=cake.size;cake[key]=key==='size'?Number($(id).value):$(id).value;
    if(key==='size') {
      // Remap artwork vertically when tier count changes, keeping every decoration on the cake.
      const oldTop=430-(oldSize-1)*90-22,newTop=430-(cake.size-1)*90-22;
      const remap=p=>{p.y=newTop+(p.y-oldTop)/(520-oldTop)*(520-newTop);const t=tiers().filter(t=>p.y>=t.y-22).at(-1)||tiers().at(-1);p.x=Math.max(t.x+12,Math.min(t.x+t.w-12,p.x));};
      cake.items.forEach(remap);cake.strokes.forEach(s=>s.points.forEach(remap));
    }
    changed('ปรับเค้กแล้ว ♡');
  });
  $('cake-add-text').addEventListener('click',()=>{mode='text';place({x:400,y:tiers().at(-1).y+40});});
  $('cake-undo').addEventListener('click',()=>{if(!history.length||finishing)return;cake=history.pop();oldColor=cake.flavor;changed('ย้อนกลับแล้ว');});
  $('cake-clear').addEventListener('click',()=>{if(finishing)return;remember();cake=initial();oldColor=cake.flavor;changed('เริ่มเค้กใหม่แล้ว กด Undo เพื่อคืนเค้กเดิมได้');});
  $('cake-rain').addEventListener('click',()=>{
    if(finishing)return;remember();const palette=['#ed7baa','#a7c791','#fac75d','#aa91cc','#87c9d3'];
    for(let n=0;n<65;n++){const t=tiers()[Math.floor(Math.random()*cake.size)];cake.items.push({type:'sprinkles',x:t.x+14+Math.random()*(t.w-28),y:t.y+Math.random()*t.h,color:palette[n%5],angle:Math.random()*Math.PI,born:performance.now()+Math.random()*80,rain:true});}
    changed('เรนโบว์หวาน ๆ มาแล้ว 🌈');
  });
  $('cake-export').addEventListener('click',()=>{
    // A separate high-resolution canvas renders the final state without transient
    // animation, cursor or controls. Local vector art/emoji never taint the canvas.
    const out=document.createElement('canvas');out.width=W*2;out.height=H*2;const c=out.getContext('2d');c.scale(2,2);draw(c,performance.now(),true);
    out.toBlob(blob=>{if(!blob){status('บันทึกภาพไม่สำเร็จ ลองอีกครั้งนะ');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Mel-birthday-cake.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);status('บันทึกภาพเค้ก PNG แล้ว ♡');},'image/png');sound();
  });
  function syncFallbackShow(){const lit=cake.items.filter(i=>i.type==='candle'&&i.lit).length;const total=cake.items.filter(i=>i.type==='candle').length;document.getElementById('screen-cake').dataset.phase=phase;$('cake-show-actions').hidden=phase!=='show';$('cake-show').hidden=phase==='show';$('btn-blow').disabled=!lit;$('cake-continue').disabled=phase==='show'&&lit>0;$('cake-candle-count').textContent='เทียนที่ยังติดอยู่ '+lit+' / '+total+' เล่ม';}
  $('cake-show').addEventListener('click',()=>{phase='show';cake.items.filter(i=>i.type==='candle').forEach(i=>i.lit=true);syncFallbackShow();});
  $('cake-back-edit').addEventListener('click',()=>{phase='decorate';syncFallbackShow();});
  $('cake-relight').addEventListener('click',()=>{cake.items.filter(i=>i.type==='candle').forEach(i=>i.lit=true);changed();syncFallbackShow();});
  $('btn-blow').addEventListener('click',()=>{
    if(finishing)return;const lit=cake.items.filter(i=>i.type==='candle'&&i.lit);
    if(!lit.length){status('เพิ่มเทียนก่อนเป่านะ หรือกดไปอ่านจดหมายได้เลย');return;}
    lit[0].lit=false;changed('ฟู่ววว~ ขอให้พรของเธอเป็นจริง 💗');syncFallbackShow();
  });
  $('cake-continue').addEventListener('click',()=>{if(finishing||phase!=='show'||cake.items.some(i=>i.type==='candle'&&i.lit))return;finishing=true;document.dispatchEvent(new Event('cake-finished'));});
  // Animate only while this chapter is visible; honor reduced motion preferences.
  function tick(now){frame=0;if(!$('screen-cake').classList.contains('active')||document.hidden)return;draw(ctx,now);frame=requestAnimationFrame(tick);}
  function activate(){if(frame)cancelAnimationFrame(frame);frame=0;if($('screen-cake').classList.contains('active')&&!document.hidden){finishing=false;frame=requestAnimationFrame(tick);}}
  new MutationObserver(activate).observe($('screen-cake'),{attributes:true,attributeFilter:['class']});document.addEventListener('visibilitychange',activate);
  sync();draw(ctx,performance.now(),true);status('เครื่องนี้แสดงเค้กแบบ 2D เลือกของตกแต่งแล้วแตะเพื่อวางได้เลย');
})();
