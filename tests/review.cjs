const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

let browser, server, origin;
before(async () => {
  server = http.createServer((req, res) => {
    const root = path.resolve(__dirname, '..');
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, requested === '/' ? 'index.html' : `.${requested}`);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    if (path.extname(file) === '.mp3' && req.headers.range) {
      const data = fs.readFileSync(file);
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      const start = Number(match?.[1] || 0), end = Math.min(Number(match?.[2] || data.length - 1), data.length - 1);
      res.writeHead(206, { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1 });
      res.end(data.subarray(start, end + 1));
      return;
    }
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}), args:['--enable-unsafe-swiftshader']});
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });

async function setup(t, options = {}) {
  const page = await browser.newPage({ viewport: options.viewport || { width: 1280, height: 900 } });
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'no uncaught browser errors'));
  // A silent WAV fixture exercises native audio without distributing the song.
  const wav = Buffer.alloc(44 + 8000);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(8000, 40);
  if (!options.realMusic) await page.route('**/music.mp3', route => options.noMusic
    ? route.fulfill({status:404, body:''})
    : route.fulfill({contentType:'audio/wav', body:wav}));
  // Every Apps Script request is intercepted; tests never write to the real sheet.
  await page.route('https://script.google.com/**', options.remote || (route => route.fulfill({
    contentType: 'application/json', body: route.request().method() === 'POST' ? '{"ok":true}' : '[]'
  })));
  if (options.init) await page.addInitScript(options.init);
  await page.goto(origin);
  if (options.beforeUnlock) await options.beforeUnlock(page);
  await page.locator('#lock-input').fill('wrong');
  await page.locator('#btn-unlock').click();
  assert.match(await page.locator('#lock-error').textContent(), /รหัสไม่ถูก/);
  assert.equal(await page.locator('#modal-text').textContent(), 'เลขวันเดือนปีเกิดของคุณ');
  await page.locator('#modal-ok').click();
  await page.locator('#lock-input').fill('wrong-again');
  await page.locator('#lock-input').press('Enter');
  await page.locator('#modal:not(.hidden)').waitFor();
  assert.equal(await page.locator('#modal-text').textContent(), 'เลขวันเดือนปีเกิดของคุณ');
  await page.locator('#modal-ok').click();
  await page.locator('#lock-input').fill('23092001');
  await page.locator('#btn-unlock').click();
  await page.locator('#screen-landing.active').waitFor();
  return page;
}
async function next(page) {
  await page.locator('#btn-next').waitFor({ state: 'visible' });
  await page.locator('#btn-next').click();
}

