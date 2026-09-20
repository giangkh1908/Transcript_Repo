import { Trash2 } from 'lucide-react';
import { validateModelRow } from '../../config/providers';
import type { ProviderModel } from '../../config/providers';
import { FieldError, inputCls } from './bits';

/** Một dòng model trong danh sách của provider: id, tên, ngữ cảnh, temp. */
export function ModelRowEditor({
  model,
  ids,
  onChange,
  onRemove,
}: {
  model: ProviderModel;
  ids: string[];
  onChange: (m: ProviderModel) => void;
  onRemove: () => void;
}) {
  const others = ids.filter((x) => x !== model.id);
  const tempTitle =
    model.supportsTemperature === false
      ? 'Không hỗ trợ temperature — GPT-5 trở lên chỉ dùng giá trị mặc định'
      : 'Model nhận tham số temperature';
  return (
    <div className="border border-[var(--c-line)] rounded-md p-2 space-y-1.5 bg-[var(--c-canvas)]">
      <div className="grid grid-cols-[1fr_1fr_72px_72px_52px_28px] gap-1.5 items-center">
        <input
          className={inputCls}
          placeholder="model-id *"
          value={model.id}
          onChange={(e) => {
            onChange({ ...model, id: e.target.value });
          }}
        />
        <input
          className={inputCls}
          placeholder="Tên hiển thị"
          value={model.name ?? ''}
          onChange={(e) => onChange({ ...model, name: e.target.value || undefined })}
        />
        <input
          className={inputCls}
          type="number"
          min={1}
          placeholder="Ctx"
          title="Context window (số token)"
          value={model.contextWindow ?? ''}
          onChange={(e) => onChange({ ...model, contextWindow: e.target.value ? Number(e.target.value) : undefined })}
        />
        <input
          className={inputCls}
          type="number"
          min={1}
          placeholder="MaxT"
          title="Max output tokens"
          value={model.maxTokens ?? ''}
          onChange={(e) => onChange({ ...model, maxTokens: e.target.value ? Number(e.target.value) : undefined })}
        />
        <label
          className="flex cursor-pointer items-center justify-center gap-1 text-[10px] text-ink3"
          title={tempTitle}
        >
          <input
            type="checkbox"
            className="accent-brand"
            title={tempTitle}
            checked={model.supportsTemperature !== false}
            onChange={(e) => onChange({ ...model, supportsTemperature: e.target.checked ? undefined : false })}
          />
          Temp
        </label>
        <button
          type="button"
          onClick={onRemove}
          title="Xoá mô hình này"
          className="p-1.5 rounded-md text-ink3 hover:text-danger hover:bg-[var(--c-hover)] transition-colors flex justify-center"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <FieldError msg={validateModelRow(model, others)} />
    </div>
  );
}
