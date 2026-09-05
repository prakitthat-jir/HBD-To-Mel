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
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });

async function setup(t, options = {}) {
  const page = await browser.newPage({ viewport: options.viewport || { width: 1280, height: 900 } });
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'no uncaught browser errors'));
  await page.route('https://www.youtube.com/iframe_api', route => route.fulfill({ contentType: 'text/javascript', body: `
    window.YT = { PlayerState: { PLAYING:1, PAUSED:2, ENDED:0 }, Player: function(id, options) {
      window.__musicOptions = options; window.__musicCalls = [];
      this.playVideo = () => { window.__musicCalls.push('play'); options.events.onStateChange({data:1}); };
      this.pauseVideo = () => { window.__musicCalls.push('pause'); options.events.onStateChange({data:2}); };
      this.seekTo = time => window.__musicCalls.push('seek:' + time);
      this.setVolume = () => {};
      setTimeout(() => options.events.onReady({target:this}), 0);
    }}; window.onYouTubeIframeAPIReady();
  ` }));
  // Every Apps Script request is intercepted; tests never write to the real sheet.
  await page.route('https://script.google.com/**', options.remote || (route => route.fulfill({
    contentType: 'application/json', body: route.request().method() === 'POST' ? '{"ok":true}' : '[]'
  })));
  if (options.init) await page.addInitScript(options.init);
  await page.goto(origin);
  await page.locator('#lock-input').fill('wrong');
  await page.locator('#btn-unlock').click();
  assert.match(await page.locator('#lock-error').textContent(), /รหัสไม่ถูก/);
  await page.locator('#lock-input').fill(' CARAMEL ');
  await page.locator('#btn-unlock').click();
  await page.locator('#screen-landing.active').waitFor();
  return page;
}
async function next(page) {
  await page.locator('#btn-next').waitFor({ state: 'visible' });
  await page.locator('#btn-next').click();
}

for (const width of [1280, 390]) test(`full birthday flow at ${width}px, exact multi-select and safe text`, async t => {
  const page = await setup(t, { viewport: { width, height: 900 } });
  await page.locator('#btn-start').click();
  for (const answer of ['B', 'D', 'B', 'F', 'E', 'C', 'A']) {
    await page.locator(`#quiz-choices [data-key="${answer}"]`).click();
    await next(page);
  }
  await page.locator('#quiz-choices [data-key="A"]').click();
  await page.locator('#quiz-choices [data-key="F"]').click();
  await page.locator('#btn-multi-check').click();
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
  assert.equal(await page.locator('#result-score').textContent(), '9/10');
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
  assert.match(await page.locator('#photo-count').textContent(), /^18 \/ 18/);
  await page.locator('#photo-next').click();
  assert.match(await page.locator('#photo-count').textContent(), /^1 \/ 18/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#photo-viewer').evaluate(dialog => dialog.open), false);
  assert.equal(await page.locator('.memory-card button').first().evaluate(button => document.activeElement === button), true);
  await page.locator('#btn-goto-cake').click();
  await page.locator('#screen-cake.active').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.candle.lit').length === 3);
  for (let i = 0; i < 3; i++) await page.locator('#btn-blow').click();
  await page.locator('#screen-letter.active').waitFor();
  await page.locator('#envelope').click();
  await page.locator('#letter-content').waitFor({ state: 'visible' });
  await page.locator('#btn-show-short').click();
  await page.locator('#modal-ok').click();
  await page.locator('#short-reveal.show').waitFor();
  await page.locator('#btn-theme').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'sakura');
});

test('music starts, loops, respects pause, and retries blocked autoplay on a gesture', async t => {
  const page = await setup(t);
  assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'), 'true');
  assert.deepEqual(await page.evaluate(() => [__musicOptions.videoId, __musicOptions.playerVars.loop, __musicOptions.playerVars.playlist]), ['Whu6oBYdYvk', 1, 'Whu6oBYdYvk']);
  await page.evaluate(() => __musicOptions.events.onStateChange({data:0}));
  assert.deepEqual(await page.evaluate(() => __musicCalls.slice(-2)), ['seek:0', 'play']);
  await page.locator('#music-toggle').click();
  assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'), 'false');
  const count = await page.evaluate(() => __musicCalls.length);
  await page.locator('#lock-input').dispatchEvent('pointerdown');
  assert.equal(await page.evaluate(() => __musicCalls.length), count);
  await page.locator('#music-toggle').click();
  await page.evaluate(() => __musicOptions.events.onAutoplayBlocked());
  assert.match(await page.locator('#music-status').textContent(), /แตะหน้าเว็บ/);
  await page.locator('#lock-input').dispatchEvent('pointerdown');
  assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'), 'true');
  await page.evaluate(() => __musicOptions.events.onError({data:150}));
  assert.match(await page.locator('#music-status').textContent(), /เล่นเพลงไม่ได้/);
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
