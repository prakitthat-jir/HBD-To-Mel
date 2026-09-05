(() => {
  'use strict';
  const audio = document.getElementById('bgm');
  const button = document.getElementById('btn-music');
  const title = 'ยินดีที่ไม่รู้จัก — 25hours';
  let wantsMusic = true, pending = false, unavailable = false;
  audio.volume = 0.22;
  audio.loop = true;
  function display(state) {
    const playing = state === 'playing';
    const label = state === 'unavailable' ? 'เพลงยังไม่พร้อมใช้งาน' : playing ? 'ปิดเพลง' : 'เปิดเพลง';
    button.dataset.state = state;
    button.textContent = playing ? '🔊' : '🔇';
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', `${label} · ${title}`);
    button.title = `${label} · ${title}`;
  }
  async function play() {
    if (!wantsMusic || pending || unavailable || !audio.paused) return;
    pending = true;
    display('starting');
    try {
      await audio.play();
      // Switching off while loading must also cancel the eventual playback.
      if (!wantsMusic) { audio.pause(); display('off'); }
      else display('playing');
    } catch (error) {
      if (!wantsMusic) display('off');
      else if (error.name === 'NotAllowedError') display('blocked');
      else if (error.name !== 'AbortError') { unavailable = true; display('unavailable'); }
    } finally { pending = false; }
  }
  button.addEventListener('click', () => {
    if (!audio.paused || pending) {
      wantsMusic = false;
      audio.pause();
      display('off');
    } else {
      wantsMusic = true;
      if (unavailable) { unavailable = false; audio.load(); }
      play();
    }
  });
  function startOnGesture(event) {
    if (event.target.closest?.('#btn-music, a') || !wantsMusic) return;
    play();
  }
  document.addEventListener('pointerup', startOnGesture, { passive: true });
  document.addEventListener('keydown', startOnGesture);
  audio.addEventListener('playing', () => {
    if (!wantsMusic) { audio.pause(); display('off'); }
    else display('playing');
  });
  audio.addEventListener('pause', () => { if (!pending) display('off'); });
  audio.addEventListener('error', () => { unavailable = true; display('unavailable'); });
  play();
})();
