import { useState } from 'react';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import {
  DORMANT_DIRECTORY,
  PROTOCOL_LABELS,
  PROTOCOL_PLACEHOLDERS,
  simulateDiscoverModels,
  validateBaseURL,
  validateModelRow,
  validateProviderId,
} from '../../config/providers';
import type { ProviderConfig, ProviderModel, ProviderProtocol } from '../../config/providers';
import { FieldError, inputCls } from './bits';
import { ModelPickerPanel } from './ModelPickerPanel';

type AddKind = 'directory' | 'custom';

/** Thẻ thêm provider mới: từ thư mục sẵn có, hoặc khai báo endpoint tuỳ chỉnh. */
export function AddProviderCard({
  existingIds,
  onAdd,
  onClose,
}: {
  existingIds: string[];
  onAdd: (p: ProviderConfig) => void;
  onClose: () => void;
}) {
  const dormant = DORMANT_DIRECTORY.filter((d) => !existingIds.includes(d.id));
  const [kind, setKind] = useState<AddKind>('directory');
  const [dirId, setDirId] = useState<string>(dormant[0]?.id ?? 'custom');
  const [draft, setDraft] = useState<ProviderConfig>({
    id: '',
    displayName: '',
    protocol: 'openai',
    baseURL: '',
    models: [],
  });
  const [idErr, setIdErr] = useState<string | null>(null);
  const [urlErr, setUrlErr] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState<string | null>(null);
  const [found, setFound] = useState<ProviderModel[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const sel = dormant.find((d) => d.id === dirId);
  const source = kind === 'directory' && sel ? sel : null;

  const doFetch = async () => {
    const url = draft.baseURL ?? '';
    const e = validateBaseURL(url);
    setUrlErr(e);
    if (e) return;
    setFetching(true);
    setFetchNote(null);
    try {
      const list = await simulateDiscoverModels(url, draft.protocol);
      setFound(list);
      setPicked(new Set(list.map((m) => m.id)));
      setFetchNote(`Tìm thấy ${list.length} mô hình — chọn rồi bấm "Thêm các mục đã chọn". (Bản demo mô phỏng.)`);
    } finally {
      setFetching(false);
    }
  };

  const commit = () => {
    const id = kind === 'directory' && source ? source.id : draft.id.trim();
    const eId = validateProviderId(id, existingIds);
    setIdErr(eId);
    if (eId) return;
    const models = found ? found.filter((m) => picked.has(m.id)) : draft.models;
    if (models.length === 0) {
      setFetchNote('Cần ít nhất một mô hình — bấm "Lấy danh sách mô hình" hoặc thêm thủ công.');
      return;
    }
    for (const m of models) {
      const e = validateModelRow(m, []);
      if (e) {
        setFetchNote(`Mô hình "${m.id || '(trống)'}": ${e}`);
        return;
      }
    }
    onAdd({
      id,
      displayName: (kind === 'directory' && source ? source.displayName : draft.displayName) || undefined,
      protocol: draft.protocol,
      baseURL: draft.baseURL?.trim(),
      // Chưa tham chiếu key nào — khi người dùng lưu key thì mới derive apiKeyEnv.
      models: models.map((m) => ({ ...m })),
    });
  };

  return (
    <div className="border border-brand-line rounded-lg p-3.5 space-y-3 bg-[var(--c-canvas)]">
      <div className="flex items-center space-x-3 text-[11px]">
        <label className="flex items-center space-x-1.5 cursor-pointer">
          <input type="radio" checked={kind === 'directory'} onChange={() => setKind('directory')} />
          <span className="text-ink">Từ thư mục sẵn có</span>
        </label>
        <label className="flex items-center space-x-1.5 cursor-pointer">
          <input type="radio" checked={kind === 'custom'} onChange={() => setKind('custom')} />
          <span className="text-ink font-medium text-brand-ink">Thêm nhà cung cấp tuỳ chỉnh</span>
        </label>
      </div>

      {kind === 'directory' && (
        <div>
          <label className="text-[11px] font-semibold text-ink block mb-1">Nhà cung cấp</label>
          <select
            className={inputCls}
            value={dirId}
            onChange={(e) => {
              setDirId(e.target.value);
              const d = dormant.find((x) => x.id === e.target.value);
              if (d) setDraft({ ...draft, id: d.id, displayName: d.displayName, protocol: d.protocol, baseURL: d.baseURL });
            }}
          >
            {dormant.map((d) => (
              <option key={d.id} value={d.id}>
                {d.displayName} ({d.id})
              </option>
            ))}
          </select>
          {dormant.length === 0 && (
            <p className="text-[11px] text-ink4 italic mt-1">Mọi provider trong thư mục đều đã được cấu hình.</p>
          )}
        </div>
      )}

      {kind === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold text-ink block mb-1">Provider ID (duy nhất) *</label>
            <input
              className={inputCls}
              placeholder="vi-du: noi-bo-gateway"
              value={draft.id}
              onChange={(e) => {
                setDraft({ ...draft, id: e.target.value });
                setIdErr(null);
              }}
            />
            <FieldError msg={idErr} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-ink block mb-1">Tên hiển thị</label>
            <input
              className={inputCls}
              placeholder="Gateway nội bộ"
              value={draft.displayName ?? ''}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-[160px_1fr_auto] gap-2 items-start">
        <div>
          <label className="text-[11px] font-semibold text-ink block mb-1">API protocol</label>
          <select
            className={inputCls}
            value={draft.protocol}
            onChange={(e) => setDraft({ ...draft, protocol: e.target.value as ProviderProtocol })}
          >
            {(Object.keys(PROTOCOL_LABELS) as ProviderProtocol[]).map((p) => (
              <option key={p} value={p}>
                {PROTOCOL_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-ink block mb-1">Base URL *</label>
          <input
            className={inputCls}
            placeholder={PROTOCOL_PLACEHOLDERS[draft.protocol]}
            value={draft.baseURL ?? ''}
            onChange={(e) => {
              setDraft({ ...draft, baseURL: e.target.value });
              setUrlErr(null);
            }}
          />
          <FieldError msg={urlErr} />
        </div>
        <div className="pt-[22px]">
          <button
            type="button"
            onClick={doFetch}
            disabled={fetching}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium border border-brand-line text-brand-ink hover:bg-brand-soft transition-colors disabled:opacity-50"
            title="Hỏi endpoint về danh sách mô hình đang phục vụ"
          >
            {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>{fetching ? 'Đang hỏi…' : 'Lấy danh sách mô hình'}</span>
          </button>
        </div>
      </div>

      {fetchNote && <p className="text-[11px] text-ink3">{fetchNote}</p>}

      {/* Picker kết quả khám phá */}
      {found && found.length > 0 && (
        <ModelPickerPanel
          found={found}
          picked={picked}
          onPickedChange={setPicked}
          footerNote={`Đã chọn ${picked.size}/${found.length} — mọi thứ chỉ được ghi khi bấm "Thêm provider".`}
        />
      )}

      <div className="flex items-center justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1.5 rounded-md text-[11px] text-ink2 hover:text-ink hover:bg-[var(--c-hover)] border border-[var(--c-line)] transition-colors"
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={commit}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-[11px] font-medium bg-brand hover:bg-brand-hi text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm provider</span>
        </button>
      </div>
    </div>
  );
}
