import { ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Install on your devices',
    description:
      'Download the desktop app or open the web app. Install the mobile app on your phone. No sign-up required, just open and start.',
  },
  {
    number: '02',
    title: 'Pair with a QR code',
    description:
      'Scan a QR code or enter a PIN to securely pair two devices. Keys are exchanged automatically over our secure relay or local network.',
  },
  {
    number: '03',
    title: 'Set your permissions',
    description:
      'Choose exactly what each device can do — clipboard, files, remote access — per direction. Granular control keeps your data safe.',
  },
  {
    number: '04',
    title: 'Stay in sync',
    description:
      'Copy, share, and access files seamlessly. Everything is encrypted end-to-end, and nothing is ever permanently stored on our servers.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        
        {/* Section Header */}
        <div className="mb-20 flex flex-col items-start gap-8 md:flex-row md:items-center">
          <h2 className="bg-success px-4 py-2 text-4xl font-black shadow-brutal-sm border-2 border-border inline-block rounded-xl text-foreground">
            Working Process
          </h2>
          <p className="max-w-xl text-lg font-medium text-foreground">
            Get connected in under a minute. Our streamlined process ensures your devices are linked securely and instantly.
          </p>
        </div>

        {/* Steps List */}
        <div className="flex flex-col gap-6">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className={`flex flex-col gap-6 rounded-3xl border-4 border-border p-8 shadow-brutal hover-brutal ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}`}
            >
              <div className="flex items-center justify-between border-b-2 border-border/30 pb-6">
                <div className="flex items-center gap-6">
                  <span className="text-5xl font-black">{step.number}</span>
                  <h3 className="text-2xl md:text-3xl font-bold">{step.title}</h3>
                </div>
                <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-background shadow-brutal-sm">
                  <ArrowRight className="h-6 w-6 text-foreground" />
                </div>
              </div>
              <div className="pt-2">
                <p className="text-lg font-medium opacity-90 max-w-3xl leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
