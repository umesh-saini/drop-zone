import { Zap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold">DropZone</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Privacy-first device bridging. Built with end-to-end encryption.
        </p>
        <p className="text-sm text-muted-foreground">© 2026 DropZone</p>
      </div>
    </footer>
  );
}
