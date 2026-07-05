export function Footer() {
  return (
    <footer className="px-6 pb-6">
      <div className="mx-auto max-w-6xl rounded-[2rem] border-4 border-border bg-foreground text-background p-8 md:p-12 shadow-brutal-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b-2 border-background/20 pb-8 mb-8">
          
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-background bg-card overflow-hidden">
              <img src="/favicon.png" alt="DropZone Logo" className="h-8 w-8 object-contain" />
            </div>
            <span className="text-3xl font-black">DropZone</span>
          </div>

          <div className="flex gap-6">
            <a href="#features" className="text-base font-bold hover:underline underline-offset-4">Services</a>
            <a href="#how" className="text-base font-bold hover:underline underline-offset-4">Process</a>
            <a href="#privacy" className="text-base font-bold hover:underline underline-offset-4">Privacy</a>
          </div>

        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium opacity-80">
          <p>Privacy-first device bridging. Built with end-to-end encryption.</p>
          <p>© {new Date().getFullYear()} DropZone. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
