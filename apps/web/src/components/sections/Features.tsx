import { Clipboard, Send, FolderOpen, Wifi, Lock, QrCode } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Clipboard,
    title: 'Real-Time Clipboard Sync',
    description:
      'Copy on one device, paste on another. Your clipboard follows you across every device, instantly.',
  },
  {
    icon: Send,
    title: 'File Sharing',
    description:
      'Send files of any size between devices with chunked, resumable transfers and live progress.',
  },
  {
    icon: FolderOpen,
    title: 'Remote File Access',
    description:
      'Browse and download files from a paired device remotely, with sandboxed folder permissions.',
  },
  {
    icon: Wifi,
    title: 'Local & Remote Modes',
    description:
      'Lightning-fast LAN connections when nearby, seamless server relay when apart. Auto-switching.',
  },
  {
    icon: Lock,
    title: 'End-to-End Encrypted',
    description:
      'X25519 key exchange and AES-256-GCM. The server only sees encrypted blobs — never your data.',
  },
  {
    icon: QrCode,
    title: 'Simple Pairing',
    description:
      'Scan a QR code or enter a 6-digit PIN. Pair once, stay connected. Granular permission control.',
  },
];

export function Features() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Everything you need to stay in sync
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            A complete bridge between your devices, built privacy-first from the ground up.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="transition-colors hover:border-primary/30">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
