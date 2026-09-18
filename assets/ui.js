(() => {
  const toolbar = document.getElementById('toolbar');
  const toggle = document.getElementById('btn-tools');
  function close(restoreFocus = false) {
    toolbar.dataset.open = 'false';
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus && matchMedia('(max-width:720px)').matches) toggle.focus();
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
