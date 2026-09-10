'use client';

import { Suspense } from 'react';
import { DesignEditor } from '../editor-client';
import '@ultrathing/studio/styles.css';

export default function DesignEditorPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Abriendo el studio…</p>}>
      <DesignEditor />
    </Suspense>
  );
}
