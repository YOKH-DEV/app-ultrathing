'use client';

import Link from 'next/link';
import { Button } from '@ultrathing/ui';
import { OcrPanel } from '@ultrathing/features';

/** Ruta /ocr en la web. Monta el MISMO componente que el escritorio (surface: both). */
export default function OcrRoute() {
  return (
    <main className="min-h-screen bg-base p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-text">
          Ultra<span className="text-gold">thing</span> · Imagen a texto
        </h1>
        <Link href="/">
          <Button variant="ghost" size="sm">
            ← Panel
          </Button>
        </Link>
      </header>
      <OcrPanel />
    </main>
  );
}
