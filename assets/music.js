(() => {
  'use strict';
  const button = document.getElementById('btn-music');
  const tracks = [
    { audio: document.getElementById('bgm'), title: 'ยินดีที่ไม่รู้จัก — 25hours', startAt: 0 },
    { audio: document.getElementById('bgm-blue'), title: 'blue — yung kai (with MINNIE)', startAt: 76 }
  ];
  const volume = 0.22, fadeDuration = 2000;
  let wantsMusic = true;
  let current = tracks[0];
  for (const track of tracks) {
    track.audio.volume = 0;
    // Native looping always returns to zero; blue repeats from 1:16 instead.
    track.audio.loop = track.startAt === 0;
    track.pending = false;
    track.unavailable = false;
    track.frame = 0;
  }
  function display(state) {
    const playing = state === 'playing';
    const label = state === 'unavailable' ? 'เพลงยังไม่พร้อมใช้งาน' : playing ? 'ปิดเพลง' : 'เปิดเพลง';
    button.dataset.state = state;
    button.textContent = playing ? '🔊' : '🔇';
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', `${label} · ${current.title}`);
    button.title = `${label} · ${current.title}`;
  }
  function fade(track, target) {
    cancelAnimationFrame(track.frame);
    const from = track.audio.volume, start = performance.now();
    function tick(now) {
      // RAF timestamps can precede performance.now() within the same frame.
      const progress = Math.max(0, Math.min(1, (now - start) / fadeDuration));
      track.audio.volume = from + (target - from) * progress;
      if (progress < 1) track.frame = requestAnimationFrame(tick);
      else {
        track.frame = 0;
        if (target === 0) {
          track.audio.pause();
          track.audio.currentTime = track.startAt;
        }
      }
    }
    track.frame = requestAnimationFrame(tick);
  }
  function stop(track) {
    cancelAnimationFrame(track.frame);
    track.frame = 0;
    track.audio.volume = 0;
    track.audio.pause();
  }
  async function play(track = current) {
    if (!wantsMusic || track.pending || track.unavailable || !track.audio.paused) return;
    track.pending = true;
    display('starting');
    try {
      if (track.audio.currentTime < track.startAt || track.audio.ended) {
        track.audio.currentTime = track.startAt;
      }
      await track.audio.play();
      // A late play result must not revive a muted or superseded song.
      if (!wantsMusic || track !== current) { stop(track); return; }
      fade(track, volume);
      display('playing');
    } catch (error) {
      if (track !== current) return;
      if (!wantsMusic) display('off');
      else if (error.name === 'NotAllowedError') display('blocked');
      else if (error.name !== 'AbortError') { track.unavailable = true; display('unavailable'); }
    } finally { track.pending = false; }
  }
  function selectChapter(chapter) {
    const next = tracks[['gallery', 'cake', 'letter'].includes(chapter) ? 1 : 0];
    if (next === current) return;
    const previous = current;
    current = next;
    if (!wantsMusic) { tracks.forEach(stop); display('off'); return; }
    fade(previous, 0);
    if (current.audio.paused) play();
    else { fade(current, volume); display('playing'); }
  }
  document.addEventListener('chapter-change', event => selectChapter(event.detail.chapter));
  button.addEventListener('click', () => {
    if (wantsMusic && (!current.audio.paused || current.pending)) {
      wantsMusic = false;
      tracks.forEach(stop);
      display('off');
    } else {
      wantsMusic = true;
      if (current.unavailable) { current.unavailable = false; current.audio.load(); }
      play();
    }
  });
  function startOnGesture(event) {
    if (event.target.closest?.('#btn-music, a') || !wantsMusic) return;
    play();
  }
  document.addEventListener('pointerup', startOnGesture, { passive: true });
  document.addEventListener('keydown', startOnGesture);
  for (const track of tracks) {
    track.audio.addEventListener('loadedmetadata', () => {
      if (track.audio.currentTime < track.startAt) track.audio.currentTime = track.startAt;
    });
    track.audio.addEventListener('ended', () => {
      if (!track.startAt) return;
      track.audio.currentTime = track.startAt;
      if (wantsMusic && track === current) play(track);
    });
    track.audio.addEventListener('playing', () => {
      if (!wantsMusic) stop(track);
      else if (track === current) display('playing');
    });
    track.audio.addEventListener('error', () => {
      track.unavailable = true;
      if (track === current && wantsMusic) display('unavailable');
    });
  }
  selectChapter(document.querySelector('.step.now')?.dataset.step);
  play();
})();
