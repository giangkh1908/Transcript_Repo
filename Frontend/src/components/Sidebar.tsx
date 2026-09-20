import { Plus } from 'lucide-react';
import { S } from '../copy';
import { demoProjects } from '../demo';
import type { Project, Tone } from '../types';

const TONE: Record<Tone, string> = {
  ok: 'text-ok font-semibold',
  warn: 'text-warn font-semibold',
  danger: 'text-danger font-semibold',
  info: 'text-info font-semibold',
  muted: 'text-ink4',
};

/** Danh sách dự án bên trái — trạng thái viết bằng chữ, không chỉ bằng màu. */
export function Sidebar({
  activeId,
  onNew,
  onOpen,
}: {
  activeId: string | null;
  onNew: () => void;
  onOpen: (project: Project) => void;
}) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line-soft bg-side p-3.5">
      <button
        type="button"
        onClick={onNew}
        className="flex items-center gap-2 rounded-[9px] border border-line bg-panel px-3 py-2.5 text-[13px] font-medium text-ink hover:bg-hover"
      >
        <Plus className="h-4 w-4 text-brand" aria-hidden="true" />
        {S.sidebar.newProject}
      </button>

      <div className="mt-5 mb-2 ml-2.5 text-[10px] font-bold tracking-[0.9px] text-ink3">
        {S.sidebar.recent}
      </div>

      <div className="flex flex-col gap-0.5">
        {demoProjects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpen(p)}
            className={`flex flex-col items-start gap-[3px] rounded-lg px-2.5 py-2.5 text-left ${
              activeId === p.id ? 'bg-panel' : 'hover:bg-panel/60'
            }`}
          >
            <span
              className={`text-[12.5px] ${
                activeId === p.id ? 'font-semibold text-ink' : 'text-ink2'
              }`}
            >
              {p.name}
            </span>
            <span className={`text-[11px] ${TONE[p.tone]}`}>{p.statusLabel}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
