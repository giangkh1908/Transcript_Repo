import { useEffect, useState } from 'react';
import { Check, Circle, Copy, ExternalLink, Info, Play, Square } from 'lucide-react';
import { Btn, Note, Spinner } from '../components/ui';
import { S } from '../copy';
import { demoRun } from '../demo';

type Phase = 'ready' | 'starting' | 'running';

/**
 * Chạy thử dự án: kết quả quét của hệ thống (cần cài gì, chạy lệnh nào, mở ở
 * đâu) → bấm Chạy dự án → khung giao diện đang chạy + cách sử dụng.
 *
 * Chưa nối backend nên tiến trình mô phỏng bằng timer và khung xem trước trỏ
 * vào trang mẫu trong /public. Khi nối API: thay bằng trạng thái thật từ
 * server và địa chỉ cổng của dự án đang chạy.
 */
export function Run() {
  const [phase, setPhase] = useState<Phase>('ready');

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6">
      <div className="mx-auto w-full max-w-[760px] pb-8">
        {phase === 'ready' && <Ready onRun={() => setPhase('starting')} />}
        {phase === 'starting' && (
          <Starting
            onDone={() => setPhase('running')}
            onCancel={() => setPhase('ready')}
          />
        )}
        {phase === 'running' && <Running onStop={() => setPhase('ready')} />}
      </div>
    </div>
  );
}

