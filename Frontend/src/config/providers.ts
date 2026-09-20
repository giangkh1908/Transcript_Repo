/**
 * Nhà cung cấp & mô hình: validate + khám phá mô hình (mô phỏng demo).
 *
 * Types và dữ liệu mặc định nằm ở config/schema.ts; nơi lưu trữ là
 * config/store.ts (key "agent.providers" / "agent.model.default").
 * File này chỉ còn logic nghiệp vụ — không tự chạm localStorage.
 */

import { getConfig, setConfig } from './store';
import { DEFAULT_PROVIDERS, type ProviderConfig, type ProviderModel, type ProviderProtocol } from './schema';
import { deriveApiKeyEnv } from './credentials';

export type { ProviderConfig, ProviderModel, ProviderProtocol };

export const PROTOCOL_LABELS: Record<ProviderProtocol, string> = {
  openai: 'OpenAI-compatible',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
  ollama: 'Ollama (local)',
};

export const PROTOCOL_PLACEHOLDERS: Record<ProviderProtocol, string> = {
  openai: 'https://api.example.com/v1',
  anthropic: 'https://api.anthropic.com',
  google: 'https://generativelanguage.googleapis.com',
  ollama: 'http://localhost:11434',
};

/** Thư mục provider "ngủ" — chưa cấu hình, có thể bật thêm từ thẻ thêm provider. */
export const DORMANT_DIRECTORY: Array<{ id: string; displayName: string; protocol: ProviderProtocol; baseURL: string }> = [
  { id: 'ollama', displayName: 'Ollama (máy cục bộ)', protocol: 'ollama', baseURL: 'http://localhost:11434' },
];

/* ---------------- đọc/ghi qua config store ---------------- */

export function loadProviders(): ProviderConfig[] {
  const stored = getConfig('agent.providers');
  // Hàng builtin luôn tồn tại; bản lưu chỉ ghi đè từng cái theo id.
  const merged = DEFAULT_PROVIDERS.map((base) => {
    const s = stored.find((x) => x.id === base.id);
    if (!s) return { ...base, models: base.models.map((m) => ({ ...m })) };
    const row = { ...base, ...s, id: base.id, builtin: true };
    // Migration cờ cũ: apiKeySet (demo thời chưa có credential store) → apiKeyEnv.
    // Giá trị không tồn tại nên chấm trạng thái sẽ là "đã tham chiếu, chưa có giá trị".
    if (row.apiKeyEnv === undefined) {
      const legacy = s as ProviderConfig & { apiKeySet?: boolean };
      if (legacy.apiKeySet) row.apiKeyEnv = deriveApiKeyEnv(base.id);
    }
    return row;
  });
  const customs = stored.filter((x) => !DEFAULT_PROVIDERS.some((b) => b.id === x.id));
  return [...merged, ...customs];
}

export function saveProviders(list: ProviderConfig[]): void {
  setConfig('agent.providers', list);
}

export function loadDefaultModel(): string {
  return getConfig('agent.model.default');
}

export function saveDefaultModel(value: string): void {
  setConfig('agent.model.default', value);
}

/* ---------------- validate ---------------- */

