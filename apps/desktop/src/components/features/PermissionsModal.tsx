import { useState, useEffect } from 'react';
import { Clipboard, Send, FolderOpen, FilePenLine, Terminal, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { dropzone } from '@/services/DropZoneService';

/** UI permission groups mapped to underlying permission types (bidirectional) */
const PERMISSION_GROUPS = [
  {
    key: 'clipboard',
    label: 'Clipboard Sync',
    description: 'Share copied text between devices',
    icon: Clipboard,
    types: ['clipboard_read', 'clipboard_write'],
  },
  {
    key: 'files',
    label: 'File Sharing',
    description: 'Send and receive files',
    icon: Send,
    types: ['file_send', 'file_receive'],
  },
  {
    key: 'browse',
    label: 'Remote File Browsing',
    description: 'Let this device browse your shared files',
    icon: FolderOpen,
    types: ['file_access_read'],
  },
  {
    key: 'edit',
    label: 'Remote File Editing',
    description: 'Let this device edit or delete your files',
    icon: FilePenLine,
    types: ['file_access_write'],
  },
  {
    key: 'terminal',
    label: 'Remote Terminal',
    description: 'Let this device execute commands via terminal',
    icon: Terminal,
    types: ['terminal_access'],
  },
] as const;

interface PermissionsModalProps {
  open: boolean;
  onClose: () => void;
  pairingId: string | null;
  deviceName: string;
}

export function PermissionsModal({ open, onClose, pairingId, deviceName }: PermissionsModalProps) {
  const [loading, setLoading] = useState(true);
  const [granted, setGranted] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !pairingId) return;
    setLoading(true);
    dropzone.api
      .getPermissions(pairingId)
      .then((res) => {
        if (res.success && res.data) {
          const map: Record<string, boolean> = {};
          for (const p of res.data) map[p.permissionType] = p.granted;
          setGranted(map);
        }
      })
      .finally(() => setLoading(false));
  }, [open, pairingId]);

  const isGroupOn = (types: readonly string[]) => types.every((t) => granted[t]);

  const toggleGroup = async (group: (typeof PERMISSION_GROUPS)[number]) => {
    if (!pairingId) return;
    const newValue = !isGroupOn(group.types);
    setSaving(group.key);
    try {
      for (const type of group.types) {
        const res = await dropzone.api.updatePermission(pairingId, type, newValue);
        if (!res.success) throw new Error(res.error || 'Update failed');
      }
      setGranted((prev) => {
        const next = { ...prev };
        for (const t of group.types) next[t] = newValue;
        return next;
      });
      // Refresh the service's permission cache
      await dropzone.refreshPermissions(pairingId);
    } catch (err: any) {
      toast.error('Failed to update permission', { description: err.message });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permissions</DialogTitle>
          <DialogDescription>Control what {deviceName} can do with this device.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-1 py-2">
            {PERMISSION_GROUPS.map((group) => {
              const Icon = group.icon;
              const on = isGroupOn(group.types);
              return (
                <div
                  key={group.key}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-secondary/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{group.label}</p>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  {saving === group.key ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch checked={on} onCheckedChange={() => toggleGroup(group)} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
