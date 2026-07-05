import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DevicesView } from '@/components/features/DevicesView';
import { ClipboardView } from '@/components/features/ClipboardView';
import { FilesView } from '@/components/features/FilesView';
import { SettingsView } from '@/components/features/SettingsView';
import { TerminalView } from '@/components/features/TerminalView';
import { OnboardingScreen } from '@/components/features/OnboardingScreen';
import { useAppStore } from '@/stores/app.store';
import { useDropZone } from '@/hooks/useDropZone';

function App() {
  const { currentView, isInitializing, initError } = useAppStore();
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem('dropzone_onboarded') === 'true'
  );
  useDropZone();

  // First-run onboarding
  if (!onboarded) {
    return (
      <OnboardingScreen
        onComplete={(deviceName) => {
          localStorage.setItem('dropzone_device_name', deviceName);
          setOnboarded(true);
        }}
      />
    );
  }

  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Connecting to DropZone…</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-background px-8 text-center">
        <p className="font-medium text-destructive">Connection failed</p>
        <p className="max-w-sm text-sm text-muted-foreground">{initError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'devices':
        return <DevicesView />;
      case 'clipboard':
        return <ClipboardView />;
      case 'files':
        return <FilesView />;
      case 'terminal':
        return <TerminalView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DevicesView />;
    }
  };

  return <AppLayout>{renderView()}</AppLayout>;
}

export default App;
