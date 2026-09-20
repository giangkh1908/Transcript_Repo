#!/usr/bin/env node
/**
 * Bộ test giao diện thật, chạy trên Chrome sẵn có qua Chrome DevTools Protocol.
 *
 * Vì sao không dùng Playwright: máy chưa có browser của Playwright, và MCP
 * Playwright cần cài plugin + khởi động lại session mới nạp. Cách này chạy
 * ngay, không thêm phụ thuộc nào (Node >= 21 có WebSocket built-in).
 *
 * Cách dùng:
 *   1) chạy dev server:  npx vite --port 5199 --strictPort
 *   2) chạy test:        node tools/uitest.mjs [--url http://127.0.0.1:5199]
 *
 * Test này bấm chuột thật, đọc DOM thật, chụp ảnh thật và bắt lỗi console.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attach, sleep } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOT_DIR = join(HERE, 'screens');
const PORT = 9333;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const BASE = arg('url', 'http://127.0.0.1:5199').replace(/\/$/, '');

/* ---------- Chrome + CDP: transport dùng chung với tools/probe-settings.mjs ---------- */
let send, evalJS, sessionId, close, consoleErrors, pageErrors;

/* ---------- helpers ---------- */

const theme = () => evalJS('document.documentElement.dataset.theme');
const bodyBg = () => evalJS('getComputedStyle(document.body).backgroundColor');
const has = (text) => evalJS(`document.body.innerText.includes(${JSON.stringify(text)})`);

async function waitForText(text, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await has(text)) return true;
    await sleep(120);
  }
  return false;
}

async function waitForGone(text, timeout = 4000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (!(await has(text))) return true;
    await sleep(120);
  }
  return false;
}

/** Chờ một biểu thức trong trang trả về true (dùng cho iframe, DOM con…). */
async function waitFor(expression, timeout = 6000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evalJS(expression)) return true;
    await sleep(150);
  }
  return false;
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  mkdirSync(SHOT_DIR, { recursive: true });
  writeFileSync(join(SHOT_DIR, `${name}.png`), Buffer.from(r.result.data, 'base64'));
}

async function goto(path) {
  await send('Page.navigate', { url: `${BASE}/${path}` }, sessionId);
  await sleep(500);
  for (let i = 0; i < 60; i++) {
    const ready = await evalJS('document.readyState === "complete" && !!document.body');
    if (ready) break;
    await sleep(150);
  }
  await sleep(500);
}

/* ---------- kết quả ---------- */
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name}${detail ? `  → ${detail}` : ''}`);
};

/** Bấm phần tử bất kỳ chứa text (kể cả div có onClick, không chỉ button). */
const clickAny = (text) =>
  evalJS(`(() => {
    const all = [...document.querySelectorAll('div, button, a, span')];
    const el = all.reverse().find((e) => e.textContent && e.textContent.trim().includes(${JSON.stringify(text)}));
    if (!el) return false;
    el.click();
    return true;
  })()`);

/** Mở modal Cài đặt từ nút trên thanh (nhãn đúng bằng "Cài đặt"). */
const openSettings = () =>
  evalJS(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Cài đặt');
    if (!b) return false;
    b.click();
    return true;
  })()`);

/**
 * Soi tương phản chữ/nền của mọi phần tử đang hiển thị, theo WCAG AA
 * (4.5:1 cho chữ thường, 3:1 cho chữ lớn). Hàm này chạy trong trang.
 */
