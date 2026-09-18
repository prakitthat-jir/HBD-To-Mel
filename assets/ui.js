(() => {
  // Display the original photograph through a head-shaped CSS cutout: no redrawn face.
  document.querySelectorAll('.screen').forEach(screen => {
    const layer = document.createElement('div');
    layer.className = 'face-float-layer';
    layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 4; i++) {
      const sticker = document.createElement('span');
      sticker.className = 'face-floater';
      sticker.style.setProperty('--slot', i);
      const crop = document.createElement('span');
      crop.className = 'face-cutout';
      const photo = document.createElement('img');
      photo.src = 'assets/share-mel.jpg';photo.alt = '';photo.draggable = false;
      photo.width = 1125;photo.height = 968;
      crop.append(photo);sticker.append(crop);layer.append(sticker);
    }
    screen.prepend(layer);
  });
  const toolbar = document.getElementById('toolbar');
  const toggle = document.getElementById('btn-tools');
  function close(restoreFocus = false) {
    toolbar.dataset.open = 'false';
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus && matchMedia('(max-width:1200px)').matches) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toolbar.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('pointerdown', event => {
    if (!toolbar.contains(event.target)) close();
  });
  toolbar.addEventListener('keydown', event => {
    if (event.key === 'Escape') { close(true); event.stopPropagation(); }
  });
  toolbar.addEventListener('focusout', event => {
    if (!toolbar.contains(event.relatedTarget)) close();
  });
  document.getElementById('toolbar-options').addEventListener('click', event => {
    if (event.target.closest('button')) close(true);
  });
  document.addEventListener('chapter-change', () => close());
})();
