import { ArrowRight, Lock, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-32">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm">
          <Lock className="h-3.5 w-3.5 text-success" />
          <span className="text-muted-foreground">End-to-end encrypted • Privacy first</span>
        </div>

        <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
          Bridge your phone and
          <br />
          computer, <span className="text-primary">instantly</span>
        </h1>

        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
          Real-time clipboard sync, seamless file sharing, and remote file access across all your
          devices. Works on Windows, Mac, Linux, Android, and iOS.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="gap-2">
            Download DropZone
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline">
            Open Web App
          </Button>
        </div>

        {/* Device illustration */}
        <div className="mt-16 flex items-center justify-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card">
            <Monitor className="h-8 w-8 text-foreground" />
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-card">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>
    </section>
  );
}
