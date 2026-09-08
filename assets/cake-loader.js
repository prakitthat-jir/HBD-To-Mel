(() => {
  const screen = document.getElementById('screen-cake');
  let requested = false;
  function load() {
    if (requested || !screen.classList.contains('active')) return;
    requested = true;
    const script = document.createElement('script');
    script.src = 'assets/cake3d.bundle.js';
    script.onerror = () => { screen.dataset.renderer = 'fallback'; };
    document.head.append(script);
  }
  new MutationObserver(load).observe(screen, {attributes:true, attributeFilter:['class']});
  load();
})();
