import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-border bg-background py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-border bg-card shadow-brutal-sm overflow-hidden">
            <img src="/favicon.png" alt="DropZone Logo" className="h-6 w-6 object-contain" />
          </div>
          <span className="text-2xl font-black tracking-tight">DropZone</span>
        </div>

        {/* Links */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-base font-bold hover:underline underline-offset-4"
          >
            Services
          </a>
          <a
            href="#how"
            className="text-base font-bold hover:underline underline-offset-4"
          >
            Working Process
          </a>
          <a
            href="#privacy"
            className="text-base font-bold hover:underline underline-offset-4"
          >
            Privacy
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button 
            className="hidden sm:inline-flex rounded-xl border-2 border-border bg-primary text-primary-foreground shadow-brutal hover-brutal px-6 py-5 font-bold text-base"
          >
            Get Started
          </Button>
        </div>
        
      </div>
    </nav>
  );
}