for (const width of [1280, 390]) test(`full birthday flow at ${width}px, single-answer quiz and safe text`, async t => {
  const page = await setup(t, { viewport: { width, height: 900 } });
  let quizPosts=0;page.on('request',request=>{if(request.url().startsWith('https://script.google.com/')&&request.method()==='POST'&&request.postDataJSON()?.type==='quiz')quizPosts++;});
  await page.locator('#btn-start').click();
  for (const answer of ['B', 'D', 'B', 'F', 'E', 'C', 'A']) {
    await page.locator(`#quiz-choices [data-key="${answer}"]`).click();
    await next(page);
  }
  await page.locator('#quiz-choices [data-key="F"]').click();
  await next(page);
  const payload = '<img src=x onerror="window.injected=true">';
  await page.locator('#quiz-text-input').fill(payload);
  await page.locator('#btn-text-submit').click();
  // Two queued clicks must advance by only one question.
  await page.locator('#btn-next').evaluate(button => { button.click(); button.click(); });
  assert.match(await page.locator('#quiz-progress-label').textContent(), /10 \/ 10/);
  await page.locator('#quiz-text-input').fill('ขอให้มีความสุข');
  await page.locator('#btn-text-submit').click();
  await next(page);
  await page.locator('#screen-result.active').waitFor();
  fs.mkdirSync(path.join(__dirname, '..', 'test-results'), { recursive: true });
  await page.screenshot({ path: path.join(__dirname, '..', 'test-results', `result-${width}.png`), fullPage: true, animations: 'disabled' });
  assert.equal(await page.locator('#result-score').textContent(), '10/10');
  assert.equal(await page.locator('#result-answers img').count(), 0);
  assert.ok((await page.locator('#result-answers').textContent()).includes(payload));
  assert.equal(await page.evaluate(() => window.injected), undefined);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('hbd-mel-history')).length), 1);
  assert.equal(await page.locator('#stepbar button:enabled').count(), 5);
  await page.locator('#stepbar [data-step="letter"]').click();
  await page.locator('#screen-letter.active').waitFor();
  await page.locator('#stepbar [data-step="gallery"]').click();
  await page.locator('#screen-gallery.active').waitFor();
  assert.equal(await page.locator('.memory-card').count(), 26);
  for (const photo of await page.locator('.memory-card img').all()) {
    await photo.scrollIntoViewIfNeeded();
    await photo.evaluate(img => img.decode());
    assert.ok(await photo.evaluate(img => img.naturalWidth > 0));
  }
  await page.locator('#screen-gallery').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(__dirname, '..', 'test-results', `gallery-${width}.png`), fullPage: true, animations: 'disabled' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('.memory-card button').first().click();
  await page.locator('#photo-full').evaluate(img => img.decode());
  assert.match(await page.locator('#photo-count').textContent(), /^1 \/ 26/);
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => document.querySelector('#photo-count').textContent.startsWith('26 /'));
  assert.match(await page.locator('#photo-count').textContent(), /^26 \/ 26/);
  await page.locator('#photo-next').click();
  await page.waitForFunction(() => document.querySelector('#photo-count').textContent.startsWith('1 /'));
  assert.match(await page.locator('#photo-count').textContent(), /^1 \/ 26/);
  // Drag the actual image; a short drag snaps back without changing the photo.
  const bounds = await page.locator('#photo-full').boundingBox();
  await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .2, bounds.y + bounds.height / 2, {steps: 8});
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('#photo-count').textContent.startsWith('2 /'));
  await page.locator('#photo-thumbnails button').nth(5).click();
  await page.waitForFunction(() => document.querySelector('#photo-count').textContent.startsWith('6 /'));
  assert.equal(await page.locator('#photo-thumbnails button[aria-current="true"]').count(), 1);
  await page.screenshot({ path: path.join(__dirname, '..', 'test-results', `viewer-${width}.png`), animations: 'disabled' });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#photo-viewer').evaluate(dialog => dialog.open), false);
  assert.equal(await page.locator('.memory-card button').first().evaluate(button => document.activeElement === button), true);
  await page.locator('#btn-goto-cake').click();
  await page.locator('#screen-cake.active').waitFor();
  await page.waitForFunction(()=>document.querySelector('#screen-cake').dataset.renderer==='webgl');
  for(let i=0;i<3;i++) await page.locator('#btn-blow').click();
  assert.equal(await page.locator('#cake-canvas').getAttribute('data-lit'), '0');
  await page.locator('#cake-continue').click();
  await page.locator('#screen-letter.active').waitFor();
  await page.locator('#envelope').click();
  await page.locator('#letter-content').waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(__dirname, '..', 'test-results', `letter-${width}.png`), fullPage: true, animations: 'disabled' });
  const ruled = await page.locator('#letter-main-text').evaluate(p => { const s = getComputedStyle(p); return { line: parseFloat(s.lineHeight), grid: parseFloat(s.backgroundSize.split(' ')[1]) }; });
  assert.ok(Math.abs(ruled.line - ruled.grid) < .1);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('#btn-show-short').click();
  await page.locator('#modal-ok').click();
  await page.locator('#short-reveal.show').waitFor();
  if (width <= 1200) await page.locator('#btn-tools').click();
  await page.locator('#btn-theme').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'sakura');
  await page.locator('#screen-letter [data-chapter-direction="-1"]').click();await page.locator('#screen-cake.active').waitFor();assert.equal(await page.locator('#screen-cake').getAttribute('data-phase'),'show');
  await page.locator('#stepbar [data-step="quiz"]').click();await page.locator('#screen-result.active').waitFor();
  assert.equal(await page.locator('.quiz-saved-answer').count(),10);assert.equal(await page.locator('#result-score').textContent(),'10/10');assert.equal(await page.locator('#quiz-text-input').isVisible(),false);
  const completedProgress = await page.evaluate(() => localStorage.getItem('hbd-mel-quiz-progress-v1'));
  await page.locator('#stepbar [data-step="landing"]').click();
  await page.locator('#btn-start').click(); await page.locator('#screen-quiz.active').waitFor();
  assert.match(await page.locator('#quiz-progress-label').textContent(), /ข้อ 1 \/ 10/);
  assert.match(await page.locator('#quiz-score-label').textContent(), /0 คะแนน/);
  assert.equal(await page.locator('#stepbar button:enabled').count(), 0);
  await page.locator('#quiz-choices [data-key="B"]').click();
  await page.locator('#btn-next').waitFor({ state: 'visible' });
  assert.match(await page.locator('#quiz-score-label').textContent(), /1 คะแนน/);
  const newProgress = await page.evaluate(() => JSON.parse(localStorage.getItem('hbd-mel-quiz-progress-v1')));
  assert.equal(newProgress.log.length, 1); assert.equal(newProgress.committed, false);
  // Opening the site with a completed saved attempt must also allow answering.
  await page.evaluate(value => localStorage.setItem('hbd-mel-quiz-progress-v1', value), completedProgress);
  await page.reload(); await page.locator('#lock-input').fill('23092001'); await page.locator('#btn-unlock').click();
  await page.locator('#screen-landing.active').waitFor(); await page.locator('#btn-start').click();
  await page.locator('#screen-quiz.active').waitFor();
  assert.match(await page.locator('#quiz-progress-label').textContent(), /ข้อ 1 \/ 10/);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('hbd-mel-history')).length), 1);
  assert.equal(quizPosts, 1, 'starting again must not submit an unfinished attempt');

});