/** Kết quả quét: dự án viết bằng gì, cần gì, cài và chạy bằng lệnh nào. */
function Ready({ onRun }: { onRun: () => void }) {
  const r = demoRun;

  return (
    <>
      <h1 className="text-[17px] font-bold tracking-tight text-ink">{S.run.title}</h1>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink3">{S.run.sub}</p>

      <div className="mt-5 rounded-xl border border-line bg-panel px-4 py-4">
        <div className="flex flex-wrap gap-x-10 gap-y-2.5">
          <Fact label={S.run.kindLabel} value={r.kind} />
          <Fact label={S.run.needsLabel} value={r.needs} />
        </div>

        <div className="mt-3.5 flex flex-col gap-2.5 border-t border-line-soft pt-3.5">
          {r.notes.map((note) => (
            <div key={note} className="flex gap-2.5 text-[12px] leading-relaxed text-ink2">
              <Info className="mt-[3px] h-3.5 w-3.5 shrink-0 text-warn" aria-hidden="true" />
              <span>{note}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-panel px-4 py-4">
        <div className="text-[13.5px] font-bold text-ink">{S.run.howTitle}</div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink3">{S.run.howSub}</p>

        <div className="mt-3.5 flex flex-col gap-3">
          <CommandStep index={1} label={r.install.label} command={r.install.command} />
          <CommandStep index={2} label={r.start.label} command={r.start.command} />
        </div>

        <p className="mt-3.5 border-t border-line-soft pt-3.5 text-[11.5px] text-ink3">
          {S.run.addressNote(r.address)}
        </p>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Btn big onClick={onRun}>
          <Play className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          {S.run.start}
        </Btn>
      </div>

      <Note>
        {S.run.note.before}
        <b className="font-semibold text-ink3">{S.run.note.bold}</b>
        {S.run.note.after}
      </Note>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold tracking-[0.6px] text-ink4">{label}</div>
      <div className="mt-1 text-[13px] font-semibold text-ink">{value}</div>
    </div>
  );
}

/** Một bước cài đặt/khởi động: lệnh kèm nút sao chép. */
function CommandStep({
  index,
  label,
  command,
}: {
  index: number;
  label: string;
  command: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      /* trình duyệt chặn clipboard: vẫn hiện lệnh để người dùng tự bôi đen */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-soft text-[11px] font-semibold text-ink3">
        {index}
      </span>
      <span className="text-[12.5px] text-ink2">{label}</span>
      <code className="ml-auto max-w-full overflow-x-auto rounded-md border border-line bg-soft px-2.5 py-[5px] font-mono text-[12px] whitespace-nowrap text-ink">
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 py-[6px] text-[11.5px] font-semibold text-ink3 hover:bg-hover"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-ok" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {copied ? S.run.copied : S.run.copy}
      </button>
    </div>
  );
}

/** Đang cài và khởi động — tiến trình theo từng việc thật, không dùng phần trăm ước lượng. */
function Starting({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const steps = S.run.starting.steps;
  const [step, setStep] = useState(0);

  useEffect(() => {
    const delay = step >= steps.length ? 500 : 750;
    const t = window.setTimeout(() => {
      if (step >= steps.length) onDone();
      else setStep((v) => v + 1);
    }, delay);
    return () => window.clearTimeout(t);
  }, [step, steps.length, onDone]);

  return (
    <>
      <div className="flex gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-[13px] text-white">
          ✦
        </span>
        <div className="min-w-0 flex-1">
          <div className="rounded-[14px] border border-line bg-panel p-5">
            <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
              <Spinner />
              {S.run.starting.title}
            </div>

            <div className="mt-3.5 h-[7px] overflow-hidden rounded-full border border-line-soft bg-soft">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4f46e5] to-[#818cf8] transition-[width] duration-150"
                style={{ width: `${Math.round((step / steps.length) * 100)}%` }}
              />
            </div>

            <div className="mt-2 flex justify-between text-[11.5px] text-ink3">
              <span>
                {step >= steps.length ? S.run.starting.steps[steps.length - 1] : steps[step]}
              </span>
              <span>{S.run.starting.about}</span>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {steps.map((text, i) => (
                <div
                  key={text}
                  className={`flex items-center gap-2.5 text-[12.5px] ${
                    i < step ? 'text-ink3' : i === step ? 'font-medium text-ink' : 'text-ink4'
                  }`}
                >
                  <span className="w-4 shrink-0 text-center">
                    {i < step ? (
                      <Check className="mx-auto h-3.5 w-3.5 text-ok" aria-hidden="true" />
                    ) : i === step ? (
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
              {S.run.starting.cancel}
            </Btn>
          </div>
        </div>
      </div>
    </>
  );
}

/** Đang chạy: giao diện dự án trong khung xem trước + cách sử dụng. */
function Running({ onStop }: { onStop: () => void }) {
  const r = demoRun;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-ink">
          <span className="h-2 w-2 rounded-full bg-ok-solid" aria-hidden="true" />
          {S.run.running.title}
        </span>
        <span className="rounded-full border border-ok-line bg-ok-bg px-2.5 py-[3px] text-[10.5px] font-bold text-ok">
          {S.run.running.pill}
        </span>
        <code className="rounded-md border border-line bg-soft px-2 py-[3px] font-mono text-[11.5px] text-ink2">
          {r.address}
        </code>

        <div className="ml-auto flex items-center gap-2">
          <Btn
            variant="secondary"
            onClick={() => window.open(r.previewSrc, '_blank', 'noopener')}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {S.run.running.openTab}
          </Btn>
          <Btn variant="ghost" onClick={onStop}>
            <Square className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {S.run.running.stop}
          </Btn>
        </div>
      </div>

      {/* Khung giả lập cửa sổ trình duyệt quanh giao diện dự án. */}
      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-panel">
        <div className="flex items-center gap-2 border-b border-line bg-soft px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" aria-hidden="true" />
          <span className="mx-auto rounded-md border border-line bg-panel px-2.5 py-[3px] font-mono text-[11px] text-ink3">
            {r.address}
          </span>
        </div>

        {/*
          ponytail: trang xem trước hiện là tệp của chính app trong /public nên
          cùng origin là chấp nhận được. Khi nối backend, bản xem trước PHẢI
          được phục vụ từ một CỔNG KHÁC (backend cấp, vd. 127.0.0.1:8687) rồi
          giữ nguyên allow-same-origin ở đây: khác origin thì Same-Origin Policy
          đã tách app khỏi dự án, còn bỏ cờ này sẽ làm dự án mất localStorage
          của chính nó. Cùng origin mà vẫn allow-same-origin thì code của dự án
          đọc được token và cấu hình của app — không được.
        */}
        <iframe
          title={S.run.running.frameTitle}
          src={r.previewSrc}
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
          className="h-[380px] w-full bg-white"
        />
      </div>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink4">{S.run.demoNotice}</p>

      <div className="mt-5 rounded-xl border border-line bg-panel px-4 py-4">
        <div className="text-[13.5px] font-bold text-ink">{S.run.usageTitle}</div>
        <div className="mt-3 flex flex-col gap-2.5">
          {r.usage.map((line, i) => (
            <div key={line} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink2">
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-soft text-[11px] font-semibold text-ink3">
                {i + 1}
              </span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
