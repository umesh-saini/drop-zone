import { Clipboard, Send, FolderOpen, Wifi, Lock, QrCode } from 'lucide-react';

const features = [
  {
    icon: Clipboard,
    title: 'Real-Time Clipboard Sync',
    description: 'Copy on one device, paste on another. Your clipboard follows you across every device, instantly.',
    bgColor: 'bg-primary',
    textColor: 'text-primary-foreground',
    iconColor: 'text-primary-foreground',
  },
  {
    icon: Send,
    title: 'File Sharing',
    description: 'Send files of any size between devices with chunked, resumable transfers and live progress.',
    bgColor: 'bg-card',
    textColor: 'text-foreground',
    iconColor: 'text-primary',
  },
  {
    icon: FolderOpen,
    title: 'Remote File Access',
    description: 'Browse and download files from a paired device remotely, with sandboxed folder permissions.',
    bgColor: 'bg-foreground',
    textColor: 'text-background',
    iconColor: 'text-background',
  },
  {
    icon: Wifi,
    title: 'Local & Remote Modes',
    description: 'Lightning-fast LAN connections when nearby, seamless server relay when apart. Auto-switching.',
    bgColor: 'bg-card',
    textColor: 'text-foreground',
    iconColor: 'text-primary',
  },
  {
    icon: Lock,
    title: 'End-to-End Encrypted',
    description: 'X25519 key exchange and AES-256-GCM. The server only sees encrypted blobs — never your data.',
    bgColor: 'bg-primary',
    textColor: 'text-primary-foreground',
    iconColor: 'text-primary-foreground',
  },
  {
    icon: QrCode,
    title: 'Simple Pairing',
    description: 'Scan a QR code or enter a 6-digit PIN. Pair once, stay connected. Granular permission control.',
    bgColor: 'bg-foreground',
    textColor: 'text-background',
    iconColor: 'text-background',
  },
];

export function Features() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        
        {/* Section Header */}
        <div className="mb-20 flex flex-col items-start gap-8 md:flex-row md:items-center">
          <h2 className="bg-primary px-4 py-2 text-4xl font-black shadow-brutal-sm border-2 border-border inline-block rounded-xl">
            Services
          </h2>
          <p className="max-w-xl text-lg font-medium text-foreground">
            A complete bridge between your devices, built privacy-first from the ground up to ensure seamless, secure transfers.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-8 md:grid-cols-2">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index} 
                className={`relative flex flex-col justify-between rounded-3xl border-4 border-border p-8 md:p-12 shadow-brutal-lg hover-brutal ${feature.bgColor}`}
              >
                <div>
                  <div className={`mb-6 flex items-center justify-between`}>
                     <h3 className={`text-2xl md:text-3xl font-black ${feature.textColor} max-w-[200px] leading-tight`}>
                       {feature.title}
                     </h3>
                     <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-background shadow-brutal-sm`}>
                       <Icon className="h-6 w-6 text-foreground" />
                     </div>
                  </div>
                  <p className={`text-lg font-medium ${feature.textColor} opacity-90`}>
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
      </div>
    </section>
  );
}
