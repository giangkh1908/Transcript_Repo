import { useEffect, useState } from 'react';
import { Btn, Spinner } from '../components/ui';
import { S } from '../copy';
import { demoNumbers } from '../demo';

/** Đang biến đổi: đếm theo tệp và theo tên, luôn hiện đang làm tệp nào. */
export function Working({ onCancel }: { onCancel: () => void }) {
  const [files, setFiles] = useState(0);
  const [symbols, setSymbols] = useState(0);

  useEffect(() => {
    const fileStep = Math.max(1, Math.ceil(demoNumbers.transformFilesDone / 40));
    const symStep = Math.max(1, Math.ceil(demoNumbers.transformSymbolsDone / 40));
    const t = window.setInterval(() => {
      setFiles((v) =>
        v >= demoNumbers.transformFilesDone
          ? v
          : Math.min(demoNumbers.transformFilesDone, v + fileStep),
      );
      setSymbols((v) =>
        v >= demoNumbers.transformSymbolsDone
          ? v
          : Math.min(demoNumbers.transformSymbolsDone, v + symStep),
      );
    }, 55);
    return () => window.clearInterval(t);
  }, []);

  const pct = Math.round((files / demoNumbers.transformFiles) * 100);

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-[620px]">
        <div className="rounded-[14px] border border-line bg-panel p-5">
          <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
            <Spinner />
            {S.working.title}
          </div>

          <div className="mt-3.5 h-[7px] overflow-hidden rounded-full border border-line-soft bg-soft">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4f46e5] to-[#818cf8] transition-[width] duration-150"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-3 flex flex-col gap-1.5 text-[12.5px] text-ink2">
            <span>{S.working.files(files, demoNumbers.transformFiles)}</span>
            <span>
              {S.working.symbols(
                symbols.toLocaleString('vi-VN'),
                demoNumbers.transformSymbols.toLocaleString('vi-VN'),
              )}
            </span>
          </div>

          <div className="mt-4 rounded-lg border border-line-soft bg-soft px-3.5 py-3 font-mono text-[11.5px] text-ink3">
            {S.working.current(demoNumbers.currentFile)}
          </div>

          <div className="mt-3 text-[12.5px] text-ink3">{S.working.applying}</div>
        </div>

        <div className="mt-3">
          <Btn variant="ghost" onClick={onCancel}>
            {S.working.cancel}
          </Btn>
        </div>
      </div>
    </div>
  );
}
