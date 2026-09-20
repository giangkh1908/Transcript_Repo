/**
 * Credential store — mô phỏng đúng seam `credentials` của DeepSeek Harness
 * (dsh-credentials + dsh-credentials-local), rút gọn cho bản demo web.
 *
 * Nguyên tắc sao chép từ DSH:
 *  1. Configuration carries references, never secrets — document cấu hình
 *     (repo-agent.config.v1) KHÔNG BAO GIỜ chứa giá trị key; profile provider
 *     chỉ mang tên tham chiếu `apiKeyEnv` (vd. DEEPSEEK_API_KEY).
 *  2. Giá trị key nằm ở store riêng (DSH: ~/.dsh/.credentials.yaml, section
 *     `refs`). Demo: localStorage "repo-agent.credentials.v1" — tách biệt
 *     hoàn toàn với config, không bao giờ đi qua bất kỳ UI hiển thị nào.
 *  3. describe() trả { configured, source, writable } — KHÔNG BAO GIỜ trả
 *     giá trị. UI chỉ dùng describe để vẽ chấm trạng thái.
 *  4. Giá trị rỗng bị từ chối khi set — "a blank can never masquerade as a
 *     configured secret"; muốn bỏ key thì unset (xoá), không phải ghi rỗng.
 *  5. Rotation có tác dụng ngay request kế tiếp — đọc resolve() từng lần
 *     dùng, không cache.
 *  6. References không có enumeration (DSH): không cung cấp hàm liệt kê
 *     refs — chỉ set / unset / describe / resolve theo tên.
 *
 * Sau này nối backend: thay LocalBackend bằng lời gọi RPC credentials
 * (set/unset/describe/resolve) — UI không đổi.
 */

const CREDENTIALS_STORAGE_KEY = 'repo-agent.credentials.v1';

/** Thông tin trạng thái an toàn để hiển thị — không bao giờ chứa giá trị. */
export interface CredentialInfo {
  configured: boolean;
  /** DSH: nguồn của giá trị (store / .env / ambient). Demo chỉ có 'store'. */
  source?: 'store';
  /** false khi một tầng read-only (ambient/env) che phủ ref — demo luôn true. */
  writable: boolean;
}

interface CredentialsDoc {
  version: 1;
  refs: Record<string, string>;
}

function emptyDoc(): CredentialsDoc {
  return { version: 1, refs: {} };
}

function readDoc(): CredentialsDoc {
  try {
    const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
    if (!raw) return emptyDoc();
    const parsed = JSON.parse(raw) as CredentialsDoc;
    if (!parsed || parsed.version !== 1 || typeof parsed.refs !== 'object' || parsed.refs === null) {
      return emptyDoc();
    }
    return parsed;
  } catch {
    return emptyDoc();
  }
}

function writeDoc(doc: CredentialsDoc): void {
  try {
    localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(doc));
  } catch {
    /* demo: bỏ qua */
  }
}

/** Reference là một định danh kiểu biến môi trường (POSIX shell identifier). */
export function isValidCredentialRef(ref: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(ref);
}

/**
 * Derivation của trang Models trong DSH: khi profile chưa có tham chiếu,
 * sinh `<ROUTE>_API_KEY` từ Provider ID (ký tự không hợp lệ → gạch dưới).
 *   deepseek → DEEPSEEK_API_KEY · internal-gw → INTERNAL_GW_API_KEY
 */
export function deriveApiKeyEnv(providerId: string): string {
  const route = providerId.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();
  return `${route}_API_KEY`;
}

/** Lưu giá trị. Từ chối rỗng/trắng-blank và ref sai định danh. */
export function setCredential(ref: string, value: string): void {
  if (!isValidCredentialRef(ref)) throw new Error(`Credential ref không hợp lệ: ${ref}`);
  if (value.trim() === '') throw new Error('Không được lưu giá trị rỗng — hãy unset nếu muốn bỏ key.');
  const doc = readDoc();
  doc.refs[ref] = value;
  writeDoc(doc);
}

/** Xoá tham chiếu. No-op khi vắng mặt (idempotent, như DSH). */
export function unsetCredential(ref: string): void {
  const doc = readDoc();
  if (ref in doc.refs) {
    delete doc.refs[ref];
    writeDoc(doc);
  }
}

/**
 * Trạng thái cho UI — KHÔNG bao giờ trả giá trị.
 * Demo không có tầng ambient read-only, nên writable luôn true.
 */
export function describeCredential(ref: string): CredentialInfo {
  if (!isValidCredentialRef(ref)) return { configured: false, writable: false };
  const doc = readDoc();
  const value = doc.refs[ref];
  if (typeof value === 'string' && value !== '') {
    return { configured: true, source: 'store', writable: true };
  }
  return { configured: false, writable: true };
}

/**
 * Đọc giá trị khi một request thật cần dùng key — KHÔNG cho UI gọi.
 * Resolve từng lần dùng, không cache (rotation có hiệu lực ngay).
 */
export function resolveCredential(ref: string): { value: string; source: 'store' } | undefined {
  const doc = readDoc();
  const value = doc.refs[ref];
  if (typeof value === 'string' && value !== '') return { value, source: 'store' };
  return undefined;
}
