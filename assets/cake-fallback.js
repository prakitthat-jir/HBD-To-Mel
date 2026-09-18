/* A complete birthday scene when WebGL is unavailable. */
(() => {
  const $ = id => document.getElementById(id), canvas = $('cake-canvas'), ctx = canvas.getContext('2d');
  let lit = 3;
  function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
  function berry(x,y){ellipse(x,y,16,23,'#cc3556');ctx.fillStyle='#ffe3a1';for(let i=0;i<8;i++)ctx.fillRect(x-9+(i%3)*8,y-12+Math.floor(i/3)*10,2,3);ellipse(x,y-22,14,5,'#6b995b');}
  function draw(){
    ctx.clearRect(0,0,800,650);
    ellipse(400,554,240,32,'#201523');ellipse(400,534,225,33,'#caa36c');ellipse(400,526,218,30,'#f5e2d2');
    for(const [y,r,h] of [[410,185,105],[298,132,112]]){
      ctx.fillStyle='#e9aac0';ctx.fillRect(400-r,y,r*2,h);ellipse(400,y+h,r,28,'#e9aac0');ellipse(400,y,r,31,'#fff1de');
      ctx.strokeStyle='#d3aa68';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(400,y+h-12,r,24,0,0,Math.PI);ctx.stroke();
      for(let i=0;i<16;i++){const a=i/16*Math.PI*2;ellipse(400+Math.cos(a)*(r-7),y+Math.sin(a)*27,12,9,'#fff8ed');}
    }
    ctx.strokeStyle='#edc37d';ctx.lineWidth=4;ctx.beginPath();ctx.arc(400,160,83,0,Math.PI*2);ctx.stroke();
    for(const x of [350,450]){ctx.beginPath();ctx.moveTo(x,221);ctx.lineTo(x,295);ctx.stroke();}
    ctx.fillStyle='#ffe2a7';ctx.textAlign='center';ctx.font='bold 24px Georgia';ctx.fillText('Happy Birthday',400,147);ctx.font='38px cursive';ctx.fillText('Mel',400,191);
    for(const [x,y] of [[263,424],[331,442],[467,441],[537,424],[298,300],[501,300]])berry(x,y);
    for(const [x,y,c] of [[352,326,'#ca90ac'],[449,327,'#bd9dc6']]){ellipse(x,y,24,10,c);ctx.fillStyle='#fff4dc';ctx.fillRect(x-23,y,46,7);ellipse(x,y+9,24,10,c);}
    for(const x of [315,483]){ellipse(x,341,12,10,'#47466e');ellipse(x+12,347,10,10,'#555177');}
    for(let i=0;i<3;i++){const x=365+i*35;ctx.fillStyle='#f3bbce';ctx.fillRect(x-5,243,10,66);ctx.fillStyle='#dfb871';ctx.fillRect(x-5,254,10,4);ctx.fillRect(x-5,274,10,4);if(i<lit){ellipse(x,230,8,16,'#ffb852');ellipse(x,232,4,9,'#fff5cd');}}
    canvas.dataset.lit=lit;canvas.dataset.candles=3;
    $('btn-blow').disabled=!lit;$('cake-relight').disabled=lit===3;$('cake-continue').disabled=lit>0;
    $('screen-cake').dataset.complete=String(!lit);
    $('cake-candle-count').textContent=lit?`เทียนยังติดอยู่ ${lit} / 3 เล่ม`:'เป่าเทียนครบแล้ว ขอให้พรของเธอเป็นจริง ♡';
  }
  function blow(){if(!lit)return;lit--;draw();document.dispatchEvent(new Event('cake-sound'));if(!lit)document.dispatchEvent(new Event('cake-celebrate'));}
  $('btn-blow').addEventListener('click',blow);
  canvas.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();blow();}});
  $('cake-relight').addEventListener('click',()=>{lit=3;draw();});
  $('cake-continue').addEventListener('click',()=>{if(!lit)document.dispatchEvent(new Event('cake-finished'));});
  $('cake-status').textContent='ภาพเค้กสำหรับเครื่องนี้ · อธิษฐานแล้วกดปุ่มเป่าเทียนได้เลย';draw();
})();
