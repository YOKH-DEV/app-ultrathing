'use client';

import { useEffect, useState, type ReactElement } from 'react';
import {
  DESKTOP_BUILDS,
  DESKTOP_VERSION,
  RELEASES_PAGE,
  detectDesktopOs,
  type DesktopOs,
} from './downloads';

function WindowsMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5.5 11 4.3v7.2H3zm8.8-.1 9.2-1.4v8.7h-9.2zM3 13.5h8v7.3L3 19.6zm8.8.1h9.2V22L11.8 20.6z" />
    </svg>
  );
}

function MacMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.7 12.3c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8s-1.6-.7-2.7-.7c-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.3 1 8.3.7 1 1.5 2.1 2.6 2 1 .1 1.4-.7 2.7-.7s1.6.7 2.7.6c1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.2s-2.2-.8-2.2-3.4zM14.8 6.2c.6-.7 1-1.7.9-2.7-1 .1-2.1.7-2.7 1.5-.6.7-1.1 1.7-.9 2.6 1 .1 2-.6 2.7-1.4z" />
    </svg>
  );
}

function LinuxMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.1 2.2c-.9 0-2.2 2.3-2.2 5.1 0 1.2.2 2.1.2 2.1S8.4 8.6 7.4 10.3c-1.3 2.2-.9 5.3.7 6.8.4.4.6 1.1.4 1.7-.3.8-1.1 1.1-1.8 1.3-1.3.3-1.6 1.3-.7 1.8 1.3.7 3.5.4 4.6-.4.5-.4 1.2-.4 1.7 0 1.1.8 3.3 1.1 4.6.4.9-.5.6-1.5-.7-1.8-.7-.2-1.5-.5-1.8-1.3-.2-.6 0-1.3.4-1.7 1.6-1.5 2-4.6.7-6.8-1-1.7-2.7-1-2.7-1s.2-.9.2-2.1c0-2.8-1.3-5.1-2.2-5.1z" />
    </svg>
  );
}

const MARK: Record<DesktopOs, () => ReactElement> = {
  windows: WindowsMark,
  mac: MacMark,
  linux: LinuxMark,
};

/**
 * Bajada del escritorio. El sistema detectado manda; Windows / Linux / macOS
 * quedan a un clic. Los archivos viven en GitHub Releases.
 */
export function DownloadSection() {
  const [os, setOs] = useState<DesktopOs>('linux');

  useEffect(() => {
    setOs(detectDesktopOs());
  }, []);

  const build = DESKTOP_BUILDS[os];
  const Mark = MARK[os];

  return (
    <section id="download" className="ut-dl">
      <div className="ut-dl-inner">
        <div className="ut-dl-copy">
          <h2 className="ut-dl-title">Download</h2>
          <p className="ut-dl-lead">
            No hay plan que activar. Instalalo gratis y dejá el estudio en tu escritorio: Windows,
            Linux o macOS. El motor corre en tu PC.
          </p>
        </div>

        <div className="ut-dl-picker" role="tablist" aria-label="Sistema">
          {(Object.values(DESKTOP_BUILDS) as (typeof DESKTOP_BUILDS.windows)[]).map((b) => {
            const Icon = MARK[b.id];
            const on = b.id === os;
            return (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setOs(b.id)}
                className={on ? 'ut-dl-os is-on' : 'ut-dl-os'}
              >
                <Icon />
                {b.name}
              </button>
            );
          })}
        </div>

        <div className="ut-dl-stage">
          <div className="ut-dl-stage-mark" aria-hidden>
            <Mark />
          </div>
          <div className="ut-dl-stage-body">
            <p className="ut-dl-osname">{build.name}</p>
            <p className="ut-dl-hint">{build.hint}</p>
            <div className="ut-dl-actions">
              <a className="ut-dl-primary" href={build.href} rel="noreferrer">
                Descargar {build.fileLabel}
              </a>
              {build.extra && (
                <a className="ut-dl-ghost" href={build.extra.href} rel="noreferrer">
                  {build.extra.fileLabel}
                </a>
              )}
            </div>
          </div>
        </div>

        <p className="ut-dl-note">
          Open source bajo Apache 2.0 · versión {DESKTOP_VERSION} · si el archivo no está,{' '}
          <a href={RELEASES_PAGE} rel="noreferrer">
            abrí las versiones
          </a>
          .
        </p>
      </div>
    </section>
  );
}
