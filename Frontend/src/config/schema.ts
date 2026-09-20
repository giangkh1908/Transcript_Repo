/**
 * Đăng ký CONFIG KEY — NGUỒN DUY NHẤT của toàn bộ tuỳ chọn ứng dụng.
 *
 * Mọi tuỳ chọn đều có một key cố định theo dạng path (dấu chấm), mô tả ở
 * đây cùng kiểu dữ liệu, giá trị mặc định và nơi hiển thị. Giao diện KHÔNG
 * tự chế khoá lưu trữ — chỉ đọc/ghi qua config/store.ts theo các key này.
 *
 * ==== Đích đến khi nối backend (không đổi giao diện) ====
 *
 * - DB:        bảng `config(key TEXT PRIMARY KEY, value JSONB, updated_at)`
 *              — mỗi key là một dòng, value là JSON.
 * - File:      `settings.yaml` — tách key theo dấu chấm thành cây lồng nhau:
 *              agent.model.default  →  agent:
 *                                        model:
 *                                          default: ...
 * - Credential: key API KHÔNG bao giờ nằm trong document này (write-only,
 *              như DSH) — chỉ có cờ `apiKeySet` trên từng provider.
 */

export type DocLanguage = 'vi-VN' | 'vi-bilingual';

export type ProviderProtocol = 'openai' | 'anthropic' | 'google' | 'ollama';

export interface ProviderModel {
  id: string;
  name?: string;
  contextWindow?: number;
  maxTokens?: number;
  /**
   * Capability per-model: false = model KHÔNG nhận tham số temperature
   * (GPT-5 trở lên của OpenAI chỉ dùng giá trị mặc định).
   * Bỏ qua/undefined = hỗ trợ chỉnh temperature bình thường.
   */
  supportsTemperature?: boolean;
}

export interface ProviderConfig {
  /** Provider ID — khoá cứng sau khi tạo, là định danh mọi nơi tham chiếu. */
  id: string;
  displayName?: string;
  protocol: ProviderProtocol;
  baseURL?: string;
  /**
   * Tên tham chiếu credential (kiểu biến môi trường, vd. DEEPSEEK_API_KEY) —
   * KHÔNG BAO GIỜ chứa giá trị key. Chỉ được ghi vào profile khi một key
   * thật sự được lưu (bỏ trống = profile không tham chiếu, giữ auth gốc).
   */
  apiKeyEnv?: string;
  models: ProviderModel[];
  /** Hàng từ thư mục gốc — không xoá được, chỉ sửa. */
  builtin?: boolean;
}

/**
 * 4 nhà cung cấp mặc định (như trang Models của DSH): mỗi hàng là một
 * profile hoàn chỉnh — người dùng điền API key (credential store) và chỉnh
 * baseURL/model theo nhu cầu. Key API KHÔNG nằm ở đây.
 */
export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'deepseek',
    displayName: 'DeepSeek',
    protocol: 'openai',
    baseURL: 'https://api.deepseek.com',
    builtin: true,
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', contextWindow: 65536, maxTokens: 8192 },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', contextWindow: 65536, maxTokens: 8192 },
    ],
  },
  {
    id: 'openai',
    displayName: 'OpenAI (GPT-5.x)',
    protocol: 'openai',
    baseURL: 'https://api.openai.com/v1',
    builtin: true,
    models: [
      { id: 'gpt-5.1', name: 'GPT-5.1', contextWindow: 400000, maxTokens: 128000, supportsTemperature: false },
      { id: 'gpt-5.1-mini', name: 'GPT-5.1 mini', contextWindow: 400000, maxTokens: 128000, supportsTemperature: false },
      { id: 'gpt-5-nano', name: 'GPT-5 nano', contextWindow: 400000, maxTokens: 128000, supportsTemperature: false },
    ],
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic (Claude)',
    protocol: 'anthropic',
    baseURL: 'https://api.anthropic.com',
    builtin: true,
    models: [
      { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', contextWindow: 200000, maxTokens: 64000 },
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', contextWindow: 200000, maxTokens: 64000 },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', contextWindow: 200000, maxTokens: 64000 },
    ],
  },
  {
    id: 'google',
    displayName: 'Google (Gemini)',
    protocol: 'google',
    baseURL: 'https://generativelanguage.googleapis.com',
    builtin: true,
    models: [
      { id: 'gemini-3-pro', name: 'Gemini 3 Pro', contextWindow: 1048576, maxTokens: 65536 },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1048576, maxTokens: 65536 },
    ],
  },
];

/** Bề mặt nào hiện tuỳ chọn này: 'simple' (câu chữ đời thường) / 'expert'. */
export type Surface = 'simple' | 'expert';

export interface ConfigKeyInfo {
  key: string;
  type: 'string' | 'boolean' | `enum:${string}` | 'ProviderConfig[]';
  surfaces: Surface[];
  /** Mô tả ngắn — dùng cho tooltip/chú thích trong modal Cài đặt. */
  desc: string;
}

/**
 * Toàn bộ key của ứng dụng. Thêm tuỳ chọn mới = thêm một dòng ở đây +
 * một trường trong ConfigDocument, rồi hai UI cùng thấy.
 */
export const CONFIG_KEYS: readonly ConfigKeyInfo[] = [
  {
    key: 'agent.model.default',
    type: 'string',
    surfaces: ['simple', 'expert'],
    desc: 'Mô hình AI mặc định, dạng "provider/model-id". Rỗng = hệ thống tự chọn.',
  },
  {
    key: 'agent.providers',
    type: 'ProviderConfig[]',
    surfaces: ['expert'],
    desc: 'Danh sách nhà cung cấp: baseURL, protocol, danh sách model. Chỉ mang TÊN tham chiếu key (apiKeyEnv); giá trị key nằm trong credential store, tách biệt với config.',
  },
  {
    key: 'docs.language',
    type: 'enum:vi-VN|vi-bilingual',
    surfaces: ['simple', 'expert'],
    desc: 'Ngôn ngữ cho tài liệu và chú thích do hệ thống sinh ra.',
  },
  {
    key: 'infra.lockExternalConfig',
    type: 'boolean',
    surfaces: ['simple', 'expert'],
    desc: 'Khoá biến cấu hình hạ tầng (DATABASE_URL, REDIS_URL…) tham chiếu bởi docker-compose/CI để không bị sửa.',
  },
  {
    key: 'naming.strictNormalization',
    type: 'boolean',
    surfaces: ['expert'],
    desc: 'Chuẩn hoá định danh theo snake_case / PascalCase quốc tế.',
  },
] as const;

/** Document cấu hình phẳng — key chính là khoá trong store/DB. */
export interface ConfigDocument {
  'agent.model.default': string;
  'agent.providers': ProviderConfig[];
  'docs.language': DocLanguage;
  'infra.lockExternalConfig': boolean;
  'naming.strictNormalization': boolean;
}

export const CONFIG_DEFAULTS: ConfigDocument = {
  'agent.model.default': '',
  'agent.providers': DEFAULT_PROVIDERS,
  'docs.language': 'vi-VN',
  'infra.lockExternalConfig': true,
  'naming.strictNormalization': true,
};