const PRINTABLE_ASCII = /^[\x21-\x7E]+$/;
const ENV_LINE = /^[A-Za-z_][A-Za-z0-9_]*\s*=\s*\S+$/;
const QUOTED = /^(['"]).*\1$/;
const PROVIDER_ID = /^[a-z0-9][a-z0-9._-]*$/;

/** Chuẩn DSH: key rỗng/không in được/kiểu NAME=value/bọc ngoặc đều bị từ chối. */
export function validateApiKey(value: string): string | null {
  const t = value.trim();
  if (!t) return 'API key không được để trống.';
  if (!PRINTABLE_ASCII.test(t)) return 'API key chỉ được gồm ký tự ASCII in được, không có dấu cách hay ký tự đặc biệt.';
  if (ENV_LINE.test(t)) return 'Giá trị trông như một dòng biến môi trường (NAME=value). Hãy dán đúng giá trị của key.';
  if (QUOTED.test(t)) return 'Không bọc key trong dấu ngoặc kép.';
  return null;
}

export function validateProviderId(id: string, existing: string[]): string | null {
  const t = id.trim();
  if (!t) return 'Provider ID không được để trống.';
  if (!PROVIDER_ID.test(t)) return 'Provider ID chỉ gồm chữ thường, số, dấu chấm, gạch ngang/gạch dưới; bắt đầu bằng chữ hoặc số.';
  if (existing.includes(t)) return `Provider ID "${t}" đã tồn tại.`;
  return null;
}

export function validateModelRow(m: ProviderModel, otherIds: Iterable<string>): string | null {
  const t = m.id.trim();
  if (!t) return 'Model ID không được để trống.';
  if ([...otherIds].includes(t)) return `Model ID "${t}" bị trùng trong cùng provider.`;
  for (const [key, label] of [
    ['contextWindow', 'Context window'],
    ['maxTokens', 'Max tokens'],
  ] as const) {
    const v = m[key];
    if (v !== undefined && v !== null && (!Number.isInteger(v) || v <= 0)) {
      return `${label} phải là số nguyên dương.`;
    }
  }
  return null;
}

export function validateBaseURL(url: string): string | null {
  const t = url.trim();
  if (!t) return 'Base URL không được để trống.';
  try {
    const u = new URL(t);
    if (!['http:', 'https:'].includes(u.protocol)) return 'Base URL phải bắt đầu bằng http:// hoặc https://';
    return null;
  } catch {
    return 'Base URL không đúng định dạng URL.';
  }
}

/* ---------------- khám phá mô hình (mô phỏng) ---------------- */

/** Catalog mặc định: dùng lại nguyên danh sách model của provider builtin. */
const modelsOf = (providerId: string): ProviderModel[] =>
  DEFAULT_PROVIDERS.find((p) => p.id === providerId)?.models.map((m) => ({ ...m })) ?? [];

const DISCOVER_CATALOGS: Array<{ match: RegExp; models: ProviderModel[] }> = [
  { match: /deepseek/, models: modelsOf('deepseek') },
  { match: /openai/, models: [...modelsOf('openai'), { id: 'o3-mini', name: 'o3-mini', contextWindow: 200000, maxTokens: 100000 }] },
  { match: /anthropic/, models: modelsOf('anthropic') },
  {
    match: /goat|commandcode|muse|meta/,
    models: [
      { id: 'meta/muse-spark-1.3-contributor', name: 'Muse Spark 1.3 Contributor', contextWindow: 131072, maxTokens: 16384 },
      { id: 'meta/muse-sparse-1.3-contribute', name: 'Muse Sparse 1.3 Contribute' },
      { id: 'deepseek/deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash' },
    ],
  },
  {
    match: /localhost|127\.0\.0\.1|11434/,
    models: [
      { id: 'qwen2.5-coder:14b', name: 'Qwen2.5 Coder 14B', contextWindow: 32768 },
      { id: 'llama3.1:8b', name: 'Llama 3.1 8B', contextWindow: 131072 },
    ],
  },
  { match: /generativelanguage|gemini/, models: modelsOf('google') },
];

/**
 * "Lấy danh sách mô hình" — bản demo mô phỏng lời gọi /v1/models của
 * endpoint đang nhập, trả về một catalog hợp lý theo baseURL/protocol.
 */
export async function simulateDiscoverModels(baseURL: string, protocol: ProviderProtocol): Promise<ProviderModel[]> {
  await new Promise((r) => setTimeout(r, 900));
  const u = baseURL.toLowerCase();
  const hit = DISCOVER_CATALOGS.find((c) => c.match.test(u));
  if (hit) return hit.models.map((m) => ({ ...m }));
  // Không nhận diện được endpoint — trả catalog theo protocol đang chọn.
  const byProtocol: Record<ProviderProtocol, ProviderModel[]> = {
    openai: [
      { id: 'model-a', name: 'Model A (OpenAI-compatible)', contextWindow: 32768, maxTokens: 8192 },
      { id: 'model-a-mini', name: 'Model A Mini' },
    ],
    anthropic: [{ id: 'claude-custom', name: 'Claude (custom gateway)', contextWindow: 200000, maxTokens: 64000 }],
    google: [{ id: 'gemini-custom', name: 'Gemini (custom endpoint)', contextWindow: 1000000 }],
    ollama: [
      { id: 'qwen2.5-coder:7b', name: 'Qwen2.5 Coder 7B', contextWindow: 32768 },
      { id: 'llama3.2:3b', name: 'Llama 3.2 3B' },
    ],
  };
  return byProtocol[protocol].map((m) => ({ ...m }));
}
