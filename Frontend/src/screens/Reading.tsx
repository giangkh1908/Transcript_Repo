import { useEffect, useState } from 'react';
import { Check, Circle } from 'lucide-react';
import { Btn, Spinner } from '../components/ui';
import { S } from '../copy';
import { demoNumbers } from '../demo';

/** Đang đọc dự án: tiến trình theo đơn vị việc thật, không dùng phần trăm ước lượng. */
export function Reading({
  source,
  onCancel,
}: {
  source: string;
  onCancel: () => void;
}) {
  const [read, setRead] = useState(0);

  useEffect(() => {
    const step = Math.max(1, Math.ceil(demoNumbers.readFiles / 40));
    const t = window.setInterval(() => {
      setRead((v) => (v >= demoNumbers.readFiles ? v : Math.min(demoNumbers.readFiles, v + step)));
    }, 55);
    return () => window.clearInterval(t);
  }, []);

  const pct = Math.round((read / demoNumbers.totalFiles) * 100);
  const steps = S.reading.steps;

  return (
    <div className="flex flex-1 justify-center overflow-y-auto px-6 py-7">
      <div className="w-full max-w-[720px]">
        <div className="mb-5 flex justify-end">
          <div className="max-w-full truncate rounded-[14px_14px_3px_14px] border border-line bg-soft px-3.5 py-2.5 text-[12.5px] text-ink2">
            {source}
          </div>
        </div>

        <div className="flex gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-[13px] text-white">
            ✦
          </span>
          <div className="min-w-0 flex-1">
            <div className="rounded-[14px] border border-line bg-panel p-5">
              <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                <Spinner />
                {S.reading.title}
              </div>

              <div className="mt-3.5 h-[7px] overflow-hidden rounded-full border border-line-soft bg-soft">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4f46e5] to-[#818cf8] transition-[width] duration-150"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-2 flex justify-between text-[11.5px] text-ink3">
                <span>
                  {S.reading.readOf(read, demoNumbers.totalFiles)}
                </span>
                <span>{S.reading.about}</span>
              </div>

              <div className="mt-4 flex flex-col gap-2.5">
                {steps.map((text, i) => (
                  <div
                    key={text}
                    className={`flex items-center gap-2.5 text-[12.5px] ${
                      i < 2 ? 'text-ink3' : i === 2 ? 'font-medium text-ink' : 'text-ink4'
                    }`}
                  >
                    <span className="w-4 shrink-0 text-center">
                      {i < 2 ? (
                        <Check className="mx-auto h-3.5 w-3.5 text-ok" aria-hidden="true" />
                      ) : i === 2 ? (
                        <span className="mx-auto block h-1.5 w-1.5 rounded-full bg-brand" />
                      ) : (
                        <Circle className="mx-auto h-3 w-3 text-ink4" aria-hidden="true" />
                      )}
                    </span>
                    {text}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <Btn variant="ghost" onClick={onCancel}>
                {S.reading.cancel}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
