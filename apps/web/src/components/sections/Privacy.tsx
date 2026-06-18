import { Shield, Key, EyeOff, Server } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const points = [
  {
    icon: Key,
    title: 'X25519 Key Exchange',
    value: 'Per-device keys',
  },
  {
    icon: Shield,
    title: 'AES-256-GCM',
    value: 'Military-grade',
  },
  {
    icon: Server,
    title: 'Zero-Knowledge Server',
    value: 'Encrypted blobs only',
  },
  {
    icon: EyeOff,
    title: 'No Data Stored',
    value: 'Nothing to leak',
  },
];

export function Privacy() {
  return (
    <section id="privacy" className="border-t border-border px-6 py-24">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
          <Shield className="h-7 w-7 text-success" />
        </div>
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">Your data never leaves your control</h2>
        <p className="mx-auto mb-12 max-w-2xl text-muted-foreground">
          Every byte is encrypted on your device before it leaves. Encryption keys are stored only
          on your devices — never on our servers. We physically cannot read your data.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((point) => {
            const Icon = point.icon;
            return (
              <Card key={point.title}>
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <Icon className="mb-3 h-6 w-6 text-success" />
                  <p className="mb-1 text-sm font-medium">{point.title}</p>
                  <p className="text-xs text-muted-foreground">{point.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