test('gallery rapid navigation ignores late photos and respects reduced motion', async t => {
  const page = await setup(t);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.locator('#btn-goto-gallery').evaluate(button => button.click());
  await page.locator('#screen-gallery.active').waitFor();
  const delayed = [];
  await page.route('**/m1-1440.webp', route => { delayed.push(route); });
  await page.locator('.memory-card button').first().click();
  await page.locator('#photo-next').evaluate(button => { button.click(); button.click(); });
  await page.waitForFunction(() => document.querySelector('#photo-count').textContent.startsWith('3 /'));
  assert.ok(delayed.length);
  await Promise.all(delayed.map(route => route.fulfill({contentType: 'image/webp', body: fs.readFileSync(path.join(__dirname, '..', 'assets/photos/m1-1440.webp'))})));
  await page.waitForTimeout(200);
  assert.match(await page.locator('#photo-full').getAttribute('src'), /m2-1440/);
  assert.equal(await page.locator('#photo-full').evaluate(img => img.getAnimations().length), 0);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('body').evaluate(body => body.style.overflow), '');
});

test('gallery touch swipes change photos without treating taps as swipes', async t => {
  const page = await setup(t, {viewport: {width:390, height:844}});
  const touch = await page.context().newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled', {enabled:true, maxTouchPoints:1});
  await page.locator('#btn-goto-gallery').evaluate(button => button.click());
  await page.locator('.memory-card button').first().click();
  await page.locator('#photo-viewer').evaluate(dialog => Promise.all(dialog.getAnimations().map(a => a.finished)));
  const rect = await page.locator('#photo-full').boundingBox();
  const x = rect.x + rect.width * .75, y = rect.y + rect.height / 2;
  async function swipe(distance) {
    await touch.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x,y}]});
    for (let i = 1; i <= 5; i++) await touch.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:x-distance*i/5,y}]});
    await touch.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
  }
  await swipe(130);
  await page.waitForFunction(() => document.querySelector('#photo-count').textContent.startsWith('2 /'));
  await page.locator('#photo-full').evaluate(img => Promise.all(img.getAnimations().map(a => a.finished)));
  await swipe(8);
  assert.match(await page.locator('#photo-count').textContent(), /^2 \/ 26/);
  await page.locator('#photo-close').click();
  assert.equal(await page.locator('#photo-viewer').evaluate(dialog => dialog.open), false);
});

