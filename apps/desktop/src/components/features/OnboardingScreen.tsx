import { useState } from 'react';
import { Zap, ArrowRight, Clipboard, Send, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingScreenProps {
  onComplete: (deviceName: string) => void;
}

const steps = [
  {
    icon: Zap,
    title: 'Welcome to DropZone',
    description:
      'Bridge your phone and computer — clipboard sync, file sharing, and remote file access, all end-to-end encrypted.',
  },
  {
    icon: Clipboard,
    title: 'Instant Clipboard Sync',
    description: 'Copy on one device, paste on another. Works automatically in the background.',
  },
  {
    icon: Send,
    title: 'Fast File Sharing',
    description: 'Send files of any size between devices with chunked transfers and live progress.',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description:
      'Everything is end-to-end encrypted. The server never sees your data — only encrypted blobs.',
  },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');

  const isLastStep = step === steps.length;

  const handleFinish = () => {
    const deviceName = name.trim() || `Desktop ${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem('dropzone_onboarded', 'true');
    onComplete(deviceName);
  };

  if (isLastStep) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background px-8">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Name your device</h1>
          <p className="text-sm text-muted-foreground">
            Give this computer a name so you can recognize it on other devices.
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Laptop"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === 'Enter' && handleFinish()}
            autoFocus
          />
          <Button size="lg" className="w-full gap-2" onClick={handleFinish}>
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background px-8">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{currentStep.title}</h1>
          <p className="text-muted-foreground">{currentStep.description}</p>
        </div>
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <Button size="lg" className="w-full gap-2" onClick={() => setStep(step + 1)}>
          {step < steps.length - 1 ? 'Next' : 'Set Up Device'}
          <ArrowRight className="h-4 w-4" />
        </Button>
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}
