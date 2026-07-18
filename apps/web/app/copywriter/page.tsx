'use client';

import Link from 'next/link';
import { Button } from '@ultrathing/ui';
import { CopywriterPanel } from '@ultrathing/features';

/** Ruta /copywriter en la web. Monta el MISMO componente que el escritorio (surface: both). */
export default function CopywriterRoute() {
  return (
    <main className="min-h-screen bg-base p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-text">
          Ultra<span className="text-gold">thing</span> · Copywriter
        </h1>
        <Link href="/">
          <Button variant="ghost" size="sm">
            ← Panel
          </Button>
        </Link>
      </header>
      <CopywriterPanel />
    </main>
  );
}
