import { Clipboard, Copy, Trash2, ArrowDownLeft, ArrowUpRight, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/app.store';
import { toast } from 'sonner';
import { dropzone } from '@/services/DropZoneService';

export function ClipboardView() {
  const { clipboardHistory, clearClipboardHistory } = useAppStore();

  const copyToClipboard = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const pushNow = async () => {
    try {
      await dropzone.pushClipboardNow();
      toast.success('Clipboard pushed');
    } catch {
      toast.error('Push failed');
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clipboard</h1>
          <p className="text-sm text-muted-foreground">Synced clipboard history across devices</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={pushNow} className="gap-1">
            <Upload className="h-3.5 w-3.5" />
            Push Now
          </Button>
          {clipboardHistory.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearClipboardHistory}
              className="gap-2 text-muted-foreground"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Clipboard history */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {clipboardHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Clipboard className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-1 font-medium">No clipboard history</h3>
            <p className="text-sm text-muted-foreground">Copy something to see it synced here.</p>
          </div>
        ) : (
          clipboardHistory.map((item) => (
            <Card key={item.id} className="group hover:border-primary/30 transition-colors">
              <CardContent className="flex items-start gap-3 p-3">
                <div className="mt-0.5">
                  {item.source === 'remote' ? (
                    <ArrowDownLeft className="h-4 w-4 text-primary" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate font-mono">{item.content}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {formatTime(item.timestamp)}
                    </span>
                    {item.source === 'remote' && item.fromDevice && (
                      <Badge variant="outline" className="text-[10px] py-0">
                        from {item.fromDevice.slice(0, 4)}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyToClipboard(item.content)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
