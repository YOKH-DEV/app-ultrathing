import './globals.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';

export const metadata = {
  title: 'UltraThing — el estudio donde se termina la pieza',
  description:
    'Diseño, copy, voz, OCR, descargas y leads en una sola mesa. El trabajo pesado corre en tu computadora.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        {/*
          THESIS: UltraThing is the finishing suite for a marketing piece, not a SaaS icon grid.
          OWN-WORLD: black suite #0A0A0B, gold highlight #E5B94E, liquid glass, Space Grotesk + Inter (product continuity).
          STORY: visitor understands the studio, believes the work stays local, creates an account.
          FIRST VIEWPORT: sticky glass nav; left thesis + CTAs; right interactive flyer the visitor can rewrite.
          FORM: finishing-suite mosaic (task-engine grammar, gold/black of the house). Seed: unattended-A.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
        */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
