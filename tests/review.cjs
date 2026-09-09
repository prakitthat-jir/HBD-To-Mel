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
  await page.locator('#btn-goto-gallery').click();
  await page.locator('#screen-gallery.active').waitFor();
  assert.equal(await page.locator('.memory-card').count(), 18);
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
  assert.match(await page.locator('#photo-count').textContent(), /^1 \/ 18/);
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => document.querySelector('#photo-count').textContent.startsWith('18 /'));
  assert.match(await page.locator('#photo-count').textContent(), /^18 \/ 18/);
  await page.locator('#photo-next').click();
  await page.waitForFunction(() => document.querySelector('#photo-count').textContent.startsWith('1 /'));
  assert.match(await page.locator('#photo-count').textContent(), /^1 \/ 18/);
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
  await page.locator('#btn-blow').click();
  assert.equal(await page.locator('#cake-canvas').getAttribute('data-lit'), '0');
  await page.locator('#cake-continue').click();
  await page.locator('#screen-letter.active').waitFor();
  await page.locator('#envelope').click();
  await page.locator('#letter-content').waitFor({ state: 'visible' });
  await page.locator('#btn-show-short').click();
  await page.locator('#modal-ok').click();
  await page.locator('#short-reveal.show').waitFor();
  await page.locator('#btn-theme').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'sakura');
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
  assert.match(await page.locator('#photo-count').textContent(), /^2 \/ 18/);
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

test('captions persist independently and render user text safely',async t=>{
  const page=await setup(t);await page.locator('#btn-goto-gallery').evaluate(b=>b.click());await page.locator('#screen-gallery.active').waitFor();
  const cards=page.locator('.memory-card');
  for(let i=0;i<2;i++){
    await cards.nth(i).locator('summary').click();await cards.nth(i).locator('textarea').fill(i?'Another memory':'<img src=x onerror=alert(1)>');await cards.nth(i).locator('.caption-editor button').click();
  }
  await page.reload();await page.locator('#btn-goto-gallery').evaluate(b=>b.click());await page.locator('#screen-gallery.active').waitFor();
  assert.equal(await cards.nth(0).locator('.memory-caption').textContent(),'<img src=x onerror=alert(1)>');assert.equal(await cards.nth(1).locator('.memory-caption').textContent(),'Another memory');assert.equal(await cards.locator('.memory-caption img').count(),0);
  await cards.nth(0).locator('button').first().click();assert.equal(await page.locator('#photo-caption').textContent(),'<img src=x onerror=alert(1)>');
});

