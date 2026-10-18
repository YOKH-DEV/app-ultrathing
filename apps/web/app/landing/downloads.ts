/** Instaladores del escritorio Tauri. Los archivos salen de GitHub Releases
 * (`pnpm tauri build` + upload). Version alineada a tauri.conf.json. */
export const DESKTOP_VERSION = '0.1.0';

const RELEASES = 'https://github.com/YOKH-DEV/app-ultrathing/releases/latest';
const asset = (file: string) => `${RELEASES}/download/${file}`;

export type DesktopOs = 'windows' | 'mac' | 'linux';

export interface DesktopBuild {
  id: DesktopOs;
  name: string;
  fileLabel: string;
  href: string;
  hint: string;
  extra?: { fileLabel: string; href: string };
}

export const DESKTOP_BUILDS: Record<DesktopOs, DesktopBuild> = {
  windows: {
    id: 'windows',
    name: 'Windows',
    fileLabel: 'Instalador .exe',
    href: asset(`Ultrathing_${DESKTOP_VERSION}_x64-setup.exe`),
    hint: 'Windows 10 u 11 · 64 bit',
  },
  mac: {
    id: 'mac',
    name: 'macOS',
    fileLabel: 'Disco .dmg',
    href: asset(`Ultrathing_${DESKTOP_VERSION}_aarch64.dmg`),
    hint: 'Apple Silicon. Intel: el .dmg x64 en la misma versión.',
    extra: {
      fileLabel: 'Intel .dmg',
      href: asset(`Ultrathing_${DESKTOP_VERSION}_x64.dmg`),
    },
  },
  linux: {
    id: 'linux',
    name: 'Linux',
    fileLabel: 'AppImage',
    href: asset(`Ultrathing_${DESKTOP_VERSION}_amd64.AppImage`),
    hint: 'Doble clic. No instala nada en el sistema.',
    extra: {
      fileLabel: 'Paquete .deb',
      href: asset(`Ultrathing_${DESKTOP_VERSION}_amd64.deb`),
    },
  },
};

export const RELEASES_PAGE = RELEASES;

export function detectDesktopOs(): DesktopOs {
  if (typeof navigator === 'undefined') return 'linux';
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return 'windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'mac';
  return 'linux';
}
