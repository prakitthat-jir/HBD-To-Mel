(() => {
  'use strict';
  const videoId = 'Whu6oBYdYvk'; // GTHchannel official MV, 25hours
  const status = document.getElementById('music-status');
  const controls = [document.getElementById('music-toggle'), document.getElementById('btn-music')];
  let player, ready = false, playing = false, wantsMusic = true, needsGesture = true;
  function display(isPlaying, message) {
    playing = isPlaying;
    status.textContent = message;
    controls[0].textContent = isPlaying ? 'Ⅱ พักเพลง' : '▶ เล่นเพลง';
    controls[1].textContent = isPlaying ? '🔊' : '🔇';
    controls.forEach(button => { button.setAttribute('aria-pressed', String(isPlaying)); button.setAttribute('aria-label', isPlaying ? 'พักเพลง ยินดีที่ไม่รู้จัก' : 'เล่นเพลง ยินดีที่ไม่รู้จัก'); });
  }
  function play() {
    if (!ready) { status.textContent = 'กำลังโหลดเพลง… รอสักครู่นะ'; return; }
    player.playVideo();
  }
  controls.forEach(button => button.addEventListener('click', () => {
    if (playing || (wantsMusic && !needsGesture && ready)) {
      wantsMusic = false; needsGesture = false; player?.pauseVideo(); display(false, 'พักเพลงไว้ก่อน ♡');
    } else { wantsMusic = true; needsGesture = true; play(); }
  }));
  function firstGesture(event) {
    if (event.target.closest?.('#music-toggle, #btn-music, a') || !wantsMusic || !needsGesture) return;
    play();
  }
  document.addEventListener('pointerdown', firstGesture, { passive: true });
  document.addEventListener('keydown', firstGesture);
  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('youtube-player', {
      width: '320', height: '200', videoId,
      playerVars: { autoplay: 1, loop: 1, playlist: videoId, playsinline: 1, controls: 1, rel: 0, origin: location.origin },
      events: {
        onReady: event => { ready = true; event.target.setVolume(40); if (wantsMusic) play(); },
        onAutoplayBlocked: () => { needsGesture = wantsMusic; display(false, 'แตะหน้าเว็บหรือกดเล่นเพลง เพื่อเริ่มฟัง ♫'); },
        onStateChange: event => {
          if (event.data === YT.PlayerState.PLAYING) { wantsMusic = true; needsGesture = false; display(true, 'กำลังเล่น · วนเพลงให้เรื่อยๆ ♫'); }
          else if (event.data === YT.PlayerState.PAUSED) { wantsMusic = false; needsGesture = false; display(false, 'พักเพลงไว้ก่อน ♡'); }
          else if (event.data === YT.PlayerState.ENDED && wantsMusic) { player.seekTo(0, true); play(); }
        },
        onError: () => { display(false, 'เล่นเพลงไม่ได้ชั่วคราว · เปิดฟังที่ YouTube ได้เลย'); ready = false; }
      }
    });
  };
  const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; script.async = true;
  script.onerror = () => display(false, 'เชื่อมต่อเพลงไม่ได้ · เปิดฟังที่ YouTube ได้เลย');
  document.head.append(script);
})();
