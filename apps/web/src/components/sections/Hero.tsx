import { ArrowRight, Monitor, Smartphone, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="px-6 py-16 md:py-32">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 lg:flex-row lg:items-start lg:justify-between">
        
        {/* Text Content */}
        <div className="flex max-w-2xl flex-col items-start pt-8">
          <h1 className="mb-8 text-6xl font-black leading-[1.1] tracking-tight md:text-8xl">
            Bridge your <br />
            phone and <br />
            computer.
          </h1>
          
          <p className="mb-10 max-w-lg text-xl font-medium leading-relaxed md:text-2xl">
            Real-time clipboard sync and seamless file sharing. Fast, local, and fully encrypted.
          </p>

          <Button size="lg" className="h-16 rounded-xl border-2 border-border bg-foreground text-background shadow-brutal-lg hover-brutal px-8 text-xl font-bold">
            Download DropZone
            <ArrowRight className="ml-3 h-6 w-6" />
          </Button>
        </div>

        {/* Illustration / Graphic */}
        <div className="relative flex w-full max-w-md items-center justify-center p-8 lg:w-1/2 lg:p-0">
          
          {/* Main Abstract Graphic */}
          <div className="relative aspect-square w-full rounded-full border-4 border-border bg-primary shadow-brutal-lg flex items-center justify-center overflow-hidden">
             
             {/* Decorative Background Elements inside circle */}
             <div className="absolute top-10 left-10 h-32 w-32 rounded-full border-4 border-border bg-background" />
             <div className="absolute bottom-20 right-10 h-24 w-24 border-4 border-border bg-success rotate-12" />
             
             {/* Center Graphic: Connected Devices */}
             <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="flex h-32 w-48 items-center justify-center rounded-xl border-4 border-border bg-card shadow-brutal hover-brutal">
                  <Monitor className="h-16 w-16" />
                </div>
                
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-border bg-accent z-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <Link className="h-6 w-6" />
                </div>

                <div className="flex h-24 w-16 items-center justify-center rounded-xl border-4 border-border bg-card shadow-brutal hover-brutal self-end mr-4 -mt-12">
                  <Smartphone className="h-10 w-10" />
                </div>
             </div>

          </div>
          
          {/* Floating Badges outside circle */}
          <div className="absolute -left-6 top-12 flex items-center gap-2 rounded-full border-2 border-border bg-success px-4 py-2 font-bold shadow-brutal-sm rotate-[-10deg]">
            <span className="text-xl">⚡</span> Instant
          </div>

          <div className="absolute -right-4 bottom-24 flex items-center gap-2 rounded-xl border-2 border-border bg-card px-4 py-2 font-bold shadow-brutal rotate-[5deg]">
            <span className="text-xl">🔒</span> Encrypted
          </div>

        </div>

      </div>
    </section>
  );
}
