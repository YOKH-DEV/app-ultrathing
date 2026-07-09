import './globals.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';

export const metadata = { title: 'Ultrathing', description: 'Centro de comando de marketing' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