for(const width of [1280,390])test(`3D cake studio placement, rotation, editing and export at ${width}px`,async t=>{
  const page=await setup(t,{viewport:{width,height:1000}});await page.locator('#btn-goto-cake').evaluate(b=>b.click());
  await page.waitForFunction(()=>document.querySelector('#screen-cake').dataset.renderer==='webgl');
  const canvas=page.locator('#cake-canvas');await canvas.scrollIntoViewIfNeeded();
  await page.locator('#cake-reset-view').click();await page.waitForTimeout(350);
  fs.mkdirSync(path.join(__dirname,'..','test-results'),{recursive:true});
  await page.screenshot({path:path.join(__dirname,'..','test-results',`cake-3d-pristine-${width}.png`),fullPage:true});
  assert.equal(await canvas.getAttribute('data-lit'),'3');
  await page.locator('#cake-clear').click();assert.equal(await canvas.getAttribute('data-items'),'0');
  await page.locator('#tab-toppings').click();
  const clickSurface=async(x=.5,y=.55)=>{await canvas.scrollIntoViewIfNeeded();const r=await canvas.boundingBox();await canvas.click({position:{x:r.width*x,y:r.height*y}});};
  for(const [i,type] of ['strawberry','cherry','cream','flower','bow','chocolate','candle','sprinkles'].entries()){
    await page.locator(`[data-topping="${type}"]`).click();await clickSurface(.46+(i%3)*.04,.53+(i%2)*.035);
    assert.equal(Number(await canvas.getAttribute('data-items')),i+1,`place ${type} on 3D surface`);
  }
  await page.locator('#cake-item-scale').fill('1.4');await page.locator('#cake-item-scale').dispatchEvent('change');
  await page.locator('#cake-item-angle').fill('90');await page.locator('#cake-item-angle').dispatchEvent('change');
  await page.locator('#cake-move-item').click();await clickSurface(.56,.58);assert.equal(await canvas.getAttribute('data-items'),'8');
  await page.locator('#cake-delete-item').click();assert.equal(await canvas.getAttribute('data-items'),'7');
  await page.locator('#cake-undo').click();assert.equal(await canvas.getAttribute('data-items'),'8');
  await canvas.scrollIntoViewIfNeeded();let r=await canvas.boundingBox();const oldYaw=Number(await canvas.getAttribute('data-yaw'));
  await page.mouse.move(r.x+r.width*.7,r.y+r.height*.55);await page.mouse.down();await page.mouse.move(r.x+r.width*.3,r.y+r.height*.55,{steps:12});await page.mouse.up();
  await page.waitForFunction(old=>Math.abs(Number(document.querySelector('#cake-canvas').dataset.yaw)-old)>.3,oldYaw);
  assert.equal(await canvas.getAttribute('data-items'),'8','rotation never places a decoration');
  await page.locator('#cake-reset-view').click();await page.waitForTimeout(350);
  await page.locator('#tab-base').click();await page.locator('#cake-flavor').selectOption('#664035');await page.locator('#cake-size').selectOption('3');
  await page.locator('#cake-size').selectOption('1');await page.locator('#cake-size').selectOption('2');await page.locator('#cake-flavor').selectOption('#f5a9bd');
  assert.equal(await canvas.getAttribute('data-items'),'8','changing tiers retains placed pieces');
  await page.locator('#tab-piping').click();await canvas.scrollIntoViewIfNeeded();r=await canvas.boundingBox();
  await page.mouse.move(r.x+r.width*.46,r.y+r.height*.56);await page.mouse.down();await page.mouse.move(r.x+r.width*.55,r.y+r.height*.56,{steps:8});await page.mouse.up();assert.equal(await canvas.getAttribute('data-strokes'),'1');
  await page.locator('#tab-text').click();await page.locator('#cake-message').fill('HBD Mel ♡');await page.locator('#cake-add-text').click();assert.equal(await canvas.getAttribute('data-items'),'9');
  await page.locator('#tab-toppings').click();await page.locator('#cake-rain').click();assert.equal(await canvas.getAttribute('data-items'),'33');
  await page.locator('#cake-gala').click();await page.waitForTimeout(700);
  const download=page.waitForEvent('download');await page.locator('#cake-export').click();const file=await download;assert.equal(file.suggestedFilename(),'Mel-birthday-cake-3D.png');
  const bytes=fs.readFileSync(await file.path());assert.equal(bytes.readUInt32BE(16),1600);assert.equal(bytes.readUInt32BE(20),1300);
  fs.writeFileSync(path.join(__dirname,'..','test-results',`cake-3d-export-${width}.png`),bytes);
  await page.screenshot({path:path.join(__dirname,'..','test-results',`cake-3d-studio-${width}.png`),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#btn-blow').click();assert.equal(await canvas.getAttribute('data-lit'),'0');await page.locator('#cake-continue').click();await page.locator('#screen-letter.active').waitFor();
});

test('3D studio touch rotation, keyboard placement and reduced motion',async t=>{
  const page=await setup(t,{viewport:{width:390,height:1000}});await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#btn-goto-cake').evaluate(b=>b.click());await page.waitForFunction(()=>document.querySelector('#screen-cake').dataset.renderer==='webgl');
  const canvas=page.locator('#cake-canvas');await canvas.scrollIntoViewIfNeeded();assert.equal(await page.locator('#cake-auto').getAttribute('aria-pressed'),'false');
  const before=await canvas.getAttribute('data-items'),r=await canvas.boundingBox();
  const touch=await page.context().newCDPSession(page);await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  const x=r.x+r.width*.7,y=r.y+r.height*.55;await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=5;i++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*20,y}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>Number(document.querySelector('#cake-canvas').dataset.yaw)<-.3);assert.equal(await canvas.getAttribute('data-items'),before);
  await page.locator('#cake-reset-view').click();await page.locator('#tab-toppings').click();await page.locator('[data-topping="strawberry"]').click();await canvas.scrollIntoViewIfNeeded();const tapBox=await canvas.boundingBox();
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tapBox.x+tapBox.width*.5,y:tapBox.y+tapBox.height*.55}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(Number(await canvas.getAttribute('data-items')),Number(before)+1,'a touch tap places one strawberry');
  await canvas.focus();await page.keyboard.press('Enter');assert.equal(Number(await canvas.getAttribute('data-items')),Number(before)+2);
  await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>Number(document.querySelector('#cake-canvas').dataset.yaw)>.2);
});

test('unavailable WebGL keeps a working fallback and letter navigation',async t=>{
  const page=await setup(t,{init:()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:get.call(this,type,...args);};}});
  await page.locator('#btn-goto-cake').evaluate(b=>b.click());await page.waitForFunction(()=>document.querySelector('#screen-cake').dataset.renderer==='fallback'&&document.querySelector('#cake-canvas').dataset.lit==='3');
  await page.locator('#btn-blow').click();assert.equal(await page.locator('#cake-canvas').getAttribute('data-lit'),'0');await page.locator('#cake-continue').click();await page.locator('#screen-letter.active').waitFor();
});
