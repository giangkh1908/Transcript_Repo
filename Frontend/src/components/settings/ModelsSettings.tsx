import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Cpu, Plus } from 'lucide-react';
import {
  PROTOCOL_LABELS,
  loadDefaultModel,
  loadProviders,
  saveDefaultModel,
  saveProviders,
} from '../../config/providers';
import type { ProviderConfig } from '../../config/providers';
import { deriveApiKeyEnv, setCredential, unsetCredential } from '../../config/credentials';
import { StatusDot, inputCls, providerKeyState } from './bits';
import { AddProviderCard } from './AddProviderCard';
import { ProviderCard } from './ProviderCard';

/**
 * Chỉ ghi khi giá trị THẬT SỰ khác store — StrictMode chạy effect 2 lần ở
 * dev, và mount không được vật hoá mặc định vào config (giữ tính sparse).
 */
function sync<T>(load: () => T, save: (value: T) => void, value: T) {
  if (JSON.stringify(load()) !== JSON.stringify(value)) save(value);
}

/** Section "Mô hình & Nhà cung cấp" trong modal Cài đặt. */
export const ModelsSettings: React.FC = () => {
  const [providers, setProviders] = useState<ProviderConfig[]>(() => loadProviders());
  const [defaultModel, setDefaultModel] = useState<string>(() => loadDefaultModel());
  const [openCard, setOpenCard] = useState<string | null>(null); // id | 'add'

  useEffect(() => sync(loadProviders, saveProviders, providers), [providers]);
  useEffect(() => sync(loadDefaultModel, saveDefaultModel, defaultModel), [defaultModel]);

  const modelOptions = useMemo(
    () =>
      providers.flatMap((p) =>
        p.models.map((m) => ({
          value: `${p.id}/${m.id}`,
          label: `${m.name || m.id} — ${p.displayName || p.id}`,
        })),
      ),
    [providers],
  );

  return (
    <div className="space-y-3">
      <label className="flex items-center space-x-2 font-semibold text-ink text-xs">
        <Cpu className="w-4 h-4 text-brand-ink" />
        <span>Mô hình & Nhà cung cấp (Models)</span>
      </label>

      {/* Mô hình mặc định */}
      <div className="flex items-center space-x-2">
        <span className="text-[11px] text-ink3 whitespace-nowrap">Mô hình mặc định:</span>
        <select
          className={`${inputCls} flex-1`}
          value={defaultModel}
          onChange={(e) => setDefaultModel(e.target.value)}
        >
          <option value="">— chưa chọn —</option>
          {modelOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <p className="-mt-2 font-mono text-[9.5px] text-ink4">agent.model.default</p>

      {/* Hàng provider */}
      <div className="border border-[var(--c-line)] rounded-lg overflow-hidden">
        {providers.map((p) => {
          const open = openCard === p.id;
          return (
            <div key={p.id} className="border-b border-[var(--c-line)] last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenCard(open ? null : p.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                  open ? 'bg-[var(--c-hover)]' : 'hover:bg-[var(--c-hover)]'
                }`}
              >
                <span className="flex items-center space-x-2 min-w-0">
                  {open ? <ChevronDown className="w-3.5 h-3.5 text-ink3 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-ink3 shrink-0" />}
                  <StatusDot state={providerKeyState(p)} />
                  <span className="text-xs font-medium text-ink truncate">{p.displayName || p.id}</span>
                  <span className="font-mono text-[10px] text-ink4 truncate hidden sm:inline">{p.id}</span>
                </span>
                <span className="flex items-center space-x-2 shrink-0 ml-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-soft text-brand-ink border border-brand-line">
                    {PROTOCOL_LABELS[p.protocol]}
                  </span>
                  <span className="text-[10px] text-ink4">{p.models.length} mô hình</span>
                </span>
              </button>
              {open && (
                <div className="px-3 pb-3">
                  <ProviderCard
                    provider={p}
                    onApply={(np, keyValue) => {
                      // Thứ tự của DSH: commit config trước, credential sau —
                      // lỗi credential thì retry đúng bước đó thôi.
                      const next: ProviderConfig = keyValue
                        ? { ...np, apiKeyEnv: np.apiKeyEnv ?? deriveApiKeyEnv(np.id) }
                        : np; // key trống = giữ nguyên tham chiếu hiện có (hoặc không có)
                      setProviders((list) =>
                        list.map((x) => (x.id === p.id ? { ...next, builtin: x.builtin } : x)),
                      );
                      if (keyValue && next.apiKeyEnv) setCredential(next.apiKeyEnv, keyValue);
                      setOpenCard(null);
                    }}
                    onDelete={(id) => {
                      const target = providers.find((x) => x.id === id);
                      // DSH: chỉ xoá credential khi profile đúng tên derivation này.
                      if (target?.apiKeyEnv && target.apiKeyEnv === deriveApiKeyEnv(id)) {
                        unsetCredential(target.apiKeyEnv);
                      }
                      setProviders((list) => list.filter((x) => x.id !== id));
                      if (defaultModel.startsWith(`${id}/`)) setDefaultModel('');
                      setOpenCard(null);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Hàng thêm provider */}
        <div className="border-t border-[var(--c-line)]">
          <button
            type="button"
            onClick={() => setOpenCard(openCard === 'add' ? null : 'add')}
            className="w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-[var(--c-hover)] transition-colors"
          >
            {openCard === 'add' ? (
              <ChevronDown className="w-3.5 h-3.5 text-ink3" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-ink3" />
            )}
            <span className="w-4 h-4 rounded border border-dashed border-[var(--c-line-strong)] flex items-center justify-center text-ink3">
              <Plus className="w-3 h-3" />
            </span>
            <span className="text-xs text-ink2 font-medium">Thêm nhà cung cấp…</span>
          </button>
          {openCard === 'add' && (
            <div className="px-3 pb-3">
              <AddProviderCard
                existingIds={providers.map((p) => p.id)}
                onClose={() => setOpenCard(null)}
                onAdd={(np) => {
                  setProviders((list) => [...list, np]);
                  setOpenCard(null);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-ink4 leading-relaxed">
        Mọi tuỳ chọn đều có config key cố định (đăng ký một lần trong <code className="font-mono">config/schema.ts</code>).
        Khi nối backend, chỉ cần đổi nơi lưu (bảng DB hoặc file cấu hình) theo đúng key đó — giao diện giữ nguyên.
      </p>
    </div>
  );
};
