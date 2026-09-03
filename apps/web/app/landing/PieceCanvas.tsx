'use client';

import { useEffect, useRef, useState } from 'react';

type Layer = 'headline' | 'offer' | 'cta' | 'stamp';

const DEFAULTS = {
  headline: 'CAFÉ DE ESPECIALIDAD',
  offer: '50% OFF · esta semana',
  cta: 'Reservá mesa',
  stamp: 'pieza viva',
};

/**
 * Lienzo interactivo del hero: una pieza que se puede tocar.
 * El visitante edita el titular, cambia capas y mueve la luz — eso ES UltraThing.
 */
export function PieceCanvas() {
  const stageRef = useRef<HTMLDivElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);
  const [layer, setLayer] = useState<Layer>('headline');
  const [copy, setCopy] = useState(DEFAULTS);
  const [light, setLight] = useState({ x: 72, y: 28 });

  useEffect(() => {
    const canvas = dustRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const grains = Array.from({ length: reduce ? 0 : 48 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.4,
      s: 0.08 + Math.random() * 0.22,
      a: 0.12 + Math.random() * 0.35,
    }));

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      for (const g of grains) {
        g.y -= g.s / height;
        if (g.y < 0) g.y = 1;
        ctx.fillStyle = `rgba(245, 208, 111, ${g.a})`;
        ctx.beginPath();
        ctx.arc(g.x * width, g.y * height, g.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    const fit = () => {
      const box = canvas.parentElement?.getBoundingClientRect();
      if (!box) return;
      canvas.width = box.width;
      canvas.height = box.height;
    };
    fit();
    window.addEventListener('resize', fit);
    if (!reduce) raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
    };
  }, []);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return;
    setLight({
      x: ((e.clientX - box.left) / box.width) * 100,
      y: ((e.clientY - box.top) / box.height) * 100,
    });
  }

  const layers: { id: Layer; label: string }[] = [
    { id: 'headline', label: 'Titular' },
    { id: 'offer', label: 'Oferta' },
    { id: 'cta', label: 'Botón' },
    { id: 'stamp', label: 'Sello' },
  ];

  return (
    <div className="ut-piece flex flex-col gap-3">
      <div
        ref={stageRef}
        onMouseMove={onMove}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-[22px] border border-[var(--glass-border)] bg-[#111113] shadow-[var(--glow-soft)]"
        style={{
          background: `
            radial-gradient(420px 280px at ${light.x}% ${light.y}%, rgba(229,185,78,0.28), transparent 58%),
            radial-gradient(900px 500px at 10% 110%, rgba(229,185,78,0.08), transparent 50%),
            #111113
          `,
        }}
      >
        <canvas ref={dustRef} className="pointer-events-none absolute inset-0" aria-hidden />

        <button
          type="button"
          onClick={() => setLayer('stamp')}
          className={`absolute right-5 top-5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all ${
            layer === 'stamp'
              ? 'bg-gold text-[var(--on-gold)]'
              : 'bg-black/40 text-gold ring-1 ring-gold/40'
          }`}
        >
          {copy.stamp}
        </button>

        <div className="absolute inset-x-6 bottom-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setLayer('headline')}
            className={`text-left font-display text-[clamp(1.6rem,4vw,2.35rem)] font-semibold leading-[0.95] tracking-[-0.03em] ${
              layer === 'headline' ? 'text-gold' : 'text-[var(--text)]'
            }`}
          >
            {copy.headline}
          </button>
          <button
            type="button"
            onClick={() => setLayer('offer')}
            className={`w-fit text-left text-sm tracking-wide ${
              layer === 'offer' ? 'text-gold' : 'text-[var(--text-muted)]'
            }`}
          >
            {copy.offer}
          </button>
          <button
            type="button"
            onClick={() => setLayer('cta')}
            className={`w-fit rounded-full px-5 py-2 text-sm font-semibold transition-transform ${
              layer === 'cta'
                ? 'scale-105 bg-gold text-[var(--on-gold)]'
                : 'bg-[var(--gold)] text-[var(--on-gold)]'
            }`}
          >
            {copy.cta}
          </button>
        </div>

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.45)',
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {layers.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setLayer(item.id)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              layer === item.id
                ? 'bg-gold text-[var(--on-gold)]'
                : 'text-[var(--text-muted)] ring-1 ring-[var(--glass-border)] hover:text-gold'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="sr-only">Editar {layer}</span>
        <input
          value={copy[layer]}
          onChange={(e) => setCopy((c) => ({ ...c, [layer]: e.target.value }))}
          className="h-10 w-full rounded-lg border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 text-sm text-text outline-none focus:border-gold"
          placeholder="Escribí sobre la pieza"
        />
      </label>
      <p className="text-xs text-[var(--text-faint)]">
        Tocá una capa y reescribila. Así se siente el Studio: la pieza es el documento.
      </p>
    </div>
  );
}
