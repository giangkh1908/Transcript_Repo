import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  PROTOCOL_LABELS,
  PROTOCOL_PLACEHOLDERS,
  simulateDiscoverModels,
  validateApiKey,
  validateBaseURL,
  validateModelRow,
} from '../../config/providers';
import type { ProviderConfig, ProviderModel, ProviderProtocol } from '../../config/providers';
import { deriveApiKeyEnv, describeCredential } from '../../config/credentials';
import { FieldError, inputCls } from './bits';
import { ModelPickerPanel } from './ModelPickerPanel';
import { ModelRowEditor } from './ModelRowEditor';

/** Thẻ sửa một provider: key, baseURL, protocol và danh sách mô hình. */
export function ProviderCard({
  provider,
  onApply,
  onDelete,
}: {
  provider: ProviderConfig;
  onApply: (p: ProviderConfig, keyValue?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<ProviderConfig>({ ...provider, models: provider.models.map((m) => ({ ...m })) });
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyErr, setKeyErr] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [idErr, setIdErr] = useState<string | null>(null);
  const [urlErr, setUrlErr] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState<string | null>(null);
  const [fetched, setFetched] = useState<ProviderModel[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const dirty =
    JSON.stringify(draft.models) !== JSON.stringify(provider.models) ||
    (draft.displayName ?? '') !== (provider.displayName ?? '') ||
    (draft.baseURL ?? '') !== (provider.baseURL ?? '') ||
    draft.protocol !== provider.protocol;

  const apply = () => {
    let bad = false;
    if (apiKey.trim()) {
      const e = validateApiKey(apiKey);
      setKeyErr(e);
      if (e) bad = true;
    }
    const eUrl = validateBaseURL(draft.baseURL ?? '');
    setUrlErr(eUrl);
    if (eUrl) bad = true;
    const ids = new Set<string>();
    for (const m of draft.models) {
      const e = validateModelRow(m, ids);
      if (e) {
        bad = true;
        break;
      }
      ids.add(m.id.trim());
    }
    if (bad) return;
    // DSH: ghi cấu hình trước, credential sau — key trống = profile không
    // tham chiếu (giữ auth gốc); key có giá trị = parent sẽ derive apiKeyEnv
    // và set vào credential store.
    onApply(
      { ...draft, displayName: draft.displayName?.trim() || undefined },
      apiKey.trim() ? apiKey.trim() : undefined,
    );
  };

  /** "Lấy danh sách mô hình" ngay trong thẻ sửa — hỏi endpoint đang nhập. */
  const doFetch = async () => {
    const e = validateBaseURL(draft.baseURL ?? '');
    setUrlErr(e);
    if (e) return;
    setFetching(true);
    setFetchNote(null);
    try {
      const list = await simulateDiscoverModels(draft.baseURL ?? '', draft.protocol);
      setFetched(list);
      setPicked(new Set(list.map((m) => m.id)));
      setFetchNote(`Tìm thấy ${list.length} mô hình — chọn rồi bấm "Thêm vào danh sách". (Bản demo mô phỏng.)`);
    } finally {
      setFetching(false);
    }
  };

  /** Bổ sung các model đã chọn vào danh sách nháp, tự bỏ trùng model-id. */
  const appendPicked = () => {
    if (!fetched) return;
    const existing = new Set(draft.models.map((m) => m.id));
    const additions = fetched.filter((m) => picked.has(m.id) && !existing.has(m.id));
    setDraft({ ...draft, models: [...draft.models, ...additions.map((m) => ({ ...m }))] });
    setFetched(null);
    setPicked(new Set());
    setFetchNote(`Đã thêm ${additions.length} mô hình vào danh sách (bỏ qua trùng).`);
  };

  return (
    <div className="border border-brand-line rounded-lg p-3.5 space-y-3 bg-[var(--c-canvas)]">
      {/* API key */}
      <div>
        <label className="text-[11px] font-semibold text-ink flex items-center space-x-1.5 mb-1">
          <KeyRound className="w-3.5 h-3.5 text-brand-ink" />
          <span>Khóa API</span>
          {describeCredential(provider.apiKeyEnv ?? '').configured && (
            <span className="text-[10px] font-normal text-ok">• đã lưu (write-only)</span>
          )}
          <span className="ml-auto font-mono text-[9.5px] font-normal text-ink4">
            credential: {provider.apiKeyEnv ?? deriveApiKeyEnv(provider.id)}
          </span>
        </label>
        <div className="flex space-x-1.5">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              className={inputCls}
              placeholder={describeCredential(provider.apiKeyEnv ?? '').configured ? '••••••••  (đã cấu hình — nhập khóa mới để thay thế)' : 'Dán khóa API…'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setKeyErr(null);
              }}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink"
              title={showKey ? 'Ẩn key' : 'Hiện key'}
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <FieldError msg={keyErr} />
        <p className="text-[10px] text-ink4 mt-1">
          Giá trị key nằm trong credential store (tách biệt với config, chỉ ghi một chiều, không bao giờ hiển thị lại);
          config chỉ mang tên tham chiếu. Đổi key có hiệu lực ngay — không cần khởi động lại.
        </p>
      </div>

      {/* Fold nâng cao */}
      <div className="border border-[var(--c-line)] rounded-md">
        <button
          type="button"
          onClick={() => setAdvanced((a) => !a)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold text-ink2 hover:text-ink transition-colors"
        >
          <span className="flex items-center space-x-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Tuỳ chỉnh nâng cao {dirty ? '•' : ''}</span>
          </span>
          {advanced ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {advanced && (
          <div className="px-2.5 pb-2.5 space-y-2.5">
            {draft.builtin ? (
              <div className="text-[11px] text-ink3">
                Provider ID <code className="font-mono text-ink2 bg-[var(--c-hover)] px-1 py-0.5 rounded">{draft.id}</code>{' '}
                — cố định, mọi phiên bản ghi nhận qua ID này.
                <span className="ml-1 font-mono text-[9.5px] text-ink4">{`agent.providers.${draft.id}`}</span>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-semibold text-ink block mb-1">Provider ID</label>
                <input
                  className={inputCls}
                  value={draft.id}
                  onChange={(e) => {
                    setDraft({ ...draft, id: e.target.value });
                    setIdErr(null);
                  }}
                />
                <FieldError msg={idErr} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-ink block mb-1">Tên hiển thị</label>
                <input
                  className={inputCls}
                  placeholder={draft.id}
                  value={draft.displayName ?? ''}
                  onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                />
                <p className="mt-1 font-mono text-[9.5px] text-ink4">{`agent.providers.${draft.id}.displayName`}</p>
              </div>
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
                <p className="mt-1 font-mono text-[9.5px] text-ink4">{`agent.providers.${draft.id}.protocol`}</p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-ink block mb-1">Base URL</label>
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
              <p className="mt-1 font-mono text-[9.5px] text-ink4">{`agent.providers.${draft.id}.baseURL`}</p>
            </div>

            {/* Danh sách mô hình */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-semibold text-ink whitespace-nowrap">
                  Danh sách mô hình ({draft.models.length})
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={doFetch}
                    disabled={fetching}
                    className="flex items-center space-x-1 text-[11px] font-medium text-brand-ink hover:text-ink transition-colors disabled:opacity-50"
                    title="Hỏi endpoint về danh sách mô hình đang phục vụ, rồi bổ sung vào danh sách"
                  >
                    {fetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    <span>{fetching ? 'Đang hỏi…' : 'Lấy danh sách mô hình'}</span>
                  </button>
                  <span className="font-mono text-[9.5px] text-ink4">{`agent.providers.${draft.id}.models[]`}</span>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, models: [...draft.models, { id: '' }] })}
                    className="flex items-center space-x-1 text-[11px] text-brand-ink hover:text-ink font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm mô hình</span>
                  </button>
                </div>
              </div>
              {fetchNote && <p className="text-[11px] text-ink3">{fetchNote}</p>}
              {draft.models.length === 0 && (
                <div className="text-[11px] text-ink4 italic px-1">Chưa có mô hình nào — thêm ít nhất một.</div>
              )}
              {draft.models.map((m, i) => (
                <ModelRowEditor
                  key={i}
                  model={m}
                  ids={draft.models.map((x) => x.id)}
                  onChange={(nm) => {
                    const models = [...draft.models];
                    models[i] = nm;
                    setDraft({ ...draft, models });
                  }}
                  onRemove={() => setDraft({ ...draft, models: draft.models.filter((_, j) => j !== i) })}
                />
              ))}
              {fetched && fetched.length > 0 && (
                <>
                  <ModelPickerPanel
                    found={fetched}
                    picked={picked}
                    onPickedChange={setPicked}
                    footerNote={`Đã chọn ${picked.size}/${fetched.length} — trùng model-id sẽ tự bỏ qua.`}
                  />
                  <button
                    type="button"
                    onClick={appendPicked}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-brand hover:bg-brand-hi text-white transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm vào danh sách</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer thẻ */}
      <div className="flex items-center justify-between pt-1">
        <div>
          {!draft.builtin && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Xoá nhà cung cấp "${draft.displayName || draft.id}"? Hành động này không thể hoàn tác.`)) {
                  onDelete(draft.id);
                }
              }}
              className="flex items-center space-x-1 text-[11px] text-danger hover:underline"
            >
              <Trash2 className="w-3 h-3" />
              <span>Xoá provider</span>
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              setDraft({ ...provider, models: provider.models.map((m) => ({ ...m })) });
              setApiKey('');
              setKeyErr(null);
            }}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-[11px] text-ink2 hover:text-ink hover:bg-[var(--c-hover)] border border-[var(--c-line)] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Hoàn tác</span>
          </button>
          <button
            type="button"
            onClick={apply}
            className="px-3.5 py-1.5 rounded-md text-[11px] font-medium bg-brand hover:bg-brand-hi text-white transition-colors"
          >
            Áp dụng (Apply)
          </button>
        </div>
      </div>
    </div>
  );
}
