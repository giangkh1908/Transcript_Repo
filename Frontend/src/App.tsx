import { UiProvider } from './context/UiContext';
import { ProjectFlow } from './components/ProjectFlow';
import { SettingsModal } from './components/settings/SettingsModal';

export default function App() {
  return (
    <UiProvider>
      <ProjectFlow />
      {/* Cài đặt đọc useUi nên phải nằm trong UiProvider */}
      <SettingsModal />
    </UiProvider>
  );
}
