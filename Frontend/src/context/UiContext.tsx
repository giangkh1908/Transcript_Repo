import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'repo-agent.theme';

function readParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* chế độ riêng tư có thể chặn localStorage — bỏ qua, chỉ mất tính ghi nhớ */
  }
}

/** Mặc định là 'light'. Tham số ?theme= trên URL được ưu tiên hơn. */
function initialTheme(): Theme {
  const p = readParam('theme');
  if (p === 'light' || p === 'dark') return p;
  return readStored(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

interface UiContextValue {
  theme: Theme;
  toggleTheme: () => void;
  /** Modal Cài đặt: một modal, một bộ dữ liệu (config key + credential). */
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

const UiContext = createContext<UiContextValue | undefined>(undefined);

export function UiProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  /** Áp theme lên <html>. */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      writeStored(THEME_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<UiContextValue>(
    () => ({ theme, toggleTheme, settingsOpen, setSettingsOpen }),
    [theme, toggleTheme, settingsOpen],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used within a UiProvider');
  return ctx;
}
