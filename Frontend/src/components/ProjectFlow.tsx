import { useCallback, useEffect, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Clean } from '../screens/Clean';
import { Done } from '../screens/Done';
import { Failed } from '../screens/Failed';
import { Landing } from '../screens/Landing';
import { Reading } from '../screens/Reading';
import { Result } from '../screens/Result';
import { Run } from '../screens/Run';
import { Working } from '../screens/Working';
import { demoProjects } from '../demo';
import type { Project, Stage } from '../types';

/** Nguồn demo — sẽ thay bằng dữ liệu người dùng nhập khi nối backend. */
const DEMO_SOURCE = 'https://github.com/congty/website-ban-hang';

/**
 * Mở thẳng một màn hình để kiểm thử/duyệt thiết kế: `?stage=done`.
 * Chỉ dùng khi phát triển; người dùng thật luôn bắt đầu từ 'landing'.
 */
function initialStage(): Stage {
  try {
    const p = new URLSearchParams(window.location.search).get('stage');
    const known: Stage[] = ['reading', 'result', 'working', 'done', 'run', 'clean', 'failed'];
    return known.find((s) => s === p) ?? 'landing';
  } catch {
    return 'landing';
  }
}

/**
 * Khung của luồng xử lý dự án: thanh trên, danh sách dự án gần đây, và màn hình
 * đang mở. Tiến trình tự chạy bằng timer vì chưa có backend — khi nối API thì
 * thay hai setTimeout dưới đây bằng trạng thái thật từ server.
 */
export function ProjectFlow() {
  const [stage, setStage] = useState<Stage>(initialStage);
  const [activeId, setActiveId] = useState<string | null>(
    () => demoProjects.find((p) => p.stage === initialStage())?.id ?? null,
  );
  const [source, setSource] = useState(DEMO_SOURCE);

  useEffect(() => {
    if (stage === 'reading') {
      const t = window.setTimeout(() => setStage('result'), 2600);
      return () => window.clearTimeout(t);
    }
    if (stage === 'working') {
      const t = window.setTimeout(() => setStage('done'), 2400);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [stage]);

  const startReading = useCallback(() => {
    setActiveId('website-ban-hang');
    setSource(DEMO_SOURCE);
    setStage('reading');
  }, []);

  const backToStart = useCallback(() => {
    setActiveId(null);
    setStage('landing');
  }, []);

  const open = useCallback((p: Project) => {
    setActiveId(p.id);
    setStage(p.stage);
  }, []);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-canvas text-ink">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar activeId={activeId} onNew={backToStart} onOpen={open} />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {stage === 'landing' && <Landing onStart={startReading} />}
          {stage === 'reading' && <Reading source={source} onCancel={backToStart} />}
          {stage === 'result' && <Result source={source} onStart={() => setStage('working')} />}
          {stage === 'working' && <Working onCancel={backToStart} />}
          {stage === 'done' && <Done onRun={() => setStage('run')} />}
          {stage === 'run' && <Run />}
          {stage === 'clean' && <Clean />}
          {stage === 'failed' && (
            <Failed
              onRetry={() => setStage('reading')}
              onPickFolder={() => setStage('reading')}
              onPasteOther={backToStart}
            />
          )}
        </main>
      </div>
    </div>
  );
}
