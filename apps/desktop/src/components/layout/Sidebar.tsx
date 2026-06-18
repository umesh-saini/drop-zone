import { Monitor, Clipboard, FolderOpen, Settings, Wifi, WifiOff, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type AppView } from '@/stores/app.store';

const navItems: { id: AppView; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'devices', label: 'Devices', icon: Monitor },
  { id: 'clipboard', label: 'Clipboard', icon: Clipboard },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { currentView, setView, isConnected, connectionMode, deviceCode } = useAppStore();

  return (
    <aside className="flex h-full w-16 flex-col items-center border-r border-border bg-card py-4">
      {/* Logo */}
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Zap className="h-5 w-5 text-primary" />
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                isActive
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
              title={item.label}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </nav>

      {/* Connection status */}
      <div className="mt-auto flex flex-col items-center gap-2">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            isConnected ? 'text-success' : 'text-muted-foreground'
          )}
          title={isConnected ? `Connected (${connectionMode})` : 'Disconnected'}
        >
          {isConnected ? (
            connectionMode === 'local' ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <Wifi className="h-4 w-4" />
            )
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
        </div>
        {deviceCode && (
          <span className="text-[10px] text-muted-foreground">{deviceCode.slice(0, 4)}</span>
        )}
      </div>
    </aside>
  );
}
