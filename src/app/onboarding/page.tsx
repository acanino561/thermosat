'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, ArrowLeft, Check, Rocket } from 'lucide-react';

const templateOptions = [
  {
    id: 'blank',
    name: 'Blank Model',
    nodes: 0,
    desc: 'Start from scratch with an empty model.',
  },
  {
    id: '1u-cubesat',
    name: '1U CubeSat',
    nodes: 6,
    desc: '±X/±Y/±Z faces, 0.01 m² each, Al 6061.',
  },
  {
    id: '3u-cubesat',
    name: '3U CubeSat',
    nodes: 12,
    desc: 'Body panels + deployable solar panels + internals.',
  },
  {
    id: 'satellite-bus',
    name: 'Simple Satellite Bus',
    nodes: 20,
    desc: 'Bus panels, radiators, solar arrays, internal components.',
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('1u-cubesat');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          projectDescription,
          templateId: selectedTemplate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }
      setRedirectUrl(data.redirectUrl);
      setStep(3);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: 'var(--tc-base)' }}>
      <div className="w-full max-w-xl">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="flex items-center gap-2"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs transition-all duration-300"
                style={{
                  backgroundColor: step >= s ? 'var(--tc-accent)' : 'transparent',
                  color: step >= s ? '#fff' : 'var(--tc-text-muted)',
                  border: step >= s ? 'none' : '1px solid var(--tc-border)',
                }}
              >
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className="w-12 h-px"
                  style={{ backgroundColor: step > s ? 'var(--tc-accent)' : 'var(--tc-border)' }}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Project details */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
              style={{ backgroundColor: 'var(--tc-surface)', border: '1px solid var(--tc-border)' }}
            >
              <h2 className="font-mono font-bold text-xl mb-2" style={{ color: 'var(--tc-text)' }}>
                Create your first project
              </h2>
              <p className="text-sm mb-6 font-sans" style={{ color: 'var(--tc-text-secondary)' }}>
                Give your thermal analysis project a name and optional description.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-mono text-xs" style={{ color: 'var(--tc-text-muted)' }}>
                    PROJECT NAME
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g. LEO CubeSat Thermal Model"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="bg-white/5 font-sans"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc" className="font-mono text-xs" style={{ color: 'var(--tc-text-muted)' }}>
                    DESCRIPTION (optional)
                  </Label>
                  <Input
                    id="desc"
                    placeholder="Brief description of your project"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="bg-white/5 font-sans"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!projectName.trim()}
                  className="font-mono text-xs tracking-[0.1em] gap-2"
                  style={{ backgroundColor: 'var(--tc-accent)', color: '#fff' }}
                >
                  NEXT <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Choose template */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
              style={{ backgroundColor: 'var(--tc-surface)', border: '1px solid var(--tc-border)' }}
            >
              <h2 className="font-mono font-bold text-xl mb-2" style={{ color: 'var(--tc-text)' }}>
                Choose a starting template
              </h2>
              <p className="text-sm mb-6 font-sans" style={{ color: 'var(--tc-text-secondary)' }}>
                Pick a template to bootstrap your thermal model, or start blank.
              </p>

              <div className="space-y-2">
                {templateOptions.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className="w-full text-left p-4 transition-all duration-200"
                    style={{
                      backgroundColor: selectedTemplate === t.id ? 'var(--tc-elevated)' : 'transparent',
                      border: selectedTemplate === t.id ? '1px solid var(--tc-accent)' : '1px solid var(--tc-border)',
                    }}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-sm font-semibold" style={{ color: selectedTemplate === t.id ? 'var(--tc-accent)' : 'var(--tc-text)' }}>
                        {t.name}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: 'var(--tc-text-muted)' }}>
                        {t.nodes} nodes
                      </span>
                    </div>
                    <p className="text-xs mt-1 font-sans" style={{ color: 'var(--tc-text-secondary)' }}>
                      {t.desc}
                    </p>
                  </button>
                ))}
              </div>

              {error && (
                <div className="mt-4 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded">
                  {error}
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="font-mono text-xs tracking-[0.1em] gap-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> BACK
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="font-mono text-xs tracking-[0.1em] gap-2"
                  style={{ backgroundColor: 'var(--tc-accent)', color: '#fff' }}
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> CREATING...</>
                  ) : (
                    <>CREATE PROJECT <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center"
              style={{ backgroundColor: 'var(--tc-surface)', border: '1px solid var(--tc-border)' }}
            >
              <div className="flex justify-center mb-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(var(--tc-accent-rgb), 0.15)' }}
                >
                  <Rocket className="w-7 h-7 text-accent" />
                </div>
              </div>
              <h2 className="font-mono font-bold text-xl mb-2" style={{ color: 'var(--tc-text)' }}>
                Project created!
              </h2>
              <p className="text-sm mb-8 font-sans" style={{ color: 'var(--tc-text-secondary)' }}>
                Your thermal model is ready. Open it in the editor to start adding nodes, conductors, and heat loads.
              </p>
              <a
                href={redirectUrl ?? '/dashboard'}
                className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.15em] px-8 py-4 transition-all duration-200 hover:shadow-[0_0_30px_rgba(var(--tc-accent-rgb),0.3)]"
                style={{ backgroundColor: 'var(--tc-accent)', color: '#fff' }}
              >
                OPEN IN EDITOR <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
