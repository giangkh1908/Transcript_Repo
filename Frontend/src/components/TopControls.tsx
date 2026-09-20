import { Moon, Sun } from 'lucide-react';
import { useUi } from '../context/UiContext';
import { S } from '../copy';

/** Nút đổi giao diện sáng/tối. Dùng token nên đúng ở cả hai theme. */
export function TopControls() {
  const { theme, toggleTheme } = useUi();

  const themeTitle = theme === 'light' ? S.header.toDark : S.header.toLight;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={themeTitle}
      aria-label={themeTitle}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink3 hover:bg-hover hover:text-ink2"
    >
      {theme === 'light' ? (
        <Moon className="h-[15px] w-[15px]" aria-hidden="true" />
      ) : (
        <Sun className="h-[15px] w-[15px]" aria-hidden="true" />
      )}
    </button>
  );
}
