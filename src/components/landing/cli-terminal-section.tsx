'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';

/* ── terminal content ──────────────────────────────────────── */

const PROMPT = '$ verixos run --model cubesat-3u-iss --case hot';

interface Line {
  text: string;
  type: 'output' | 'separator' | 'header' | 'result' | 'margin' | 'explore';
  status?: 'ok' | 'warn';
  isProgress?: boolean;
}

const OUTPUT_LINES: Line[] = [
  { text: '> Loading thermal model...', type: 'output' },
  { text: '  13 nodes · 26 conductors · 1 orbit', type: 'output' },
  { text: '', type: 'output' },
  { text: '> Computing orbital environment...', type: 'output' },
  { text: '  β = 74.8° · eclipse = 0.0% · period = 95.5 min', type: 'output' },
  { text: '', type: 'output' },
  { text: '> Running transient analysis...', type: 'output' },
  { text: '  Crank-Nicolson · adaptive timestep', type: 'output' },
  { text: '', type: 'output', isProgress: true },
  { text: '', type: 'output' },
  { text: '─────────────────────────────────────────────────', type: 'separator' },
  { text: 'THERMAL RESULTS  —  HOT CASE  (LEO / β=74.8°)', type: 'header' },
  { text: '─────────────────────────────────────────────────', type: 'separator' },
  { text: '  +X Panel (velocity)      335.6 K   62.5°C   OK', type: 'result', status: 'ok' },
  { text: '  +Y Panel (orbit normal)  337.8 K   64.6°C   OK', type: 'result', status: 'ok' },
  { text: '  +Z Radiator              337.4 K   64.2°C   OK', type: 'result', status: 'ok' },
  { text: '  OBC                      335.1 K   62.0°C   OK', type: 'result', status: 'ok' },
  { text: '  Battery                  334.9 K   61.9°C   OK', type: 'result', status: 'ok' },
  { text: '  RF Transceiver           354.3 K   81.1°C   WARN', type: 'result', status: 'warn' },
  { text: '  Payload                  362.8 K   89.6°C   WARN', type: 'result', status: 'warn' },
  { text: '', type: 'output' },
  { text: '  MARGINS: 11 / 13 nodes within spec', type: 'margin' },
  { text: '', type: 'output' },
  { text: '> Explore solutions:', type: 'explore' },
  { text: '  $ verixos analyze --what-if emissivity=0.92', type: 'explore' },
];

/* ── progress bar ──────────────────────────────────────────── */

function ProgressBar({ active }: { active: boolean }) {
  const total = 21;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) return;
    let current = 0;
    const interval = setInterval(() => {
      current += 100 / 30; // ~30 steps over 600ms at 20ms intervals
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
      }
      setProgress(current);
    }, 20);
    return () => clearInterval(interval);
  }, [active]);

  const filled = Math.round((progress / 100) * total);
  const bar = '█'.repeat(filled) + ' '.repeat(total - filled);
  const pct = Math.round(progress);

  return (
    <div className="whitespace-pre font-mono text-[13px]" style={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.72)' }}>
      {'  ['}
      <span style={{ color: 'var(--tc-accent)' }}>{bar}</span>
      {'] '}
      {pct}%{pct === 100 ? '  521ms' : ''}
    </div>
  );
}

/* ── line renderer ─────────────────────────────────────────── */

