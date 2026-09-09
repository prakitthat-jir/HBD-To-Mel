(() => {
  'use strict';
  const photos = [
    ['m13', 'รอยยิ้มที่เข้ากับทุกวัน 🌿', 'เมลยืนยิ้มท่ามกลางต้นไม้'],
    ['m1', 'วันทำงานก็มีมุมน่ารักนะ 💚', 'ภาพในออฟฟิศกับแขนสาธิตปฐมพยาบาล'],
    ['m2', 'ทีมนี้มีแต่ความสดใส ✌️', 'เพื่อนสองคนในเสื้อสีเขียว'],
    ['m3', 'ลุยด้วยกัน สนุกกว่าเสมอ 🦺', 'เซลฟีสามคนสวมหมวกนิรภัยและเสื้อสะท้อนแสง'],
    ['m4', 'เสียงหัวเราะประจำออฟฟิศ 😆', 'เพื่อนหัวเราะระหว่างสาธิตปฐมพยาบาล'],
    ['m5', 'มื้อนี้มีรอยยิ้มเป็นของหวาน 🍽️', 'เพื่อนสองคนชูสองนิ้วที่ร้านอาหาร'],
    ['m6', 'ออกไปเก็บวันดีๆ กัน ☀️', 'เซลฟีกลุ่มเพื่อนกลางแจ้ง'],
    ['m7', 'พักใจไว้กับวิวสีเขียว 🌱', 'ภาพนั่งบนม้านั่งในสนามหญ้ากว้าง'],
    ['m8', 'พร้อมลุย พร้อมยิ้ม! 🛶', 'เพื่อนใส่เสื้อชูชีพและหมวกกันน็อก'],
    ['m9', 'หนึ่งกระจก หลายรอยยิ้ม 🪞', 'กลุ่มเพื่อนถ่ายรูปหน้ากระจก'],
    ['m10', 'แกล้งนิดเดียว เอ็นดูเยอะมาก 🤭', 'เพื่อนหยอกล้อกันกลางสนามหญ้า'],
    ['m11', 'เมลกับมุมโปรดเล็กๆ ☕', 'เมลยิ้มอยู่ในร้านท่ามกลางของตกแต่ง'],
    ['m12', 'วันสบายๆ ที่อยากจำ 🤍', 'ภาพนั่งที่โต๊ะในร้าน'],
    ['m14', 'โมเมนต์เล็กๆ ที่น่ารักดี 💫', 'เพื่อนสองคนหยอกล้อกันในร้าน'],
    ['m17', 'แสงดี วิวดี คนในรูปก็ดี 🌤️', 'เมลยืนริมทางเดินไม้ใกล้น้ำ'],
    ['m18', 'ปล่อยใจไปกับสายน้ำ 🍃', 'ภาพนั่งพักริมระเบียงไม้ริมน้ำ'],
    ['m19', 'เก็บรูปไว้ เก็บความรู้สึกด้วย 📷', 'มือกำลังถือภาพโพลารอยด์สองใบ'],
    ['m20', 'ไว้มาเติมอัลบั้มนี้ด้วยกันอีกนะ 💗', 'ภาพกลุ่มเพื่อนผ่านกระจกทรงกลมในร้าน'],
  ];
  const gallery = document.getElementById('memory-gallery');
  // Default captions live in photos above; edits are saved by photo ID on this device.
  let savedCaptions = {};
  try {
    const saved = JSON.parse(localStorage.getItem('hbd-mel-captions') || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) savedCaptions = saved;
  } catch { /* A blocked storage API must not prevent opening the album. */ }
  photos.forEach(photo => { if (typeof savedCaptions[photo[0]] === 'string') photo[1] = savedCaptions[photo[0]].slice(0, 240); });
  const viewer = document.getElementById('photo-viewer');
  const image = document.getElementById('photo-full');
  const thumbnails = document.getElementById('photo-thumbnails');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const caption = document.getElementById('photo-caption');
  const count = document.getElementById('photo-count');
  count.setAttribute('aria-live', 'polite');
  image.draggable = false;
  let current = 0, opener = null, previousOverflow = '', revision = 0, drag = null;
  let imageAnimation = null, dialogAnimation = null;
  const thumbButtons = [];

  function commitPhoto(index, direction) {
    const [file, text, alt] = photos[index];
    imageAnimation?.cancel();
    image.style.transform = '';
    image.src = `assets/photos/${file}-1440.webp`;
    image.alt = alt;
    caption.textContent = text;
    count.textContent = `${index + 1} / ${photos.length} · Our little memories`;
    thumbButtons.forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
    const thumb = thumbButtons[index];
    requestAnimationFrame(() => {
      if (!viewer.open || current !== index) return;
      thumbnails.scrollTo({left: thumb.offsetLeft - thumbnails.offsetLeft - thumbnails.clientWidth / 2 + thumb.offsetWidth / 2,
        behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    });
    if (!reducedMotion.matches && viewer.open) {
      imageAnimation = image.animate([
        {opacity: .35, transform: `translateX(${direction * 42}px) scale(.975)`},
        {opacity: 1, transform: 'translateX(0) scale(1)'}
      ], {duration: 360, easing: 'cubic-bezier(.22,1,.36,1)'});
    }
    // Cache just the two neighbours, so swiping does not wait for a blank image.
    [-1, 1].forEach(step => { const next = new Image(); next.src = `assets/photos/${photos[(index + step + photos.length) % photos.length][0]}-1440.webp`; });
  }

  async function show(index, direction = 0) {
    current = (index + photos.length) % photos.length;
    const target = current;
    const request = ++revision;
    viewer.setAttribute('aria-busy', 'true');
    if (viewer.open) {
      const preload = new Image();
      preload.src = `assets/photos/${photos[target][0]}-1440.webp`;
      try { await preload.decode(); }
      catch {
        if (request === revision) { viewer.setAttribute('aria-busy', 'false'); caption.textContent = 'โหลดรูปไม่สำเร็จ ลองเลื่อนไปรูปอื่นก่อนนะ ♡'; }
        return;
      }
    }
    // Rapid navigation or closing the viewer invalidates older image requests.
    if (request !== revision) return;
    commitPhoto(target, direction);
    viewer.setAttribute('aria-busy', 'false');
  }

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      revealObserver.unobserve(entry.target);
      if (!reducedMotion.matches) entry.target.animate([
        {opacity: 0, translate: '0 30px'}, {opacity: 1, translate: '0 0'}
      ], {duration: 650, delay: Number(entry.target.dataset.index) % 3 * 65, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards'});
    });
  }, {threshold: .12});

  photos.forEach(([file, text, alt], index) => {
    const card = document.createElement('figure');
    card.className = 'memory-card'; card.dataset.index = index;
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `ดูรูป ${index + 1}: ${alt}`);
    const img = document.createElement('img');
    const landscape = ['m5', 'm6', 'm8'].includes(file);
    const thumbWidth = landscape ? 640 : 480;
    const fullWidth = landscape ? 1440 : ['m2', 'm10'].includes(file) ? 1080 : 1081;
    img.width = thumbWidth; img.height = landscape ? 480 : 640;
    img.src = `assets/photos/${file}-640.webp`;
    img.srcset = `assets/photos/${file}-640.webp ${thumbWidth}w, assets/photos/${file}-1440.webp ${fullWidth}w`;
    img.sizes = '(max-width: 640px) 44vw, 300px';
    img.alt = alt; img.loading = 'lazy'; img.decoding = 'async'; img.draggable = false;
    const cap = document.createElement('span'); cap.className = 'memory-caption'; cap.textContent = text;
    const number = document.createElement('span'); number.className = 'memory-number'; number.textContent = `MEMORY ${String(index + 1).padStart(2, '0')} / 18 ♡`;
    button.append(img, cap, number); card.append(button); gallery.append(card);
    const editor = document.createElement('details'); editor.className = 'caption-editor';
    const summary = document.createElement('summary'); summary.textContent = '✎ แก้ไขแคปชั่น';
    const input = document.createElement('textarea'); input.value = text; input.maxLength = 240; input.rows = 3;
    input.setAttribute('aria-label', `แคปชั่นรูปที่ ${index + 1}`);
    const save = document.createElement('button'); save.type = 'button'; save.textContent = 'บันทึกแคปชั่น';
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    editor.append(summary, input, save, status); card.append(editor);
    save.addEventListener('click', () => {
      photos[index][1] = input.value; cap.textContent = input.value; savedCaptions[file] = input.value;
      if (current === index) caption.textContent = input.value;
      try { localStorage.setItem('hbd-mel-captions', JSON.stringify(savedCaptions)); status.textContent = 'บันทึกในเครื่องนี้แล้ว ♡'; }
      catch { status.textContent = 'แสดงข้อความแล้ว แต่เครื่องนี้บันทึกถาวรไม่ได้'; }
    });
    revealObserver.observe(card);

    const thumb = document.createElement('button'); thumb.type = 'button';
    thumb.setAttribute('aria-label', `ไปยังรูป ${index + 1}`);
    const preview = document.createElement('img'); preview.src = `assets/photos/${file}-640.webp`; preview.alt = ''; preview.loading = 'lazy';
    thumb.append(preview); thumbnails.append(thumb); thumbButtons.push(thumb);
    thumb.addEventListener('click', () => show(index, index >= current ? 1 : -1));

    let frame = 0;
    card.addEventListener('pointermove', event => {
      if (!finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        card.style.setProperty('--tilt-x', `${-y * 4}deg`);
        card.style.setProperty('--tilt-y', `${x * 4}deg`);
      });
    });
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      card.style.removeProperty('--tilt-x'); card.style.removeProperty('--tilt-y');
    });
    button.addEventListener('click', () => {
      opener = button; show(index); previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden'; viewer.showModal();
      if (!reducedMotion.matches) dialogAnimation = viewer.animate([
        {opacity: 0, transform: 'translateY(16px) scale(.96)'}, {opacity: 1, transform: 'translateY(0) scale(1)'}
      ], {duration: 300, easing: 'cubic-bezier(.22,1,.36,1)'});
      document.getElementById('photo-close').focus();
    });
  });

  image.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    imageAnimation?.cancel();
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY};
    image.setPointerCapture(event.pointerId);
  });
  image.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId || reducedMotion.matches) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.abs(dx) > Math.abs(dy)) image.style.transform = `translateX(${Math.max(-100, Math.min(100, dx * .4))}px) rotate(${dx * .008}deg)`;
  });
  function finishDrag(event, cancelled = false) {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    drag = null;
    const from = image.style.transform;
    image.style.transform = '';
    if (image.hasPointerCapture(event.pointerId)) image.releasePointerCapture(event.pointerId);
    if (!cancelled && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) show(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    else if (from && !reducedMotion.matches) imageAnimation = image.animate([{transform: from}, {transform: 'none'}], {duration: 220, easing: 'ease-out'});
  }
  image.addEventListener('pointerup', event => finishDrag(event));
  image.addEventListener('pointercancel', event => finishDrag(event, true));
  image.addEventListener('lostpointercapture', () => { drag = null; image.style.transform = ''; });
  document.getElementById('photo-close').addEventListener('click', () => viewer.close());
  document.getElementById('photo-prev').addEventListener('click', () => show(current - 1, -1));
  document.getElementById('photo-next').addEventListener('click', () => show(current + 1, 1));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1, -1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1, 1); }
  });
  viewer.addEventListener('click', event => { if (event.target === viewer) { const r = viewer.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) viewer.close(); } });
  viewer.addEventListener('close', () => {
    revision++; drag = null; imageAnimation?.cancel(); dialogAnimation?.cancel(); image.style.transform = '';
    viewer.setAttribute('aria-busy', 'false'); document.body.style.overflow = previousOverflow; opener?.focus();
  });
})();
