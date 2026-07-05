import { Shield, Key, EyeOff, Server } from 'lucide-react';

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
    <section id="privacy" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        
        <div className="rounded-3xl border-4 border-border bg-[#1a1a1a] p-8 md:p-16 shadow-brutal-lg flex flex-col lg:flex-row items-center gap-12 text-white">
           
           <div className="flex-1">
              <h2 className="mb-6 text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Your data never <br className="hidden md:block"/> leaves your control
              </h2>
              <p className="mb-8 text-lg text-gray-300 font-medium max-w-md leading-relaxed">
                Every byte is encrypted on your device before it leaves. Encryption keys are stored only
                on your devices — never on our servers. We physically cannot read your data.
              </p>
              
              <button className="rounded-xl border-2 border-white bg-success px-8 py-4 text-black font-bold shadow-[4px_4px_0px_0px_white] hover:shadow-[2px_2px_0px_0px_white] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                Read our Privacy Policy
              </button>
           </div>
           
           <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              {points.map((point, i) => {
                const Icon = point.icon;
                return (
                  <div key={i} className="rounded-2xl border-2 border-[#333] bg-[#222] p-6 hover:border-success transition-colors">
                    <Icon className="mb-4 h-8 w-8 text-success" />
                    <h4 className="text-xl font-bold mb-1">{point.title}</h4>
                    <p className="text-sm text-gray-400 font-medium">{point.value}</p>
                  </div>
                );
              })}
           </div>

        </div>

      </div>
    </section>
  );
}
