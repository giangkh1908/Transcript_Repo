#!/usr/bin/node
/** Probe bố cục modal Cài đặt: phát hiện tràn ngang, chụp light mode. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attach, sleep } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = 9342;
const BASE = 'http://127.0.0.1:5199';

async function main() {
  // Chrome + transport CDP dùng chung với tools/uitest.mjs.
  const { send, evalJS, sessionId, close } = await attach({ port: PORT, tag: 'probe2' });

  await send('Page.navigate', { url: `${BASE}/?theme=light` }, sessionId);
  await sleep(1200);

  const overflowCheck = `(() => {
    const modal = [...document.querySelectorAll('.fixed.inset-0 > div, .z-50 > div')].pop();
    if (!modal) return { modal: false, bodyHas: document.body.innerText.slice(0, 120) };
    const bad = [];
    const mw = modal.getBoundingClientRect();
    for (const el of modal.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > mw.right + 1 || r.left < mw.left - 1)) bad.push(el.outerHTML.slice(0, 80));
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'auto' && getComputedStyle(el).overflowX !== 'scroll' && !el.className.toString().includes('overflow')) bad.push('scroll: ' + el.outerHTML.slice(0, 80));
      if (bad.length > 5) break;
    }
    return { modal: true, overflows: bad };
  })()`;

  // Mở settings từ thanh trên cùng
  const clicked = await evalJS(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Cài đặt'); if (b) b.click(); return !!b; })()`);
  console.log('clicked settings btn:', clicked);
  await sleep(600);
  console.log('modal light:', JSON.stringify(await evalJS(overflowCheck)));
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  mkdirSync(join(HERE, 'screens'), { recursive: true });
  writeFileSync(join(HERE, 'screens', 'settings-light.png'), Buffer.from(shot.result.data, 'base64'));

  // Mở thẻ thêm provider
  await evalJS(`(() => { const el = [...document.querySelectorAll('button')].find(e => (e.textContent || '').includes('Thêm nhà cung cấp')); if (el) el.click(); return !!el; })()`);
  await sleep(500);
  console.log('add-card light:', JSON.stringify(await evalJS(overflowCheck)));
  const shot2 = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(HERE, 'screens', 'settings-add-light.png'), Buffer.from(shot2.result.data, 'base64'));

  /* ---- Flow chức năng: thêm provider tuỳ chỉnh + fetch models + persist ---- */
  const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
  // Chọn radio "tuỳ chỉnh"
  await evalJS(`(() => { const r = [...document.querySelectorAll('input[type=radio]')][1]; if (r) r.click(); return !!r; })()`);
  await sleep(300);
  // Điền ID + Base URL
  await evalJS(`(() => { const f = ${setVal}; const inputs = [...document.querySelectorAll('.z-50 input')]; const id = inputs.find(i => i.placeholder.includes('vi-du')); const url = inputs.find(i => i.placeholder.includes('https://')); if (id) f(id, 'internal-gw'); if (url) f(url, 'https://api.internal-gw.ai/v1'); return !!(id && url); })()`);
  await sleep(300);
  // Bấm fetch models
  await evalJS(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.textContent || '').includes('Lấy danh sách mô hình')); if (b) b.click(); return !!b; })()`);
  await sleep(1600);
  const picker = await evalJS(`(() => ({ boxes: document.querySelectorAll('.z-50 input[type=checkbox]').length, note: (document.body.innerText.match(/Tìm thấy \\d+ mô hình/) || [''])[0] }))()`);
  console.log('picker:', JSON.stringify(picker));
  // Thêm provider
  await evalJS(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.textContent || '').trim() === 'Thêm provider'); if (b) b.click(); return !!b; })()`);
  await sleep(400);
  const rowAdded = await evalJS(`document.body.innerText.includes('internal-gw')`);
  console.log('row added:', rowAdded);
  // Kiểm persist sau reload
  await send('Page.navigate', { url: `${BASE}/?theme=light` }, sessionId);
  await sleep(1800);
  const persisted = await evalJS(`(() => { try { return (JSON.parse(localStorage.getItem('repo-agent.config.v1') || 'null')?.['agent.providers'] || []).some(p => p.id === 'internal-gw'); } catch { return false; } })()`);
  console.log('persisted after reload:', persisted);
  // Mở lại settings sau reload
  const opened2 = await evalJS(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Cài đặt'); if (b) b.click(); return !!b; })()`);
  console.log('settings reopened after reload:', opened2);
  await sleep(500);
  const rowOpened = await evalJS(`(() => { const el = [...document.querySelectorAll('button')].find(e => (e.textContent || '').includes('DeepSeek')); if (el) { el.click(); return el.outerHTML.slice(0, 100); } return null; })()`);
  console.log('deepseek row:', rowOpened);
  await sleep(400);
  const keyStep = await evalJS(`(() => { const f = ${setVal}; const k = document.querySelector('.z-50 input[type=password]'); if (k) f(k, 'DEEPSEEK_API_KEY=sk-123'); return k ? 'input-ok' : 'pw-inputs=' + document.querySelectorAll('.z-50 input').length + ' body=' + document.body.innerText.slice(0, 80); })()`);
  console.log('deepseek card open + key input:', keyStep);
  await evalJS(`(() => { const b = [...document.querySelectorAll('button')].find(e => (e.textContent || '').includes('Áp dụng')); if (b) b.click(); return !!b; })()`);
  await sleep(300);
  const envErr = await evalJS(`document.body.innerText.includes('biến môi trường')`);
  console.log('api-key env-line rejected:', envErr);
  close();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
