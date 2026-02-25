'use client';

import { useEffect, useRef } from 'react';

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const visible = useRef(false);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;

    let raf: number;

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!visible.current) {
        visible.current = true;
        el.style.opacity = '1';
      }
    };

    const onLeave = () => {
      visible.current = false;
      el.style.opacity = '0';
    };

    const update = () => {
      if (el) {
        el.style.transform = `translate(${pos.current.x - 250}px, ${pos.current.y - 250}px)`;
      }
      raf = requestAnimationFrame(update);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.body.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.body.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed z-30 opacity-0 transition-opacity duration-300"
      style={{
        width: 500,
        height: 500,
        background: 'radial-gradient(circle, rgba(var(--tc-accent-rgb), 0.04) 0%, transparent 70%)',
        willChange: 'transform',
      }}
    />
  );
}
