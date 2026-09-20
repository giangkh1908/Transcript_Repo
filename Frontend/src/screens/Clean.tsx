import { useState } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { Btn, Note } from '../components/ui';
import { S } from '../copy';

/** Trạng thái rỗng: dự án không có gì cần sửa — luôn phải còn việc để bấm tiếp. */
export function Clean() {
  const [notice, setNotice] = useState(false);

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-[760px]">
        <div className="rounded-[14px] border border-info-line bg-info-bg px-6 py-5">
          <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-ink">
            <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-info-solid">
              <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </span>
            {S.clean.title}
          </div>
          <div className="mt-2.5 ml-[37px] text-[13px] leading-relaxed text-ink3">
            {S.clean.sub.before}
            <b className="font-semibold text-ink2">{S.clean.sub.bold}</b>
            {S.clean.sub.after}
          </div>
          <div className="mt-4 ml-[37px] grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
            {S.clean.checks.map((c) => (
              <div key={c.bold} className="flex items-center gap-2.5 text-[12.5px] text-ink2">
                <Check className="h-3.5 w-3.5 shrink-0 text-info" aria-hidden="true" />
                <span>
                  {c.before}
                  <b className="font-semibold text-ink">{c.bold}</b>
                  {c.after}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-sm font-bold text-ink">{S.clean.nextTitle}</div>
        <p className="mt-2 mb-3 text-xs leading-relaxed text-ink3">{S.clean.nextSub}</p>

        <div className="rounded-xl border border-line bg-surface px-4.5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-line bg-soft">
              <BookOpen className="h-4 w-4 text-info" aria-hidden="true" />
            </span>
            <div>
              <div className="text-[13.5px] font-semibold text-ink">{S.clean.offerTitle}</div>
              <div className="mt-1.5 text-xs leading-relaxed text-ink3">{S.clean.offerSub}</div>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-2.5">
            <Btn onClick={() => setNotice(true)}>{S.clean.write}</Btn>
            <Btn variant="secondary" onClick={() => setNotice(true)}>
              {S.clean.ask}
            </Btn>
          </div>
        </div>

        {notice && (
          <div className="mt-3 rounded-lg border border-info-line bg-info-bg px-3.5 py-3 text-[11.5px] text-ink2">
            {S.clean.demoNotice}
          </div>
        )}

        <Note>
          {S.clean.note.before}
          <b className="font-semibold text-ink3">{S.clean.note.bold}</b>
          {S.clean.note.after}
        </Note>
      </div>
    </div>
  );
}
