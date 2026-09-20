import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowUp,
  CaseSensitive,
  ChevronRight,
  FileArchive,
  FolderOpen,
  Globe,
  Sparkles,
} from 'lucide-react';
import { Note, Sel } from '../components/ui';
import { S } from '../copy';

/** Màn hình đầu: chat-first, cấu hình nằm ngay trong ô nhập, không có wizard. */
export function Landing({ onStart }: { onStart: () => void }) {
  const [url, setUrl] = useState('');
  const [doc, setDoc] = useState<string>(S.landing.settings.doc[0]);
  const [comment, setComment] = useState<string>(S.landing.settings.comment[0]);
  const [safety, setSafety] = useState<string>(S.landing.settings.safety[0]);

  const cards = S.landing.cards;

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-[820px]">
        <h1 className="text-center text-[30px] font-bold tracking-[-0.7px] text-ink">
          {S.landing.title}
        </h1>
        <p className="mt-3 text-center text-[13.5px] leading-relaxed text-ink3">
          {S.landing.sub1}
          <br />
          {S.landing.sub2}
        </p>

        <div className="mt-[34px] rounded-2xl border border-line bg-panel p-5 pb-3.5 shadow-panel">
          <textarea
            rows={1}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onStart();
              }
            }}
            placeholder={S.landing.placeholder}
            className="w-full resize-none bg-transparent px-0.5 pt-0.5 pb-7 text-[13.5px] text-ink outline-none placeholder:text-ink4"
          />

          <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
            <button
              type="button"
              onClick={onStart}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-soft px-[11px] py-[7px] text-[11.5px] text-ink2 hover:bg-hover"
            >
              <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
              {S.landing.pickFolder}
            </button>
            <button
              type="button"
              onClick={onStart}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-soft px-[11px] py-[7px] text-[11.5px] text-ink2 hover:bg-hover"
            >
              <FileArchive className="h-3.5 w-3.5" aria-hidden="true" />
              {S.landing.pickZip}
            </button>

            <span className="mx-0.5 h-[18px] w-px bg-line" />

            <Sel
              label={S.landing.settings.doc[0]}
              value={doc}
              options={S.landing.settings.doc}
              onChange={setDoc}
            />
            <Sel
              label={S.landing.settings.comment[0]}
              value={comment}
              options={S.landing.settings.comment}
              onChange={setComment}
            />
            <Sel
              label={S.landing.settings.safety[0]}
              value={safety}
              options={S.landing.settings.safety}
              onChange={setSafety}
            />

            <button
              type="button"
              onClick={onStart}
              title={S.landing.send}
              aria-label={S.landing.send}
              className="ml-auto flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-brand text-white hover:bg-brand-hi"
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="my-4 flex items-center gap-3 text-[11.5px] text-ink4">
          <span className="h-px flex-1 bg-line-soft" />
          {S.landing.orPick}
          <span className="h-px flex-1 bg-line-soft" />
        </div>

        <QuickCard
          icon={<Globe className="h-4 w-4 text-info" aria-hidden="true" />}
          title={cards.docs.title}
          sub={
            <>
              {cards.docs.before}
              <b className="font-semibold text-ok">{cards.docs.bold}</b>
            </>
          }
          onClick={onStart}
        />
        <QuickCard
          icon={<CaseSensitive className="h-4 w-4 text-warn" aria-hidden="true" />}
          title={cards.rename.title}
          sub={
            <>
              {cards.rename.before}
              <i className="not-italic font-semibold text-warn">{cards.rename.italic}</i>
            </>
          }
          onClick={onStart}
        />
        <QuickCard
          icon={<Sparkles className="h-4 w-4 text-brand" aria-hidden="true" />}
          title={
            <>
              {cards.all.title}
              <span className="ml-2 rounded-[5px] border border-brand-line bg-brand-soft px-1.5 py-px align-[1px] text-[9.5px] font-bold tracking-[0.5px] text-brand-ink">
                {cards.all.badge}
              </span>
            </>
          }
          sub={cards.all.sub}
          best
          onClick={onStart}
        />

        <Note>
          {S.landing.note.before}
          <b className="font-semibold text-ink3">{S.landing.note.bold}</b>
          {S.landing.note.after}
        </Note>
      </div>
    </div>
  );
}

function QuickCard({
  icon,
  title,
  sub,
  best = false,
  onClick,
}: {
  icon: ReactNode;
  title: ReactNode;
  sub: ReactNode;
  best?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-3 flex w-full items-center gap-3.5 rounded-xl border p-[18px] text-left transition-colors ${
        best ? 'border-brand-line bg-brand-soft' : 'border-line bg-surface hover:border-line-strong'
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-line bg-soft">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-[11.5px] text-ink3">{sub}</span>
      </span>
      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-ink4" aria-hidden="true" />
    </button>
  );
}
