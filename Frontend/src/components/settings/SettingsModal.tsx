import React, { useEffect, useState } from 'react';
import { useUi } from '../../context/UiContext';
import { Settings, X, Save, Shield, BookOpen, Sliders } from 'lucide-react';
import { ModelsSettings } from './ModelsSettings';
import { loadPrefs, savePrefs, type AppPrefs, type DocLanguage } from '../../config/prefs';

export const SettingsModal: React.FC = () => {
  // Một modal cho cả ứng dụng — mở từ UiContext (Header cũng mở được).
  const { settingsOpen, setSettingsOpen } = useUi();
  // Mặc định giống prefs.ts; giá trị đã lưu chỉ được nạp khi modal mở (effect dưới).
  const [prefs, setPrefs] = useState<AppPrefs>({ docLanguage: 'vi-VN', preserveConfig: true, strictPEP8: true });

  // Mở modal là nạp lại tuỳ chọn đã lưu (chung nguồn với bên Đơn giản).
  useEffect(() => {
    if (settingsOpen) setPrefs(loadPrefs());
  }, [settingsOpen]);

  if (!settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--c-panel)] border border-[var(--c-line)] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-12 border-b border-[var(--c-line)] px-5 flex items-center justify-between bg-[var(--c-panel)]">
          <div className="flex items-center space-x-2 text-brand-ink">
            <Settings className="w-4 h-4" />
            <span className="text-sm font-semibold text-ink">Cài đặt hệ thống & quy tắc tái cấu trúc</span>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="text-ink3 hover:text-ink p-1 rounded-md hover:bg-[var(--c-line)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-ink2 max-h-[72vh] overflow-y-auto">
          {/* Models & Providers */}
          <ModelsSettings />

          {/* Configuration Contract Guard */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 font-semibold text-ink">
              <Shield className="w-4 h-4 text-ok" />
              <span>Bảo vệ hạ tầng bên ngoài</span>
            </label>
            <label className="flex items-start space-x-3 p-3 bg-[var(--c-canvas)] border border-[var(--c-line)] rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.preserveConfig}
                onChange={(e) => setPrefs({ ...prefs, preserveConfig: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <div className="font-medium text-ink">Bảo vệ bất biến cấu hình</div>
                <div className="text-[11px] text-ink3 mt-0.5">
                  Tự động phát hiện và khoá biến môi trường (DATABASE_URL, REDIS_URL) được tham chiếu bởi docker-compose.yml và file CI/CD.
                </div>
                <div className="mt-1 font-mono text-[9.5px] text-ink4">infra.lockExternalConfig</div>
              </div>
            </label>
          </div>

          {/* Vietnamese Documentation Spec */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 font-semibold text-ink">
              <BookOpen className="w-4 h-4 text-ai" />
              <span>Chuẩn tài liệu tiếng Việt</span>
            </label>
            <select
              value={prefs.docLanguage}
              onChange={(e) => setPrefs({ ...prefs, docLanguage: e.target.value as DocLanguage })}
              className="w-full bg-[var(--c-canvas)] border border-[var(--c-line)] rounded-lg p-2.5 text-xs text-ink focus:outline-none focus:border-brand-line"
            >
              <option value="vi-VN">Tiếng Việt kỹ thuật chuẩn</option>
              <option value="vi-bilingual">Song ngữ Anh - Việt</option>
            </select>
            <p className="font-mono text-[9.5px] text-ink4">docs.language</p>
          </div>

          {/* Code Quality Rules */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 font-semibold text-ink">
              <Sliders className="w-4 h-4 text-warn" />
              <span>Quy tắc chuẩn hoá code</span>
            </label>
            <label className="flex items-center space-x-3 p-3 bg-[var(--c-canvas)] border border-[var(--c-line)] rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.strictPEP8}
                onChange={(e) => setPrefs({ ...prefs, strictPEP8: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-medium text-ink">Ép chuẩn định danh snake_case & PascalCase</span>
              <span className="ml-auto font-mono text-[9.5px] text-ink4">naming.strictNormalization</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-[var(--c-line)] px-5 flex items-center justify-end space-x-3 bg-[var(--c-panel)]">
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-3 py-1.5 bg-[var(--c-hover)] hover:bg-[var(--c-line)] text-ink2 rounded-lg text-xs"
          >
            Đóng
          </button>
          <button
            onClick={() => {
              savePrefs(prefs);
              setSettingsOpen(false);
            }}
            className="px-4 py-1.5 bg-brand hover:bg-brand-hi text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu cấu hình</span>
          </button>
        </div>
      </div>
    </div>
  );
};
