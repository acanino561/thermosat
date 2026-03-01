'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';

/* ── terminal content data ─────────────────────────────────── */

const PROMPT = '$ verixos run --model cubesat-3u-iss --case hot';

interface Line {
  text: string;
  type: 'output' | 'header' | 'result' | 'footer';
  status?: 'ok' | 'warn';
  hasProgress?: boolean;
}

const OUTPUT_LINES: Line[] = [
  { text: '> Loading thermal model...', type: 'output' },
  { text: '  13 nodes · 26 conductors · 1 orbit', type: 'output' },
  { text: '', type: 'output' },
  { text: '> Computing orbital environment...', type: 'output' },
  { text: '  β = 74.8° · eclipse = 0.0% · period = 95.5 min', type: 'output' },
  { text: '', type: 'output' },
  { text: '> Running transient analysis...', type: 'output' },
  { text: '  Method: Crank-Nicolson · adaptive timestep', type: 'output' },
  { text: '  [PROGRESS]   521ms', type: 'output', hasProgress: true },
  { text: '', type: 'output' },
  { text: '──────────────────────────────────────────────────', type: 'header' },
  { text: 'THERMAL RESULTS — HOT CASE  (LEO / β=74.8°)', type: 'header' },
  { text: '──────────────────────────────────────────────────', type: 'header' },
  { text: '  +X Panel (velocity)      335.6 K    62.5°C   OK', type: 'result', status: 'ok' },
  { text: '  +Y Panel (orbit normal)  337.8 K    64.6°C   OK', type: 'result', status: 'ok' },
  { text: '  +Z Radiator              337.4 K    64.2°C   OK', type: 'result', status: 'ok' },
  { text: '  OBC                      335.1 K    62.0°C   OK', type: 'result', status: 'ok' },
  { text: '  Battery                  334.9 K    61.9°C   OK', type: 'result', status: 'ok' },
  { text: '  RF Transceiver           354.3 K    81.1°C   WARN', type: 'result', status: 'warn' },
  { text: '  Payload                  362.8 K    89.6°C   WARN', type: 'result', status: 'warn' },
  { text: '', type: 'output' },
  { text: '  MARGINS: 11 / 13 nodes within spec', type: 'output' },
  { text: '', type: 'output' },
  { text: '> Explore solutions:', type: 'footer' },
  { text: '  $ verixos analyze --model cubesat-3u-iss --what-if emissivity=0.92', type: 'footer' },
];

/* ── progress bar component ────────────────────────────────── */