function contrastAudit() {
  // Chuẩn hoá MỌI màu CSS (oklch, color-mix, color(srgb)…) về rgb qua canvas.
  const _cv = document.createElement('canvas');
  _cv.width = _cv.height = 1;
  const _ctx = _cv.getContext('2d');
  const toRGB = (s) => {
    if (!s) return null;
    _ctx.fillStyle = 'rgba(1,2,3,0)'; // sentinel — nếu parse lỗi thì giữ nguyên
    _ctx.fillStyle = s;
    const v = String(_ctx.fillStyle);
    if (v === 'rgba(1, 2, 3, 0)') return null;
    const m = v.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(',').map((x) => parseFloat(x));
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    const hex = v.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
      const n = parseInt(hex[1], 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
    }
    return null;
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const white = { r: 255, g: 255, b: 255, a: 1 };
  const bodyBG = toRGB(getComputedStyle(document.body).backgroundColor) || white;
  const base = bodyBG.a < 1 ? over(bodyBG, white) : bodyBG;
  const bgOf = (el) => {
    let e = el;
    while (e && e !== document.documentElement) {
      const c = toRGB(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0.01) return c.a < 1 ? over(c, base) : c;
      e = e.parentElement;
    }
    return base;
  };
  const out = [];
  for (const el of document.querySelectorAll(
    'span, div, p, h1, h2, h3, h4, button, a, td, th, li, label, code, summary',
  )) {
    const text = (el.textContent || '').trim();
    if (!text) continue;
    if (el.children.length > 0) continue; // chỉ soi phần tử chứa chữ trực tiếp
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.opacity === '0' || st.display === 'none') continue;
    const fg = toRGB(st.color);
    if (!fg) continue;
    const bg = bgOf(el);
    const f = fg.a < 1 ? over(fg, bg) : fg;
    const l1 = lum(f);
    const l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(st.fontSize);
    const bold = parseInt(st.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const min = large ? 3 : 4.5;
    if (ratio < min) {
      out.push({
        text: text.slice(0, 45),
        ratio: Math.round(ratio * 100) / 100,
        color: st.color,
        bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
        html: el.outerHTML.slice(0, 130),
      });
    }
    if (out.length > 15) break;
  }
  return out;
}

const auditContrast = () => evalJS(`(${contrastAudit.toString()})()`);
const formatBad = (bad) => bad.slice(0, 3).map((b) => `"${b.text}" ${b.ratio}:1`).join(' | ');

/* ---------- kịch bản ---------- */
async function run() {
  ({ send, evalJS, sessionId, close, consoleErrors, pageErrors } = await attach({ port: PORT, tag: 'uitest' }));

  console.log(`\n=== 1. Mặc định phải là SÁNG, nền trắng ===`);
  await goto('');
  check('vào app là màn hình đầu', await has('Bạn muốn làm gì với dự án này?'));
  check('theme mặc định là light', (await theme()) === 'light', `theme=${await theme()}`);
  check('nền trang là trắng', (await bodyBg()) === 'rgb(255, 255, 255)', await bodyBg());
  check('không còn lối vào chế độ Chuyên gia', !(await has('Chuyên gia')));
  await shot('01-simple-light');

  console.log(`\n=== 2. Đổi theme ===`);
  // Lưu ý: click() trả undefined, đừng dùng ?? nối fallback — sẽ bấm 2 lần.
  await evalJS(
    `(() => { const b = document.querySelector('button[aria-label*="giao diện"]'); if (b) b.click(); return !!b; })()`,
  );
  await sleep(600);
  check('bấm nút đổi theme thì theme thành dark', (await theme()) === 'dark', `theme=${await theme()}`);
  check('nền trang thành tối', (await bodyBg()) === 'rgb(13, 17, 23)', await bodyBg());
  await shot('02-simple-dark');

  console.log(`\n=== 3. Theme phải nhớ sau khi tải lại ===`);
  await goto('');
  check('tải lại vẫn giữ dark', (await theme()) === 'dark', `theme=${await theme()}`);

  console.log(`\n=== 4. Luồng Đơn giản chạy hết ===`);
  await goto('?theme=light');
  check('bấm thẻ "Làm tất cả"', await clickAny('Làm tất cả những việc trên'));
  check('màn Đang đọc hiện ra', await waitForText('Đang đọc dự án của bạn', 4000));
  await shot('04-reading');
  check('tự chuyển sang màn kết quả phân tích', await waitForText('Mình đã hiểu dự án của bạn', 8000));
  await shot('05-result');
  check('bấm "Bắt đầu xử lý"', await clickAny('Bắt đầu xử lý'));
  check('màn Đang xử lý hiện ra', await waitForText('Đang xử lý', 4000));
  check('tự chuyển sang màn Xong', await waitForText('Xong rồi!', 8000));
  await shot('06-done');
  check('màn Xong có danh sách chỗ rủi ro', await has('DATABASE_URL'));
  check('bấm mở rộng danh sách rủi ro', await clickAny('Xem 9 chỗ còn lại'));
  await sleep(400);
  const itemCount = await evalJS(
    `document.body.innerText.split('Giữ nguyên (khuyên dùng)').length - 1`,
  );
  check('mở rộng ra đủ 12 chỗ', itemCount === 12, `đếm được ${itemCount}`);

  console.log(`\n=== 4b. Chạy thử dự án ===`);
  await goto('?theme=light&stage=run');
  check(
    'màn Chạy thử hiện cách cài đặt và hai lệnh',
    (await has('Cách cài đặt và khởi động')) &&
      (await has('pip install -r requirements.txt')) &&
      (await has('python manage.py runserver')),
  );
  check('hiện địa chỉ mở dự án', await has('http://127.0.0.1:8000'));
  await shot('11-run-ready');
  check('kết quả quét nói rõ dự án viết bằng gì và cần gì', (await has('Python · Django')) && (await has('Python 3.11 trở lên')));
  check('bấm "Chạy dự án"', await clickAny('Chạy dự án'));
  check('màn Đang chạy dự án hiện ra', await waitForText('Đang chạy dự án của bạn', 4000));
  check('tự chuyển sang giao diện đang chạy', await waitForText('Dự án đang chạy', 8000));
  check(
    'khung xem trước tải được giao diện dự án',
    await waitFor(`(() => {
      const f = document.querySelector('iframe');
      try { return !!f && f.contentDocument.body.innerText.includes('Sản phẩm đang bán'); } catch { return false; }
    })()`),
  );
  check('màn đang chạy có phần Cách sử dụng', await has('Cách sử dụng') && await has('Thanh toán'));
  const runBad = await auditContrast();
  check('màn đang chạy (sáng): không chữ nào dưới ngưỡng WCAG AA', runBad.length === 0, formatBad(runBad));
  await shot('12-run-live');

  console.log(`\n=== 5. Lỗi console ===`);
  check('không có lỗi console', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  check('không có exception', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  console.log(`\n=== 6. Tương phản chữ ở giao diện SÁNG ===`);
  await goto('?theme=light&stage=done');
  let bad = await auditContrast();
  check('màn Xong: không chữ nào dưới ngưỡng WCAG AA', bad.length === 0, formatBad(bad));
  await goto('?theme=light');
  bad = await auditContrast();
  check('màn hình đầu: không chữ nào dưới ngưỡng', bad.length === 0, formatBad(bad));
  await goto('?theme=light&stage=clean');
  bad = await auditContrast();
  check('màn Đã sạch: không chữ nào dưới ngưỡng', bad.length === 0, formatBad(bad));
  await goto('?theme=light&stage=failed');
  bad = await auditContrast();
  check('màn Không mở được: không chữ nào dưới ngưỡng', bad.length === 0, formatBad(bad));
  await goto('?theme=light&stage=run');
  bad = await auditContrast();
  check('màn Chạy thử: không chữ nào dưới ngưỡng', bad.length === 0, formatBad(bad));

  console.log(`\n=== 7. Tương phản chữ ở giao diện TỐI ===`);
  for (const s of ['', '&stage=done', '&stage=clean', '&stage=failed', '&stage=run']) {
    await goto(`?theme=dark${s}`);
    const b = await auditContrast();
    check(`theme tối ${s || 'màn hình đầu'}: không chữ nào dưới ngưỡng`, b.length === 0, formatBad(b));
  }

  console.log(`\n=== 8. Cài đặt Mô hình & Nhà cung cấp ===`);
  await goto('?theme=dark');
  await sleep(600);
  check('mở được modal cài đặt từ thanh trên', await openSettings());
  await sleep(600);
  check('đủ 4 provider mặc định', await has('Nhà cung cấp') && await has('DeepSeek') && await has('OpenAI (GPT-5.x)') && await has('Anthropic (Claude)') && await has('Google (Gemini)'));
  await shot('07-settings-dark');
  check('mở được thẻ sửa provider DeepSeek', await clickAny('DeepSeek') && await waitForText('Khóa API', 3000));
  check('mở được fold tuỳ chỉnh nâng cao', await clickAny('Tuỳ chỉnh nâng cao') && await waitForText('Danh sách mô hình', 3000));
  check('hiện config key trên trường cấu hình', await has('agent.providers.deepseek.baseURL') && await has('docs.language'));
  // Lưu key: giá trị phải vào credential store RIÊNG, config chỉ mang apiKeyEnv
  const keySaved = await (async () => {
    const fill = await evalJS(`(() => { const f = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }; const k = [...document.querySelectorAll('.z-50 input[type=password]')].pop(); if (k) f(k, 'sk-demo-1234567890'); return !!k; })()`);
    if (!fill) return false;
    if (!await clickAny('Áp dụng')) return false;
    await sleep(500);
    return await evalJS(`(() => { try { const cfg = JSON.parse(localStorage.getItem('repo-agent.config.v1') || '{}'); const cred = JSON.parse(localStorage.getItem('repo-agent.credentials.v1') || '{}'); const p = (cfg['agent.providers'] || []).find(x => x.id === 'deepseek'); return cred.refs && cred.refs.DEEPSEEK_API_KEY === 'sk-demo-1234567890' && p && p.apiKeyEnv === 'DEEPSEEK_API_KEY' && !JSON.stringify(cfg).includes('sk-demo'); } catch { return false; } })()`);
  })();
  check('lưu key: giá trị vào credential store, config chỉ mang apiKeyEnv', keySaved);
  check('chấm trạng thái key chuyển xanh sau khi lưu', await evalJS(`!!document.querySelector('span[title="API key đã cấu hình trong credential store"]')`));
  check('mở được thẻ thêm nhà cung cấp', await clickAny('Thêm nhà cung cấp') && await waitForText('Thêm nhà cung cấp tuỳ chỉnh', 3000));
  await shot('08-settings-add-dark');
  await evalJS(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '' && x.querySelector('svg.lucide-x')); if (b) b.click(); return true; })()`);
  await sleep(400);

  console.log(`\n=== 9. Dữ liệu cũ được migrate + lưu cấu hình ===`);
  await goto('?theme=dark');
  await sleep(700);
  // Gieo dữ liệu legacy để kiểm tra migration về config doc chuẩn
  await evalJS(`localStorage.setItem('repo-agent.models.default.v1', 'deepseek/deepseek-chat')`);
  check('thấy nút Cài đặt trên thanh', await openSettings());
  await sleep(600);
  check('mở đúng modal Mô hình & Nhà cung cấp', await has('Mô hình & Nhà cung cấp') && await has('Nhà cung cấp'));
  check('đủ 4 provider mặc định: DeepSeek, GPT-5.x, Claude, Gemini', await has('DeepSeek') && await has('OpenAI (GPT-5.x)') && await has('Anthropic (Claude)') && await has('Google (Gemini)'));
  check('khoá DeepSeek nhận trạng thái từ credential store', await clickAny('DeepSeek') && await waitForText('Khóa API', 3000) && await has('đã lưu (write-only)'));
  check('GPT-5.x: cả 3 model đều flag không có temperature', await clickAny('OpenAI (GPT-5.x)') && await waitForText('Khóa API', 3000) && await clickAny('Tuỳ chỉnh nâng cao') && await waitForText('Danh sách mô hình', 3000) && await evalJS(`document.querySelectorAll('.z-50 input[type=checkbox][title*="temperature"]').length >= 3`));
  check('fetch models có ngay trong thẻ sửa provider: picker hiện ra', await clickAny('Lấy danh sách mô hình') && await waitForText('Chọn tất cả (đang hiện)', 3000) && await has('Thêm vào danh sách'));
  check('bổ sung từ fetch: thêm đúng model mới (o3-mini), bỏ trùng 2 model cũ', await clickAny('Thêm vào danh sách') && await waitForText('Đã thêm 1 mô hình vào danh sách', 3000) && await has('Danh sách mô hình (4)'));
  const migrated = await evalJS(`(() => { try { const doc = JSON.parse(localStorage.getItem('repo-agent.config.v1') || '{}'); const sel = document.querySelector('.z-50 select'); return doc['agent.model.default'] === 'deepseek/deepseek-chat' && sel && sel.value === 'deepseek/deepseek-chat' && localStorage.getItem('repo-agent.models.default.v1') === null; } catch { return false; } })()`);
  check('dữ liệu legacy được migrate về config key chuẩn và xoá khoá cũ', migrated);
  await shot('09-settings-light-data-dark');
  check('lưu cài đặt xong modal tự đóng', await clickAny('Lưu cấu hình') && (await waitForGone('Mô hình & Nhà cung cấp')));
  const prefsSaved = await evalJS(`(() => { try { const doc = JSON.parse(localStorage.getItem('repo-agent.config.v1') || 'null'); return !!doc && typeof doc['infra.lockExternalConfig'] === 'boolean' && 'docs.language' in doc; } catch { return false; } })()`);
  check('cấu hình lưu thành document repo-agent.config.v1 theo config key chuẩn', prefsSaved);
  await shot('10-simple-after-save-dark');
}

/* ---------- main ---------- */
let failed = 0;
try {
  await run();
} catch (err) {
  console.error(`\nLỖI KHI CHẠY TEST: ${err.message}`);
  failed = 1;
}

const total = results.length;
const passed = results.filter((r) => r.pass).length;
console.log(`\n${'─'.repeat(60)}`);
console.log(`KẾT QUẢ: ${passed}/${total} đạt${failed ? ' (suite lỗi)' : ''}`);
const bad = results.filter((r) => !r.pass);
if (bad.length) {
  console.log('\nChưa đạt:');
  for (const b of bad) console.log(`  ✗ ${b.name}${b.detail ? `  → ${b.detail}` : ''}`);
}
console.log(`Ảnh chụp: ${SHOT_DIR}`);

close?.();

process.exit(bad.length || failed ? 1 : 0);