test('background audio retries blocked autoplay, loops, and stays off after muting', async t => {
  const page = await setup(t, {
    init: () => {
      const original = HTMLMediaElement.prototype.play;
      let first = true;
      HTMLMediaElement.prototype.play = function() {
        if (first) { first = false; return Promise.reject(new DOMException('Blocked', 'NotAllowedError')); }
        return original.call(this);
      };
    },
    beforeUnlock: async page => {
      await page.waitForFunction(() => document.querySelector('#btn-music').dataset.state === 'blocked');
      assert.equal(await page.locator('#btn-music').isVisible(), true);
      assert.equal(await page.locator('.music-card, #youtube-player, #music-toggle').count(), 0);
    }
  });
  await page.waitForFunction(() => document.querySelector('#btn-music').dataset.state === 'playing');
  await page.waitForFunction(() => document.querySelector('#bgm').volume === 0.22);
  assert.deepEqual(await page.locator('#bgm').evaluate(a => [a.loop, a.volume, a.controls]), [true, 0.22, false]);
  await page.locator('#bgm').evaluate(a => { window.__loops = 0; a.addEventListener('playing', () => window.__loops++); a.currentTime = a.duration - 0.05; });
  await page.waitForFunction(() => window.__loops > 0);
  await page.locator('#btn-music').click();
  assert.equal(await page.locator('#bgm').evaluate(a => a.paused), true);
  await page.locator('#btn-start').click();
  assert.equal(await page.locator('#bgm').evaluate(a => a.paused), true);
  await page.locator('#btn-music').click();
  await page.waitForFunction(() => !document.querySelector('#bgm').paused);
});

test('missing audio does not block the birthday experience', async t => {
  const page = await setup(t, { noMusic: true });
  await page.waitForFunction(() => document.querySelector('#btn-music').dataset.state === 'unavailable');
  await page.locator('#btn-start').click();
  await page.locator('#screen-quiz.active').waitFor();
  assert.equal(await page.locator('#btn-music').getAttribute('aria-pressed'), 'false');
});

test('real music file plays, loops at the end, and can be turned off', async t => {
  const page = await setup(t, { realMusic: true });
  await page.waitForFunction(() => document.querySelector('#btn-music').dataset.state === 'playing');
  await page.waitForFunction(() => document.querySelector('#bgm').volume === 0.22);
  const media = await page.locator('#bgm').evaluate(audio => ({
    duration: audio.duration, loop: audio.loop, volume: audio.volume, error: audio.error
  }));
  assert.ok(Number.isFinite(media.duration) && media.duration > 0);
  assert.equal(media.loop, true);
  assert.equal(media.volume, 0.22);
  assert.equal(media.error, null);
  await page.locator('#bgm').evaluate(audio => { audio.currentTime = audio.duration - 0.15; });
  await page.waitForFunction(() => {
    const audio = document.querySelector('#bgm');
    return audio.currentTime < 2 && !audio.paused;
  });
  await page.locator('#btn-music').click();
  assert.equal(await page.locator('#bgm').evaluate(audio => audio.paused), true);
  await page.locator('#btn-start').click();
  assert.equal(await page.locator('#bgm').evaluate(audio => audio.paused), true);
  assert.equal(await page.locator('.music-card, iframe').count(), 0);
});

test('late comments preserve drafts and cannot replace history', async t => {
  // Invoke the letter's buttons directly to isolate async sheet behavior from the quiz.
  let pending = [];
  const page = await setup(t, { remote: route => { pending.push(route); } });
  await page.locator('#btn-comment').evaluate(button => button.click());
  await page.locator('#cmt-name').fill('Draft name');
  await page.locator('#cmt-input').fill('Draft text');
  await page.waitForFunction(() => document.querySelector('#cmt-input')?.value === 'Draft text');
  assert.equal(pending.length, 1);
  await pending.shift().fulfill({ contentType: 'application/json', body: '[]' });
  await page.waitForFunction(() => !document.querySelector('#sheet-body').textContent.includes('กำลังโหลด'));
  assert.equal(await page.locator('#cmt-name').inputValue(), 'Draft name');
  assert.equal(await page.locator('#cmt-input').inputValue(), 'Draft text');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'cmt-input');
  await page.locator('#sheet-close').click();
  await page.locator('#btn-comment').evaluate(button => button.click());
  await page.locator('#sheet-close').click();
  await page.locator('#btn-history').evaluate(button => button.click());
  await pending.shift().fulfill({ contentType: 'application/json', body: '[]' });
  await page.waitForTimeout(200);
  assert.match(await page.locator('#sheet-title').textContent(), /ประวัติ/);
});

