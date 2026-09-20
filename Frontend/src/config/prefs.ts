/**
 * Tuỳ chọn chung — đọc/ghi qua config/store.ts.
 *
 * Sửa trong SettingsModal; nơi lưu thật là config/store.ts; các key tương ứng:
 *   docLanguage     → docs.language
 *   preserveConfig  → infra.lockExternalConfig
 *   strictPEP8      → naming.strictNormalization
 */

import { getConfig, setConfig } from './store';
import type { DocLanguage } from './schema';

export type { DocLanguage };

export interface AppPrefs {
  /** Ngôn ngữ cho tài liệu/chú thích sinh ra. → docs.language */
  docLanguage: DocLanguage;
  /** true = khoá phần cấu hình hạ tầng. → infra.lockExternalConfig */
  preserveConfig: boolean;
  /** true = chuẩn hoá định danh. → naming.strictNormalization */
  strictPEP8: boolean;
}

export function loadPrefs(): AppPrefs {
  return {
    docLanguage: getConfig('docs.language'),
    preserveConfig: getConfig('infra.lockExternalConfig'),
    strictPEP8: getConfig('naming.strictNormalization'),
  };
}

export function savePrefs(prefs: AppPrefs): void {
  setConfig('docs.language', prefs.docLanguage);
  setConfig('infra.lockExternalConfig', prefs.preserveConfig);
  setConfig('naming.strictNormalization', prefs.strictPEP8);
}
