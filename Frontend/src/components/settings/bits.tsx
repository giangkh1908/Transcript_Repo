/**
 * Mảnh dùng chung của phần Cài đặt → Mô hình: ô nhập, dòng lỗi, chấm trạng thái
 * key. Không chứa trạng thái riêng — chỉ là hình thức.
 */
import { AlertCircle } from 'lucide-react';
import { describeCredential } from '../../config/credentials';
import type { ProviderConfig } from '../../config/providers';

export const inputCls =
  'w-full bg-[var(--c-canvas)] border border-[var(--c-line)] rounded-md px-2.5 py-1.5 text-xs text-ink placeholder:text-ink4 focus:outline-none focus:border-brand-line transition-colors';

/**
 * Chấm trạng thái key theo đúng luật của trang Models trong DSH:
 * xanh = credential tham chiếu được xác nhận CÓ giá trị;
 * đỏ  = profile đang NÊM TÊN tham chiếu nhưng credential thiếu;
 * xám = profile chưa tham chiếu key nào (giữ auth gốc của provider).
 */
export function StatusDot({ state }: { state: 'ok' | 'missing' | 'none' }) {
  const title =
    state === 'ok'
      ? 'API key đã cấu hình trong credential store'
      : state === 'missing'
        ? 'Profile có tham chiếu key nhưng credential store thiếu giá trị'
        : 'Chưa có API key (dùng auth gốc của provider)';
  const color = state === 'ok' ? 'bg-ok' : state === 'missing' ? 'bg-danger-solid' : 'bg-[var(--c-line-strong)]';
  return <span title={title} className={`inline-block w-2 h-2 rounded-full shrink-0 ${color}`} />;
}

export function providerKeyState(p: ProviderConfig): 'ok' | 'missing' | 'none' {
  if (!p.apiKeyEnv) return 'none';
  return describeCredential(p.apiKeyEnv).configured ? 'ok' : 'missing';
}

export function FieldError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="flex items-center space-x-1 text-[11px] text-danger mt-1">
      <AlertCircle className="w-3 h-3 shrink-0" />
      <span>{msg}</span>
    </div>
  );
}
