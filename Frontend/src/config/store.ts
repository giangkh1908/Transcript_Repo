/**
 * Config store — nơi DUY NHẤT được phép chạm vào bộ nhớ cấu hình.
 *
 * Giao diện component dùng: getConfig(key) / setConfig(key, value) theo
 * các key đã đăng ký trong config/schema.ts. Ở dưới là một ConfigBackend:
 *
 *   - hôm nay: LocalBackend (localStorage) — bản demo chạy không cần server;
 *   - sau này: cắm ServerBackend (POST /config) hoặc FileBackend (đọc/ghi
 *     settings.yaml) bằng setConfigBackend() — không phải sửa một dòng UI nào.
 *
 * Kéo dữ liệu cũ từ các khoá localStorage rải rác trước đây về đúng key
 * chuẩn một lần duy nhất (migrateLegacy).
 */

import {
  CONFIG_DEFAULTS,
  type ConfigDocument,
} from './schema';

const CONFIG_STORAGE_KEY = 'repo-agent.config.v1';

export interface ConfigBackend {
  /** null = chưa có dữ liệu nào được lưu. */
  readDoc(): Partial<ConfigDocument> | null;
  /** Ghi SPARSE: chỉ chứa các key đã được người dùng đặt — như path-ops của DSH. */
  writeDoc(doc: Partial<ConfigDocument>): void;
}

const localBackend: ConfigBackend = {
  readDoc() {
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Partial<ConfigDocument>) : null;
    } catch {
      return null;
    }
  },
  writeDoc(doc) {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(doc));
    } catch {
      /* demo: bỏ qua lỗi hạn chế bộ nhớ */
    }
  },
};

let backend: ConfigBackend = localBackend;

/** Nối backend thật khi có server/file — UI không đổi. */
export function setConfigBackend(next: ConfigBackend): void {
  backend = next;
  legacyMigrated = false; // backend mới có thể vẫn đang giữ dữ liệu legacy
}

/** Chỉ nhận các key đã đăng ký — dữ liệu lạ bị bỏ, tránh rác theo năm tháng. */
function sanitize(stored: Partial<ConfigDocument> | null): Partial<ConfigDocument> {
  if (!stored) return {};
  const out: Partial<ConfigDocument> = {};
  for (const key of Object.keys(CONFIG_DEFAULTS) as Array<keyof ConfigDocument>) {
    if (key in stored) {
      (out as Record<string, unknown>)[key] = stored[key];
    }
  }
  return out;
}

/** Ghép giá trị mặc định; clone phần mảng/phân tầng để component không mutate vào defaults. */
function mergeDefaults(stored: Partial<ConfigDocument> | null): ConfigDocument {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(CONFIG_DEFAULTS) as Array<keyof ConfigDocument>) {
    out[key] =
      key === 'agent.providers'
        ? CONFIG_DEFAULTS['agent.providers'].map((p) => ({ ...p, models: p.models.map((m) => ({ ...m })) }))
        : CONFIG_DEFAULTS[key];
  }
  Object.assign(out, sanitize(stored));
  return out as unknown as ConfigDocument;
}

/* ---------- kéo dữ liệu từ các khoá localStorage cũ (1 lần) ---------- */

let legacyMigrated = false;

function ensureMigrated(): void {
  if (legacyMigrated) return;
  legacyMigrated = true;
  try {
    const stored = sanitize(backend.readDoc());
    let changed = false;
    const take = <K extends keyof ConfigDocument>(key: K, legacyRaw: string | null, parse: (raw: string) => ConfigDocument[K] | null) => {
      if (key in stored || legacyRaw === null) return;
      const value = parse(legacyRaw);
      if (value === null) return;
      (stored as Record<string, unknown>)[key] = value;
      changed = true;
    };

    take('docs.language', localStorage.getItem('repo-agent.prefs.v1'), (raw) => {
      const p = JSON.parse(raw);
      return p && typeof p === 'object' && typeof p.docLanguage === 'string' ? (p.docLanguage as ConfigDocument['docs.language']) : null;
    });
    take('infra.lockExternalConfig', localStorage.getItem('repo-agent.prefs.v1'), (raw) => {
      const p = JSON.parse(raw);
      return p && typeof p === 'object' && typeof p.preserveConfig === 'boolean' ? p.preserveConfig : null;
    });
    take('naming.strictNormalization', localStorage.getItem('repo-agent.prefs.v1'), (raw) => {
      const p = JSON.parse(raw);
      return p && typeof p === 'object' && typeof p.strictPEP8 === 'boolean' ? p.strictPEP8 : null;
    });
    take('agent.providers', localStorage.getItem('repo-agent.models.providers.v1'), (raw) => {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length > 0 ? (arr as ConfigDocument['agent.providers']) : null;
    });
    take('agent.model.default', localStorage.getItem('repo-agent.models.default.v1'), (raw) =>
      typeof raw === 'string' ? raw : null,
    );

    if (changed) {
      backend.writeDoc(stored); // ghi sparse — chỉ các key vừa migrate
    }
    // Dọn khoá cũ sau khi đã kéo xong — kể cả khi không còn gì để kéo.
    localStorage.removeItem('repo-agent.prefs.v1');
    localStorage.removeItem('repo-agent.models.providers.v1');
    localStorage.removeItem('repo-agent.models.default.v1');
  } catch {
    /* dữ liệu legacy hỏng thì bỏ, dùng mặc định */
  }
}

/* ---------- API cho component ---------- */

export function getConfig<K extends keyof ConfigDocument>(key: K): ConfigDocument[K] {
  ensureMigrated();
  return mergeDefaults(backend.readDoc())[key];
}

export function setConfig<K extends keyof ConfigDocument>(key: K, value: ConfigDocument[K]): void {
  ensureMigrated();
  const stored = sanitize(backend.readDoc());
  stored[key] = value;
  backend.writeDoc(stored);
}