function ProgressBar({ active }: { active: boolean }) {
  const width = 36;
  const [fill, setFill] = useState(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(elapsed / 600, 1);
      // ease-out quad
      const eased = 1 - (1 - pct) * (1 - pct);
      setFill(Math.round(eased * width));
      if (pct < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const filled = '█'.repeat(fill);
  const empty = '░'.repeat(width - fill);

  return (
    <span>
      {'  ['}
      <span style={{ color: 'var(--tc-accent)' }}>{filled}</span>
      <span style={{ color: 'var(--tc-text-dim)' }}>{empty}</span>
      {']   521ms'}
    </span>
  );
}

/* ── line renderer ─────────────────────────────────────────── */

function TerminalLine({ line, showProgress }: { line: Line; showProgress?: boolean }) {
  if (line.text === '') return <div className="h-3" />;

  if (line.hasProgress) {
    return (
      <div className="whitespace-pre font-mono text-[13px] leading-relaxed" style={{ color: 'var(--tc-text-secondary)' }}>
        <ProgressBar active={!!showProgress} />
      </div>
    );
  }

  if (line.type === 'header') {
    return (
      <div className="whitespace-pre font-mono text-[13px] leading-relaxed" style={{ color: 'var(--tc-text-muted)' }}>
        {line.text}
      </div>
    );
  }

  if (line.type === 'result') {
    // Split status from the rest
    const statusMatch = line.text.match(/(OK|WARN)$/);
    const statusText = statusMatch?.[1];
    const rest = statusText ? line.text.slice(0, -statusText.length) : line.text;

    return (
      <div
        className="whitespace-pre font-mono text-[13px] leading-relaxed"
        style={{
          color: 'var(--tc-text)',
          ...(line.status === 'warn' ? { textShadow: '0 0 12px rgba(245, 158, 11, 0.25)' } : {}),
        }}
      >
        {rest}
        {statusText && (
          <span style={{ color: statusText === 'OK' ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
            {statusText}
          </span>
        )}
      </div>
    );
  }

  // output / footer — colorize > and $ prefixes
  const text = line.text;
  const leadingMatch = text.match(/^(\s*)([$>])(.*)/);

  if (leadingMatch) {
    const [, ws, symbol, rest] = leadingMatch;
    return (
      <div className="whitespace-pre font-mono text-[13px] leading-relaxed" style={{ color: 'var(--tc-text-secondary)' }}>
        {ws}
        <span style={{ color: 'var(--tc-accent)' }}>{symbol}</span>
        {rest}
      </div>
    );
  }

  return (
    <div className="whitespace-pre font-mono text-[13px] leading-relaxed" style={{ color: 'var(--tc-text-secondary)' }}>
      {text}
    </div>
  );
}

/* ── main component ────────────────────────────────────────── */

export function CliTerminalSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });

  const [typedPrompt, setTypedPrompt] = useState('');
  const [visibleLines, setVisibleLines] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [showCursor, setShowCursor] = useState(false);
  const [animStarted, setAnimStarted] = useState(false);

  const runAnimation = useCallback(async () => {
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    // 1. Type prompt char by char
    for (let i = 1; i <= PROMPT.length; i++) {
      setTypedPrompt(PROMPT.slice(0, i));
      await sleep(40);
    }
    await sleep(200);

    // 2. Output lines one by one
    for (let i = 0; i < OUTPUT_LINES.length; i++) {
      setVisibleLines(i + 1);

      // Trigger progress bar on the progress line
      if (OUTPUT_LINES[i].hasProgress) {
        setShowProgress(true);
        await sleep(700); // wait for progress bar animation
      } else if (OUTPUT_LINES[i].type === 'result') {
        await sleep(50);
      } else {
        await sleep(80);
      }
    }

    // 3. Show blinking cursor
    setShowCursor(true);
  }, []);

  useEffect(() => {
    if (isInView && !animStarted) {
      setAnimStarted(true);
      // small delay after fade-in
      const t = setTimeout(() => { runAnimation(); }, 400);
      return () => clearTimeout(t);
    }
  }, [isInView, animStarted, runAnimation]);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 lg:py-32 px-6 lg:px-10"
      style={{ borderTop: '1px solid var(--tc-border)' }}
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-start gap-12 lg:gap-16">
          {/* Left — heading */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="lg:w-[40%] lg:sticky lg:top-32"
          >
            <div
              className="font-mono text-[10px] tracking-[0.2em] mb-6"
              style={{ color: 'var(--tc-text-muted)' }}
              data-label
            >
              SECTION 05
            </div>

            <h2 className="font-mono font-bold tracking-tight leading-[0.95]">
              <span className="block text-3xl lg:text-4xl" style={{ color: 'var(--tc-text)' }}>
                From orbit to result
              </span>
              <span className="block text-3xl lg:text-4xl text-accent mt-1">
                in one command
              </span>
            </h2>

            <p
              className="mt-6 text-sm leading-relaxed font-sans max-w-md"
              style={{ color: 'var(--tc-text-secondary)' }}
            >
              Define your orbit. Define your model. Verixos handles the physics.
              Available as REST API today — CLI coming Q2 2026.
            </p>
          </motion.div>

          {/* Right — terminal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.3 }}
            className="lg:w-[57%] w-full"
          >
            <div
              className="rounded-lg overflow-hidden"
              style={{
                backgroundColor: '#0a0a0a',
                border: '1px solid var(--tc-border)',
                boxShadow: '0 0 60px rgba(0,0,0,0.5)',
              }}
            >
              {/* Title bar */}
              <div
                className="flex items-center gap-2 px-4 py-2.5"
                style={{ borderBottom: '1px solid var(--tc-border)', backgroundColor: '#0f0f0f' }}
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#febc2e' }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#28c840' }} />
                <span
                  className="ml-3 font-mono text-[11px] tracking-wider"
                  style={{ color: 'var(--tc-text-muted)' }}
                >
                  verixos — terminal
                </span>
              </div>

              {/* Terminal content */}
              <div className="p-4 lg:p-5 overflow-x-auto min-h-[420px]">
                {/* Prompt line */}
                {typedPrompt.length > 0 && (
                  <div className="whitespace-pre font-mono text-[13px] leading-relaxed">
                    <span style={{ color: 'var(--tc-accent)' }}>$</span>
                    <span style={{ color: 'var(--tc-text-secondary)' }}>
                      {typedPrompt.slice(1)}
                    </span>
                    {!showCursor && typedPrompt.length < PROMPT.length && (
                      <span className="cli-cursor" style={{ color: 'var(--tc-accent)' }}>▋</span>
                    )}
                  </div>
                )}

                {/* typed prompt complete but no cursor yet — show static cursor */}
                {typedPrompt.length === PROMPT.length && visibleLines === 0 && (
                  <span />
                )}

                {/* Output lines */}
                {visibleLines > 0 && <div className="h-3" />}
                {OUTPUT_LINES.slice(0, visibleLines).map((line, i) => (
                  <TerminalLine key={i} line={line} showProgress={showProgress} />
                ))}

                {/* Blinking cursor */}
                {showCursor && (
                  <div className="whitespace-pre font-mono text-[13px] leading-relaxed">
                    <span className="cli-cursor-blink" style={{ color: 'var(--tc-accent)' }}>▋</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* CSS for blinking cursor */}
      <style jsx>{`
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .cli-cursor-blink {
          animation: blink 1s step-end infinite;
        }
      `}</style>
    </section>
  );
}
