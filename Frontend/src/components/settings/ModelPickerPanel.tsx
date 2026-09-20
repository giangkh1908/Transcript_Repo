import { useState } from 'react';
import { Search } from 'lucide-react';
import type { ProviderModel } from '../../config/providers';

/**
 * Picker có tìm kiếm cho kết quả "Lấy danh sách mô hình" — dùng chung bởi
 * thẻ thêm provider VÀ thẻ sửa provider. Tự quản ô tìm kiếm; dữ liệu chọn
 * (picked) do thẻ cha giữ, chỉ ghi khi bấm nút ở thẻ cha.
 */
export function ModelPickerPanel({
  found,
  picked,
  onPickedChange,
  footerNote,
}: {
  found: ProviderModel[];
  picked: Set<string>;
  onPickedChange: (next: Set<string>) => void;
  footerNote: string;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = q ? found.filter((m) => `${m.id} ${m.name ?? ''}`.toLowerCase().includes(q)) : found;
  return (
    <div className="border border-[var(--c-line)] rounded-md overflow-hidden">
      <div className="flex items-center space-x-2 px-2.5 py-1.5 border-b border-[var(--c-line)] bg-[var(--c-soft)]">
        <Search className="w-3.5 h-3.5 text-ink3" />
        <input
          className="flex-1 bg-transparent text-[11px] text-ink placeholder:text-ink4 focus:outline-none"
          placeholder="Tìm theo model-id hoặc tên hiển thị…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className="text-[11px] text-brand-ink hover:text-ink font-medium whitespace-nowrap"
          onClick={() => {
            const next = new Set(picked);
            for (const m of visible) next.add(m.id);
            onPickedChange(next);
          }}
        >
          Chọn tất cả (đang hiện)
        </button>
        <button
          type="button"
          className="text-[11px] text-ink3 hover:text-ink font-medium whitespace-nowrap"
          onClick={() => {
            const next = new Set(picked);
            for (const m of visible) next.delete(m.id);
            onPickedChange(next);
          }}
        >
          Bỏ chọn (đang hiện)
        </button>
      </div>
      <div className="max-h-36 overflow-y-auto">
        {visible.map((m) => (
          <label
            key={m.id}
            className="flex items-center space-x-2 px-2.5 py-1.5 text-[11px] hover:bg-[var(--c-hover)] cursor-pointer"
          >
            <input
              type="checkbox"
              checked={picked.has(m.id)}
              onChange={() => {
                const next = new Set(picked);
                if (next.has(m.id)) next.delete(m.id);
                else next.add(m.id);
                onPickedChange(next);
              }}
            />
            <span className="font-mono text-ink">{m.id}</span>
            {m.name && <span className="text-ink4 truncate">{m.name}</span>}
          </label>
        ))}
        {visible.length === 0 && (
          <div className="px-2.5 py-2 text-[11px] text-ink4 italic">Không kết quả nào khớp "{query}".</div>
        )}
      </div>
      <div className="px-2.5 py-1.5 border-t border-[var(--c-line)] text-[10px] text-ink4">{footerNote}</div>
    </div>
  );
}
