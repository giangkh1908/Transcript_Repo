#!/usr/bin/env node
/**
 * Transport Chrome DevTools Protocol dùng chung cho các script kiểm thử UI
 * trong tools/ (uitest.mjs, probe-settings.mjs).
 *
 * Vì sao không dùng Playwright: máy chưa có browser của Playwright, và MCP
 * Playwright cần cài plugin + khởi động lại session mới nạp. Cách này chạy
 * ngay, không thêm phụ thuộc nào (Node >= 21 có WebSocket built-in).
 */

import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

/** Đường dẫn Chrome/Edge sẵn có trên máy. */
export function findBrowser() {
  for (const p of CHROME_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  throw new Error('Không tìm thấy Chrome/Edge');
}

/** Chờ cổng debug của Chrome mở rồi trả /json/version. */
export async function waitForEndpoint(port) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return r.json();
    } catch {
      /* chưa lên */
    }
    await sleep(250);
  }
  throw new Error('Chrome không mở cổng debug');
}

/**
 * Mở Chrome headless, attach một target và trả về transport:
 *   send(method, params, sessionId) → message CDP NGUYÊN BẢN (kết quả ở .result)
 *   evalJS(expression)              → giá trị trả về từ trong trang
 *   sessionId, consoleErrors, pageErrors, close()
 */
export async function attach({ port, tag = 'cdp' }) {
  const userDataDir = join(tmpdir(), `${tag}-${Date.now()}`);
  const browser = spawn(
    findBrowser(),
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1440,900',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  const version = await waitForEndpoint(port);
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });

  let msgId = 0;
  let sessionId;
  const pending = new Map();
  const consoleErrors = [];
  const pageErrors = [];

  const send = (method, params = {}, sid) =>
    new Promise((resolve) => {
      const id = ++msgId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) }));
    });

  ws.onmessage = (event) => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
      return;
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    }
    if (m.method === 'Runtime.exceptionThrown') {
      pageErrors.push(m.params.exceptionDetails?.exception?.description ?? 'exception');
    }
  };

  const target = await send('Target.createTarget', { url: 'about:blank' });
  const attached = await send('Target.attachToTarget', {
    targetId: target.result.targetId,
    flatten: true,
  });
  sessionId = attached.result.sessionId;

  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Log.enable', {}, sessionId);
  await send(
    'Emulation.setDeviceMetricsOverride',
    { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false },
    sessionId,
  );

  const evalJS = async (expression) => {
    const r = await send(
      'Runtime.evaluate',
      { expression, returnByValue: true, awaitPromise: true },
      sessionId,
    );
    if (r.result?.exceptionDetails) {
      throw new Error(r.result.exceptionDetails.exception?.description ?? 'lỗi evaluate');
    }
    return r.result?.result?.value;
  };

  /** Đóng Chrome và dọn thư mục profile tạm. */
  const close = () => {
    try {
      browser.kill();
    } catch {
      /* ignore */
    }
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  };

  return { send, evalJS, sessionId, consoleErrors, pageErrors, close };
}
