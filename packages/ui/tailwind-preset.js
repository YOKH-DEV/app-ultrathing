/** Preset compartido: mapea los tokens CSS a utilidades Tailwind. */
module.exports = {
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        hover: 'var(--bg-hover)',
        gold: { DEFAULT: 'var(--gold)', bright: 'var(--gold-bright)', deep: 'var(--gold-deep)' },
        text: { DEFAULT: 'var(--text)', muted: 'var(--text-muted)', faint: 'var(--text-faint)' },
        line: { DEFAULT: 'var(--border)', strong: 'var(--border-strong)' },
      },
      fontFamily: { display: 'var(--font-display)', sans: 'var(--font-sans)' },
      borderRadius: { DEFAULT: 'var(--radius)' },
      boxShadow: { glow: '0 0 0 1px var(--gold-deep), 0 0 24px var(--gold-glow)' },
    },
  },
};
