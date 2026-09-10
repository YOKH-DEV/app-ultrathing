'use client';

import { useRouter } from 'next/navigation';
import { DesignGalleryPanel } from '@ultrathing/features';

export default function DesignGalleryPage() {
  const router = useRouter();
  return (
    <DesignGalleryPanel
      openDesign={(id, templateId) =>
        router.push(templateId ? `/app/diseno/${id}?tpl=${templateId}` : `/app/diseno/${id}`)
      }
    />
  );
}
