import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';

interface ImportUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const ImportUrlModal: React.FC<ImportUrlModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    setIsLoading(true);
    try {
      await api.importJobUrl(cleanUrl);
      toast.success('Oferta importada exitosamente al radar');
      setUrl('');
      onImportSuccess();
      onClose();
    } catch (e: any) {
      toast.error('Error al importar oferta: ' + (e?.message || e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Importar oferta por enlace"
      description="Pega el enlace de una vacante pública (LinkedIn, Get on Board, CompuTrabajo, etc.). Nuestro sistema extraerá los datos y la adaptará a tu radar."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="import-job-url" className="sr-only">
            Enlace de la vacante
          </label>
          <input
            id="import-job-url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.getonbrd.com/jobs/..."
            className="w-full text-xs min-h-[44px] px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-ink dark:text-gray-100 placeholder-ink-muted focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            disabled={!url.trim()}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Importar oferta
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