function TerminalLine({ line }: { line: Line }) {
  if (line.text === '' && !line.isProgress) return <div style={{ height: '0.6em' }} />;

  if (line.type === 'separator') {
    return (
      <div className="whitespace-pre font-mono text-[13px]" style={{ lineHeight: 1.6, color: 'var(--tc-text-muted)', opacity: 0.4 }}>
        {line.text}
      </div>
    );
  }

  if (line.type === 'header') {
    return (
      <div className="whitespace-pre font-mono text-[13px]" style={{ lineHeight: 1.6, color: 'var(--tc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {line.text}
      </div>
    );
  }

  if (line.type === 'result') {
    const statusMatch = line.text.match(/(OK|WARN)$/);
    const statusText = statusMatch?.[1];
    const rest = statusText ? line.text.slice(0, -statusText.length) : line.text;

    return (
      <div className="whitespace-pre font-mono text-[13px]" style={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.72)' }}>
        {rest}
        {statusText && (
          <span style={{ color: statusText === 'OK' ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
            {statusText}
          </span>
        )}
      </div>
    );
  }

  if (line.type === 'margin') {
    return (
      <div className="whitespace-pre font-mono text-[13px]" style={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.72)' }}>
        {line.text}
      </div>
    );
  }

  // output / explore — colorize > and $ prefixes
  const text = line.text;
  const leadingMatch = text.match(/^(\s*)([$>])(.*)/);

  if (leadingMatch) {
    const [, ws, symbol, rest] = leadingMatch;
    return (
      <div className="whitespace-pre font-mono text-[13px]" style={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.72)' }}>
        {ws}
        <span style={{ color: 'var(--tc-accent)' }}>{symbol}</span>
        {rest}
      </div>
    );
  }

  return (
    <div className="whitespace-pre font-mono text-[13px]" style={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.72)' }}>
      {text}
    </div>
  );
}

/* ── main component ────────────────────────────────────────── */

export function CliTerminalSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  // amount: 0.1 = trigger as soon as 10% of the section is visible; no negative margin
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

  const [started, setStarted] = useState(false);
  const startedRef = useRef(false); // mirrors `started` — safe to read in timeouts
  const [typedPrompt, setTypedPrompt] = useState('');
  const [visibleLines, setVisibleLines] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [showCursor, setShowCursor] = useState(false);

  const runAnimation = useCallback(async () => {
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    // 1. Type prompt char by char (35ms per char)
    for (let i = 1; i <= PROMPT.length; i++) {
      setTypedPrompt(PROMPT.slice(0, i));
      await sleep(35);
    }
    await sleep(200);

    // 2. Output lines one by one (70ms apart)
    for (let i = 0; i < OUTPUT_LINES.length; i++) {
      setVisibleLines(i + 1);

      if (OUTPUT_LINES[i].isProgress) {
        setShowProgress(true);
        await sleep(700);
      } else {
        await sleep(70);
      }
    }

    // 3. Blinking cursor
    setShowCursor(true);
  }, []);

  useEffect(() => {
    if (isInView && !started) {
      startedRef.current = true;
      setStarted(true);
      runAnimation();
    }
  }, [isInView, started, runAnimation]);

  // Fallback: if IntersectionObserver never fires (e.g. SSR mismatch, hidden overflow),
  // start the animation 800ms after mount regardless.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!startedRef.current) {
        startedRef.current = true;
        setStarted(true);
        runAnimation();
      }
    }, 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 lg:py-32 px-6 lg:px-10"
      style={{ borderTop: '1px solid var(--tc-border)' }}
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-start gap-12 lg:gap-16">
          {/* Left column — 40% */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="lg:w-[40%] lg:sticky lg:top-32"
          >
            <div
              className="font-mono text-[10px] tracking-[0.2em] mb-6"
              style={{ color: 'var(--tc-text-muted)' }}
              data-label="true"
            >
              SECTION 05
            </div>

            <h2 className="font-mono font-bold tracking-tight leading-[0.95]">
              <span className="block text-3xl lg:text-4xl" style={{ color: 'var(--tc-text)' }}>
                From orbit
              </span>
              <span className="block text-3xl lg:text-4xl" style={{ color: 'var(--tc-text)' }}>
                to result
              </span>
              <span className="block text-3xl lg:text-4xl mt-1" style={{ color: 'var(--tc-accent)' }}>
                in one command
              </span>
            </h2>

            <p
              className="mt-6 text-sm leading-relaxed font-sans max-w-md"
              style={{ color: 'rgba(255,255,255,0.72)' }}
            >
              Define your orbit. Define your model. Verixos handles the physics.
            </p>

            <small
              className="block mt-3 text-xs font-sans"
              style={{ color: 'var(--tc-text-muted)' }}
            >
              REST API available today. CLI shipping Q2 2026.
            </small>
          </motion.div>

          {/* Right column — 55% terminal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:w-[55%] w-full"
          >
            <div
              className="overflow-hidden"
              style={{
                border: '1px solid var(--tc-border)',
                borderRadius: 8,
                boxShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 80px color-mix(in srgb, var(--tc-accent) 5%, transparent)',
              }}
            >
              {/* Top bar */}
              <div
                className="flex items-center px-4"
                style={{
                  backgroundColor: '#1a1a1a',
                  height: 32,
                  gap: 6,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#eab308' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#22c55e' }} />
                <span
                  className="font-mono"
                  style={{ color: 'var(--tc-text-muted)', fontSize: 11, marginLeft: 8 }}
                >
                  verixos — terminal
                </span>
              </div>

              {/* Content area */}
              <div
                style={{
                  backgroundColor: '#0a0a0a',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  lineHeight: 1.6,
                  padding: 20,
                  minHeight: 400,
                }}
                className="overflow-x-auto"
              >
                {/* Prompt line */}
                {typedPrompt.length > 0 && (
                  <div className="whitespace-pre font-mono text-[13px]" style={{ lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--tc-accent)' }}>$</span>
                    <span style={{ color: 'rgba(255,255,255,0.72)' }}>
                      {typedPrompt.slice(1)}
                    </span>
                    {!showCursor && typedPrompt.length < PROMPT.length && (
                      <span style={{ color: 'var(--tc-accent)', animation: 'blink 1s step-end infinite' }}>_</span>
                    )}
                  </div>
                )}

                {/* Output lines */}
                {visibleLines > 0 && <div style={{ height: '0.6em' }} />}
                {OUTPUT_LINES.slice(0, visibleLines).map((line, i) =>
                  line.isProgress ? (
                    <ProgressBar key={i} active={showProgress} />
                  ) : (
                    <TerminalLine key={i} line={line} />
                  )
                )}

                {/* Blinking cursor */}
                {showCursor && (
                  <div className="whitespace-pre font-mono text-[13px]" style={{ lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--tc-accent)', animation: 'blink 1s step-end infinite' }}>_</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </section>
  );
}
