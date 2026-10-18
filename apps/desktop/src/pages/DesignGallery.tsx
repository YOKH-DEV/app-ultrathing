import { useNavigate } from 'react-router-dom';
import { DesignGalleryPanel } from '@ultrathing/features';

/** Galería de diseños: categorías, medidas y plantillas. */
export function DesignGallery() {
  const navigate = useNavigate();
  return (
    <DesignGalleryPanel
      openDesign={(id, templateId) =>
        navigate(templateId ? `/diseno/${id}?tpl=${templateId}` : `/diseno/${id}`)
      }
    />
  );
}
