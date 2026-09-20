import { useState } from 'react';
import { ArrowUp, BookOpen, CaseSensitive, Check, Store } from 'lucide-react';
import { Btn } from '../components/ui';
import { S } from '../copy';
import { answerFor, demoNumbers } from '../demo';

interface Msg {
  id: number;
  mine: boolean;
  text: string;
}

/** Kết quả phân tích: 3 gạch đầu dòng bằng văn xuôi + một nút bắt đầu. */
export function Result({
  source,
  onStart,
}: {
  source: string;
  onStart: () => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');

  const send = () => {
    const q = draft.trim();
    if (!q) return;
    setMsgs((prev) => [
      ...prev,
      { id: prev.length, mine: true, text: q },
      { id: prev.length + 1, mine: false, text: answerFor(q) },
    ]);
    setDraft('');
  };

  const icons = [
    <Store key="a" className="h-3.5 w-3.5 text-info" aria-hidden="true" />,
    <CaseSensitive key="b" className="h-3.5 w-3.5 text-warn" aria-hidden="true" />,
    <BookOpen key="c" className="h-3.5 w-3.5 text-brand" aria-hidden="true" />,
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-6 py-7">
        <div className="w-full max-w-[720px]">
          <div className="mb-5 flex justify-end">
            <div className="max-w-full truncate rounded-[14px_14px_3px_14px] border border-line bg-soft px-3.5 py-2.5 text-[12.5px] text-ink2">
              {source}
            </div>
          </div>

          <div className="mb-4 flex gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-[13px] text-white">
              ✦
            </span>
            <div className="min-w-0 flex-1">
              <div className="rounded-[14px] border border-line bg-panel p-5">
                <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                  <Check className="h-3.5 w-3.5 text-ok" aria-hidden="true" />
                  {S.reading.steps[0]}
                </div>
                <div className="mt-2 text-[11.5px] text-ink3">
                  {S.reading.readOf(demoNumbers.readFiles, demoNumbers.totalFiles)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-[13px] text-white">
              ✦
            </span>
            <div className="min-w-0 flex-1">
              <div className="rounded-[14px] border border-line bg-panel px-5 py-5">
                <div className="text-[15px] font-bold tracking-tight text-ink">
                  {S.result.title}
                </div>

                <div className="mt-3.5 flex flex-col gap-3">
                  {S.result.bullets.map((b, i) => (
                    <div key={b.bold} className="flex gap-2.5 text-[13px] leading-relaxed text-ink2">
                      <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-line bg-soft">
                        {icons[i]}
                      </span>
                      <div>
                        {b.before}
                        <b className="font-semibold text-ink">{b.bold}</b>
                        {b.after}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center gap-2.5 border-t border-line-soft pt-4">
                  <Btn big onClick={onStart}>
                    {S.result.start}
                  </Btn>
                  <Btn variant="secondary">{S.result.details}</Btn>
                  <span className="ml-auto text-[11.5px] text-ink4">{S.result.hint}</span>
                </div>
              </div>
            </div>
          </div>

          {msgs.map((m) =>
            m.mine ? (
              <div key={m.id} className="mt-4 flex justify-end">
                <div className="max-w-[85%] rounded-[14px_14px_3px_14px] border border-line bg-soft px-3.5 py-2.5 text-[12.5px] text-ink2">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className="mt-4 flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-[13px] text-white">
                  ✦
                </span>
                <div className="min-w-0 flex-1 rounded-[14px] border border-line bg-panel px-5 py-4 text-[12.5px] leading-relaxed text-ink2">
                  {m.text}
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="flex shrink-0 justify-center px-6 pt-3.5 pb-5">
        <div className="flex w-full max-w-[720px] items-center gap-3 rounded-[14px] border border-line bg-panel px-3.5 py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            placeholder={S.result.askPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink4"
          />
          <button
            type="button"
            onClick={send}
            aria-label="Gửi câu hỏi"
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-brand text-white hover:bg-brand-hi"
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