test('double submit creates one entry; server rejection stays queued', async t => {
  let post, count = 0;
  const page = await setup(t, { remote: route => {
    if (route.request().method() === 'POST') { count++; post = route; }
    else return route.fulfill({ contentType: 'application/json', body: '[]' });
  }});
  await page.locator('#btn-comment').evaluate(button => button.click());
  await page.waitForFunction(() => !document.querySelector('#sheet-body').textContent.includes('กำลังโหลด'));
  await page.locator('#cmt-input').fill('Test');
  await page.locator('#cmt-send').evaluate(button => { button.click(); button.click(); });
  await page.waitForTimeout(150);
  assert.equal(count, 1);
  await post.fulfill({ contentType: 'application/json', body: '{"ok":false}' });
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('hbd-mel-outbox') || '[]').length === 1);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('hbd-mel-comments')).length), 1);
});

test('ambiguous network response is not automatically posted twice', async t => {
  let count = 0;
  const page = await setup(t, { remote: route => {
    if (route.request().method() === 'POST') { count++; return route.abort('failed'); }
    return route.fulfill({ contentType: 'application/json', body: '[]' });
  }});
  await page.locator('#btn-comment').evaluate(button => button.click());
  await page.waitForFunction(() => !document.querySelector('#sheet-body').textContent.includes('กำลังโหลด'));
  await page.locator('#cmt-input').fill('Network test');
  await page.locator('#cmt-send').click();
  await page.waitForFunction(() => document.querySelector('#sheet-body').textContent.includes('ยืนยันผลไม่ได้'));
  assert.equal(count, 1);
});

test('outbox flush preserves entries added while awaiting the server', async t => {
  let resolvePost;
  const firstPost = new Promise(resolve => { resolvePost = resolve; });
  const page = await setup(t, {
    init: () => localStorage.setItem('hbd-mel-outbox', JSON.stringify([{ text: 'old', name: '' }])),
    remote: route => {
      if (route.request().method() === 'POST') resolvePost(route);
      else return route.fulfill({ contentType: 'application/json', body: '[]' });
    }
  });
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  const post = await firstPost;
  await page.evaluate(() => {
    const queue = JSON.parse(localStorage.getItem('hbd-mel-outbox'));
    queue.push({ text: 'new', name: '' });
    localStorage.setItem('hbd-mel-outbox', JSON.stringify(queue));
  });
  await post.fulfill({ contentType: 'application/json', body: '{"ok":true}' });
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('hbd-mel-outbox')).length === 1);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('hbd-mel-outbox'))[0].text), 'new');
});

