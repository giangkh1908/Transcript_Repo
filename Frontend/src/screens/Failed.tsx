import { ChevronDown, Lightbulb } from 'lucide-react';
import { Btn, Note } from '../components/ui';
import { S } from '../copy';

/** Trạng thái lỗi: không stack trace, có ba đường thoát, chi tiết kỹ thuật thu gọn. */
export function Failed({
  onRetry,
  onPickFolder,
  onPasteOther,
}: {
  onRetry: () => void;
  onPickFolder: () => void;
  onPasteOther: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-[760px]">
        <div className="rounded-[14px] border border-danger-line bg-danger-bg px-6 py-5">
          <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-ink">
            <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-danger-solid text-[15px] font-bold text-white">
              !
            </span>
            {S.failed.title}
          </div>
          <div className="mt-2.5 ml-[37px] text-[13px] leading-relaxed text-ink2">
            {S.failed.sub.before}
            <b className="font-semibold text-ink">{S.failed.sub.bold}</b>
            {S.failed.sub.after}
          </div>
          <div className="mt-1.5 ml-[37px] text-[12.5px] leading-relaxed text-ink3">
            {S.failed.sub2}
          </div>
          <div className="mt-4 ml-[37px] flex flex-wrap items-center gap-2.5">
            <Btn onClick={onRetry}>{S.failed.retry}</Btn>
            <Btn variant="secondary" onClick={onPickFolder}>
              {S.failed.pickFolder}
            </Btn>
            <Btn variant="secondary" onClick={onPasteOther}>
              {S.failed.other}
            </Btn>
          </div>
        </div>

        <div className="mt-5 flex gap-3 rounded-xl border border-line bg-surface px-4.5 py-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-soft">
            <Lightbulb className="h-3.5 w-3.5 text-warn" aria-hidden="true" />
          </span>
          <div>
            <div className="text-[13px] font-semibold text-ink">{S.failed.helpTitle}</div>
            <div className="mt-1.5 text-xs leading-relaxed text-ink3">
              {S.failed.helpBody}
              <code className="rounded-[5px] border border-line bg-soft px-1.5 py-px text-[11.5px] text-ink2">
                {S.failed.helpCode}
              </code>
            </div>
          </div>
        </div>

        <details className="mt-3.5 rounded-[10px] border border-line-soft bg-canvas px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-ink3">
            {S.failed.techTitle}
            <ChevronDown className="ml-auto h-3 w-3 text-ink4" aria-hidden="true" />
          </summary>
          <div className="mt-2 font-mono text-[11.5px] leading-relaxed text-ink4">
            {S.failed.techBody}
          </div>
        </details>

        <Note>
          {S.failed.note.before}
          <b className="font-semibold text-ink3">{S.failed.note.bold}</b>
          {S.failed.note.after}
        </Note>
      </div>
    </div>
  );
}
