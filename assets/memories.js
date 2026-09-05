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
  const viewer = document.getElementById('photo-viewer');
  const image = document.getElementById('photo-full');
  let current = 0, opener = null, previousOverflow = '';
  function show(index) {
    current = (index + photos.length) % photos.length;
    const [file, caption, alt] = photos[current];
    image.src = `assets/photos/${file}-1440.webp`;
    image.alt = alt;
    document.getElementById('photo-caption').textContent = caption;
    document.getElementById('photo-count').textContent = `${current + 1} / ${photos.length} · Our little memories`;
  }
  photos.forEach(([file, caption, alt], index) => {
    const card = document.createElement('figure');
    card.className = 'memory-card';
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
    img.alt = alt; img.loading = 'lazy'; img.decoding = 'async';
    const cap = document.createElement('span'); cap.className = 'memory-caption'; cap.textContent = caption;
    const number = document.createElement('span'); number.className = 'memory-number'; number.textContent = `MEMORY ${String(index + 1).padStart(2, '0')} / 18 ♡`;
    button.append(img, cap, number); card.append(button); gallery.append(card);
    button.addEventListener('click', () => {
      opener = button; show(index); previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden'; viewer.showModal();
      document.getElementById('photo-close').focus();
    });
  });
  document.getElementById('photo-close').addEventListener('click', () => viewer.close());
  document.getElementById('photo-prev').addEventListener('click', () => show(current - 1));
  document.getElementById('photo-next').addEventListener('click', () => show(current + 1));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
  });
  viewer.addEventListener('click', event => { if (event.target === viewer) { const r = viewer.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) viewer.close(); } });
  viewer.addEventListener('close', () => { document.body.style.overflow = previousOverflow; opener?.focus(); });
})();
