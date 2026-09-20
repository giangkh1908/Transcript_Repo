import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { Btn } from '../components/ui';
import { S } from '../copy';
import { riskyItems } from '../demo';

type Decision = 'keep' | 'change';

/** Xong: kết quả nhóm an toàn + chỉ hỏi nhóm chạm cấu hình máy chủ. */
export function Done({ onRun }: { onRun: () => void }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [showAll, setShowAll] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const total = riskyItems.length;
  const decided = Object.keys(decisions).length;
  const visible = showAll ? riskyItems : riskyItems.slice(0, 3);
  const hidden = total - visible.length;

  const pick = (key: string, value: Decision) =>
    setDecisions((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6">
      <div className="mx-auto w-full max-w-[760px] pb-8">
        <div className="rounded-[14px] border border-ok-line bg-ok-bg px-5 py-5">
          <div className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight text-ink">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ok-solid">
              <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </span>
            {S.done.title}
          </div>
          <div className="mt-2 ml-[34px] text-[12.5px] text-ink3">{S.done.sub}</div>
          <div className="mt-4 ml-[34px] grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
            {S.done.checks.map((c) => (
              <div key={c.bold} className="flex items-center gap-2.5 text-[12.5px] text-ink2">
                <Check className="h-3.5 w-3.5 shrink-0 text-ok" aria-hidden="true" />
                <span>
                  {c.before}
                  <b className="font-semibold text-ink">{c.bold}</b>
                  {c.after}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-line bg-brand-soft px-4 py-3.5">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-ink">{S.done.runTitle}</div>
            <div className="mt-1 text-[11.5px] leading-relaxed text-ink3">{S.done.runSub}</div>
          </div>
          <div className="ml-auto shrink-0">
            <Btn onClick={onRun}>{S.done.run}</Btn>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2.5">
          <span className="text-sm font-bold text-ink">{S.done.needTitle(total)}</span>
          <span className="rounded-full border border-warn-line bg-warn-bg px-2.5 py-[3px] text-[10.5px] font-bold text-warn">
            {S.done.needPill}
          </span>
        </div>
        <p className="mt-2 mb-3 text-xs leading-relaxed text-ink3">{S.done.needSub}</p>

        {visible.map((item) => {
          const value = decisions[item.key] ?? 'keep';
          return (
            <div
              key={item.key}
              className="mb-2.5 rounded-xl border border-line bg-surface px-4 py-3.5"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-md border border-line bg-soft px-2 py-[3px] font-mono text-[12.5px] text-ink">
                  {item.key}
                </span>
                <span className="text-xs text-ink3">{S.done.inFile(item.file)}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink3">{item.reason}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => pick(item.key, 'keep')}
                  className={`rounded-lg px-3.5 py-[7px] text-xs font-semibold ${
                    value === 'keep'
                      ? 'border border-line-strong bg-hover text-ink'
                      : 'border border-line text-ink3 hover:bg-hover'
                  }`}
                >
                  {S.done.keep}
                </button>
                <button
                  type="button"
                  onClick={() => pick(item.key, 'change')}
                  className={`rounded-lg px-3.5 py-[7px] text-xs font-semibold ${
                    value === 'change'
                      ? 'border border-danger-line bg-danger-bg text-danger'
                      : 'border border-line text-ink3 hover:bg-hover'
                  }`}
                >
                  {S.done.change}
                </button>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="px-0.5 py-1.5 text-xs font-semibold text-brand-ink"
        >
          {showAll ? S.done.less : S.done.more(hidden)}
        </button>

        {decided > 0 && (
          <p className="mt-1 text-[11.5px] text-ink4">{S.done.applied(decided, total)}</p>
        )}

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-line px-4 py-3.5">
          <div>
            <div className="text-[13px] font-semibold text-ink2">{S.done.reviewTitle}</div>
            <div className="mt-1 text-[11.5px] text-ink4">{S.done.reviewSub}</div>
          </div>
          <button
            type="button"
            onClick={() => setNotice(S.done.demoNotice)}
            className="ml-auto flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-brand-ink"
          >
            {S.done.reviewAction}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 pb-2">
          <Btn big onClick={() => setNotice(S.done.demoNotice)}>
            {S.done.download}
          </Btn>
          <Btn variant="secondary" onClick={() => setNotice(S.done.demoNotice)}>
            {S.done.report}
          </Btn>
          <span className="ml-auto text-[11.5px] text-ink4">{S.done.safe}</span>
        </div>

        {notice && (
          <div className="mt-3 rounded-lg border border-info-line bg-info-bg px-3.5 py-3 text-[11.5px] text-ink2">
            {notice}
          </div>
        )}
      </div>
    </div>
  );
}