test('storage quota failure retains successive comments in memory', async t => {
  const page = await setup(t, { init: () => {
    const original = Storage.prototype.setItem;
    original.call(localStorage, 'hbd-mel-comments', '[]');
    Storage.prototype.setItem = function(key, value) {
      if (key === 'hbd-mel-comments') throw new DOMException('Quota full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  }});
  await page.locator('#btn-comment').evaluate(button => button.click());
  for (const value of ['First memory entry', 'Second memory entry']) {
    await page.waitForFunction(() => !document.querySelector('#sheet-body').textContent.includes('กำลังโหลด'));
    await page.locator('#cmt-input').fill(value);
    await page.locator('#cmt-send').click();
    await page.waitForFunction(value => [...document.querySelectorAll('.cmt')].some(el => el.textContent.includes(value)), value);
  }
  assert.equal(await page.locator('.cmt').count(), 2);
});

for (const width of [1280, 390]) test(`gallery is read-only at ${width}px`, async t => {
  const page = await setup(t, { viewport: { width, height: 900 }, init: () => {
    localStorage.setItem('hbd-mel-photo-order-2026-09-16T03:11:32.388Z', JSON.stringify(['S__21708804_0', 'm13']));
    localStorage.setItem('hbd-mel-captions-2026-09-16T04:04:12.953Z', JSON.stringify({m13: 'old draft'}));
  }});
  await page.locator('#btn-goto-gallery').evaluate(b => b.click());
  await page.locator('#screen-gallery.active').waitFor();
  assert.equal(await page.locator('.caption-editor, .photo-order-toolbar, .photo-order-controls, #btn-export-captions').count(), 0);
  assert.equal(await page.locator('.memory-card').count(), 26);
  const compact = await page.locator('.memory-grid').evaluate(grid => ({columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,imageHeight:grid.querySelector('img').getBoundingClientRect().height}));
  assert.equal(compact.columns, width > 760 ? 4 : 2);
  assert.ok(compact.imageHeight < 350);
  assert.match(await page.locator('.memory-card img').first().getAttribute('src'), /m13-640/);
  assert.notEqual(await page.locator('.memory-caption').first().textContent(), 'old draft');
  assert.equal(await page.locator('#memory-filters, .board-context').count(), 0);
  assert.equal(await page.locator('.memory-card img').first().evaluate(img => getComputedStyle(img).objectFit), 'contain');
  assert.equal(await page.locator('.memory-card:not([hidden])').count(), 26);
  await page.locator('.memory-card').first().scrollIntoViewIfNeeded();
  const imageRatios = await page.locator('.memory-card img').evaluateAll(async imgs => {
    await Promise.all(imgs.map(img => { img.loading = 'eager'; return img.decode(); }));
    return imgs.map(img => ({rendered:img.clientWidth / img.clientHeight, original:img.naturalWidth / img.naturalHeight}));
  });
  assert.ok(imageRatios.every(({rendered,original}) => Math.abs(rendered - original) < .015), 'every frame follows its photo aspect ratio without cropping');
  await page.waitForFunction(() => document.querySelector('.memory-card').style.gridRowEnd.startsWith('span'));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  fs.mkdirSync(path.join(__dirname, '..', 'test-results'), {recursive:true});
  await page.screenshot({path:path.join(__dirname, '..', 'test-results', `scrapbook-board-${width}.png`), animations:'disabled'});
  await page.locator('.memory-card button').first().click();
  assert.equal(await page.locator('#photo-related button').count(), 4);
  await page.locator('#photo-full').evaluate(img => img.decode());
  await page.locator('#photo-viewer').evaluate(dialog => Promise.all(dialog.getAnimations().map(a => a.finished)));
  await page.screenshot({path:path.join(__dirname, '..', 'test-results', `scrapbook-cloud-${width}.png`), animations:'disabled'});
  const relatedIndex = Number(await page.locator('#photo-related button').first().getAttribute('data-index'));
  await page.locator('#photo-related button').first().click();
  await page.waitForFunction(index => document.querySelector('#photo-count').textContent.startsWith(`${index + 1} /`), relatedIndex);
  assert.equal(await page.locator('#photo-viewer').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.memory-card button').first().evaluate(button => document.activeElement === button), true);
  await page.locator('.memory-card button').last().click();
  assert.match(await page.locator('#photo-caption').textContent(), /เด็กที่ไหน/);
  await page.keyboard.press('Escape');
});

test('chapter navigation is locked before and during the quiz, including after reload', async t => {
  const page = await setup(t);
  assert.equal(await page.locator('#stepbar button:enabled').count(), 0);
  assert.equal(await page.locator('#screen-landing .chapter-navigation button:enabled').count(), 0);
  await page.locator('#stepbar [data-step="gallery"]').evaluate(b => b.dispatchEvent(new MouseEvent('click')));
  assert.equal(await page.locator('#screen-landing').evaluate(s => s.classList.contains('active')), true);
  await page.locator('#btn-start').click();
  await page.locator('#screen-quiz.active').waitFor();
  assert.equal(await page.locator('#stepbar button:enabled').count(), 0);
  assert.equal(await page.locator('#screen-quiz .chapter-navigation button:enabled').count(), 0);
  await page.locator('#quiz-choices [data-key="B"]').click();
  await next(page);
  await page.locator('#stepbar [data-step="landing"]').evaluate(b => b.dispatchEvent(new MouseEvent('click')));
  assert.equal(await page.locator('#screen-quiz').evaluate(s => s.classList.contains('active')), true);
  await page.reload();
  await page.locator('#lock-input').fill('23092001'); await page.locator('#btn-unlock').click();
  await page.locator('#screen-landing.active').waitFor();
  assert.equal(await page.locator('#stepbar button:enabled').count(), 0);
  await page.locator('#btn-start').click();
  assert.match(await page.locator('#quiz-progress-label').textContent(), /ข้อ 2/);
});

test('chapter soundtrack crossfades, continues through the finale, loops and respects mute', async t => {
  const page = await setup(t, { realMusic: true });
  const chapter = name => page.evaluate(chapter => document.dispatchEvent(new CustomEvent('chapter-change', { detail: { chapter } })), name);
  await page.waitForFunction(() => document.querySelector('#bgm').volume === 0.22);
  await chapter('gallery');
  await page.waitForFunction(() => { const a = document.querySelector('#bgm-blue'); return !a.paused && a.volume > 0 && a.volume < 0.22; });
  await page.waitForFunction(() => document.querySelector('#bgm-blue').volume === 0.22 && document.querySelector('#bgm').paused);
  assert.match(await page.locator('#btn-music').getAttribute('aria-label'), /blue/);
  const position = await page.locator('#bgm-blue').evaluate(a => a.currentTime);
  assert.ok(position >= 76 && position < 81, 'blue starts at 1:16');
  await chapter('cake');
  await chapter('letter');
  assert.ok(await page.locator('#bgm-blue').evaluate((a, position) => a.currentTime >= position && !a.paused && !a.loop, position));
  for (let repeat = 0; repeat < 2; repeat++) {
    await page.locator('#bgm-blue').evaluate(a => { a.currentTime = a.duration - 0.1; });
    await page.waitForFunction(() => {
      const a = document.querySelector('#bgm-blue');
      return a.currentTime >= 76 && a.currentTime < 78 && !a.paused;
    });
  }
  await chapter('quiz');
  await page.waitForFunction(() => { const a = document.querySelector('#bgm'); return !a.paused && a.volume > 0 && a.volume < 0.22; });
  await page.waitForFunction(() => document.querySelector('#bgm').volume === 0.22 && document.querySelector('#bgm-blue').paused);
  assert.equal(await page.locator('#bgm-blue').evaluate(a => a.currentTime), 76);
  await chapter('gallery');
  await chapter('quiz');
  await chapter('letter');
  await page.waitForFunction(() => document.querySelector('#bgm-blue').volume === 0.22 && document.querySelector('#bgm').paused);
  await page.locator('#btn-music').click();
  await chapter('quiz');
  await chapter('gallery');
  assert.ok(await page.locator('audio').evaluateAll(list => list.every(a => a.paused && a.volume === 0)));
  await page.locator('#btn-music').click();
  await page.waitForFunction(() => document.querySelector('#bgm-blue').volume === 0.22 && !document.querySelector('#bgm-blue').paused);
});

test('audio fades tolerate a frame timestamp earlier than their start', async t => {
  const page = await setup(t, { realMusic: true, init: () => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => raf(time => callback(time - 100));
  }});
  await page.waitForFunction(() => document.querySelector('#bgm').volume === .22);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('chapter-change', {detail:{chapter:'gallery'}})));
  await page.waitForFunction(() => document.querySelector('#bgm').paused && document.querySelector('#bgm-blue').volume === .22);
});

for (const width of [320, 390]) test(`mobile tools remain usable at ${width}px`, async t => {
  const page = await setup(t, {viewport:{width,height:740}});
  await page.locator('#btn-start').click();
  await page.locator('#screen-quiz.active').waitFor();
  const header = await page.locator('#toolbar').boundingBox();
  const quiz = await page.locator('#screen-quiz .card').boundingBox();
  const steps = await page.locator('#stepbar').boundingBox();
  assert.ok(header.y + header.height <= quiz.y);
  assert.ok(steps.x + steps.width <= header.x);
  assert.equal(await page.locator('#btn-theme').isVisible(), false);
  await page.locator('#btn-tools').click();
  await page.locator('#btn-sfx').click();
  assert.equal(await page.locator('#btn-tools').getAttribute('aria-expanded'), 'false');
  await page.locator('#btn-tools').click();
  assert.match(await page.locator('#btn-sfx').textContent(), /เสียงเอฟเฟกต์/);
  fs.mkdirSync(path.join(__dirname, '..', 'test-results'), {recursive:true});
  await page.screenshot({path:path.join(__dirname, '..', 'test-results', `tools-${width}.png`), animations:'disabled'});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#btn-tools').getAttribute('aria-expanded'), 'false');

});

for(const width of [320,390,768,1024,1280]) test(`ready-made gala cake at ${width}px`,async t=>{
  const page=await setup(t,{viewport:{width,height:900}});
  await page.locator('#btn-goto-cake').evaluate(b=>b.click());
  await page.waitForFunction(()=>document.querySelector('#screen-cake').dataset.renderer==='webgl');
  const canvas=page.locator('#cake-canvas');
  assert.equal(await canvas.getAttribute('data-lit'),'3');
  assert.ok(Number(await canvas.getAttribute('data-items'))>25);
  assert.equal(await page.locator('#cake-catalog,.cake-panel,[data-panel],#cake-show,#cake-back-edit').count(),0);
  assert.equal(await page.locator('.gala-atmosphere').isVisible(),true);
  if(width<=1200){const toolbar=await page.locator('#toolbar').boundingBox(),heading=await page.locator('.cake-heading').boundingBox();assert.ok(toolbar.y+toolbar.height<=heading.y);}

  assert.equal(await page.locator('#cake-continue').isDisabled(),true);
  await page.locator('#cake-auto').click();
  await page.locator('#cake-reset-view').click();
  await canvas.press('ArrowRight');
  await page.waitForFunction(()=>Number(document.querySelector('#cake-canvas').dataset.yaw)>.3);
  const items=await canvas.getAttribute('data-items');const yaw=Number(await canvas.getAttribute('data-yaw'));
  await canvas.scrollIntoViewIfNeeded();const r=await canvas.boundingBox();
  await page.mouse.move(r.x+r.width*.7,r.y+r.height*.6);await page.mouse.down();await page.mouse.move(r.x+r.width*.3,r.y+r.height*.6,{steps:10});await page.mouse.up();
  await page.waitForFunction(old=>Math.abs(Number(document.querySelector('#cake-canvas').dataset.yaw)-old)>.4,yaw);
  assert.equal(await canvas.getAttribute('data-lit'),'3','dragging does not blow a candle');
  assert.equal(await canvas.getAttribute('data-items'),items);
  await page.locator('#cake-reset-view').click();await page.waitForTimeout(500);
  await page.evaluate(()=>scrollTo(0,0));
  fs.mkdirSync(path.join(__dirname,'..','test-results'),{recursive:true});
  await page.screenshot({path:path.join(__dirname,'..','test-results',`gala-ready-${width}.png`),fullPage:true,animations:'disabled'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await canvas.press('Enter');assert.equal(await canvas.getAttribute('data-lit'),'2');
  await page.locator('#btn-blow').click();await page.locator('#btn-blow').click();assert.equal(await canvas.getAttribute('data-lit'),'0');
  assert.equal(await page.locator('#cake-continue').isEnabled(),true);
  await page.locator('#cake-relight').click();assert.equal(await canvas.getAttribute('data-lit'),'3');
  for(let i=0;i<3;i++)await page.locator('#btn-blow').click();
  await page.locator('#cake-continue').click();await page.locator('#screen-letter.active').waitFor();
});

test('gala cake supports touch rotation and reduced motion',async t=>{
  const page=await setup(t,{viewport:{width:390,height:844}});await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#btn-goto-cake').evaluate(b=>b.click());await page.waitForFunction(()=>document.querySelector('#screen-cake').dataset.renderer==='webgl');
  assert.equal(await page.locator('#cake-auto').getAttribute('aria-pressed'),'false');
  const touch=await page.context().newCDPSession(page);await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  const c=page.locator('#cake-canvas');await c.scrollIntoViewIfNeeded();const r=await c.boundingBox(),x=r.x+r.width*.75,y=r.y+r.height*.65;
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=5;i++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*20,y}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>Number(document.querySelector('#cake-canvas').dataset.yaw)<-.3);
  assert.equal(await c.getAttribute('data-lit'),'3');
});

test('decorated fallback can blow, relight and continue without WebGL',async t=>{
  const page=await setup(t,{viewport:{width:390,height:844},init:()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:get.call(this,type,...args);};}});
  await page.locator('#btn-goto-cake').evaluate(b=>b.click());await page.waitForFunction(()=>document.querySelector('#cake-canvas').dataset.lit==='3');
  assert.equal(await page.locator('#screen-cake').getAttribute('data-renderer'),'fallback');
  assert.equal(await page.locator('.cake-view-controls').isVisible(),false);
  await page.screenshot({path:path.join(__dirname,'..','test-results','gala-fallback.png'),fullPage:true});
  await page.locator('#btn-blow').click();await page.locator('#cake-relight').click();
  assert.equal(await page.locator('#cake-canvas').getAttribute('data-lit'),'3');
  for(let i=0;i<3;i++)await page.locator('#btn-blow').click();await page.locator('#cake-continue').click();await page.locator('#screen-letter.active').waitFor();
});
