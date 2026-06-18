const steps = [
  {
    number: '01',
    title: 'Install on your devices',
    description:
      'Download the desktop app or open the web app. Install the mobile app on your phone.',
  },
  {
    number: '02',
    title: 'Pair with a QR code',
    description:
      'Scan a QR code or enter a PIN to securely pair two devices. Keys are exchanged automatically.',
  },
  {
    number: '03',
    title: 'Set your permissions',
    description:
      'Choose exactly what each device can do — clipboard, files, remote access — per direction.',
  },
  {
    number: '04',
    title: 'Stay in sync',
    description:
      'Copy, share, and access files seamlessly. Everything encrypted, nothing stored on servers.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-border px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">How it works</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Get connected in under a minute.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <span className="mb-4 block text-4xl font-bold text-primary/20">{step.number}</span>
              <h3 className="mb-2 font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
