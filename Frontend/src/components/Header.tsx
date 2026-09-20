import { Settings, Sparkles } from 'lucide-react';
import { TopControls } from './TopControls';
import { useUi } from '../context/UiContext';
import { S } from '../copy';

/**
 * Thanh trên cùng của ứng dụng. Nút Cài đặt mở modal SettingsModal — một bộ
 * config key, một credential store.
 */
export function Header() {
  const { setSettingsOpen } = useUi();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line-soft bg-canvas px-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]">
          <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-ink">{S.app.name}</span>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 rounded-[9px] border border-line px-3 py-[6px] text-xs text-ink3 transition-colors hover:bg-hover hover:text-ink"
        >
          <Settings className="h-[14px] w-[14px]" aria-hidden="true" />
          <span>{S.settings.open}</span>
        </button>
        <TopControls />
      </div>
    </header>
  );
}
