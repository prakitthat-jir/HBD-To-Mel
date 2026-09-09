/* The studio bundle is loaded once, only when Chapter 3 opens. */
(() => {
  const screen=document.getElementById('screen-cake');let requested=false;
  function load(){if(requested||!screen.classList.contains('active'))return;requested=true;
    const script=document.createElement('script');script.src='assets/cake3d.bundle.js';
    script.onerror=()=>{document.getElementById('decorator-status').textContent='โหลดเค้กไม่สำเร็จ กรุณารีเฟรชเพื่อลองอีกครั้ง';};
    document.head.append(script);
  }
  new MutationObserver(load).observe(screen,{attributes:true,attributeFilter:['class']});load();
})();
