import { AppLayout } from '@/components/layout/AppLayout';
import { DevicesView } from '@/components/features/DevicesView';
import { ClipboardView } from '@/components/features/ClipboardView';
import { FilesView } from '@/components/features/FilesView';
import { SettingsView } from '@/components/features/SettingsView';
import { useAppStore } from '@/stores/app.store';

function App() {
  const { currentView } = useAppStore();

  const renderView = () => {
    switch (currentView) {
      case 'devices':
        return <DevicesView />;
      case 'clipboard':
        return <ClipboardView />;
      case 'files':
        return <FilesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DevicesView />;
    }
  };

  return <AppLayout>{renderView()}</AppLayout>;
}

export default App;
