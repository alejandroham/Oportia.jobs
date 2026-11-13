import React, { useState } from 'react';
import { X, Link2, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../components/Toast';

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" />

      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl p-6 z-10 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center text-[#20A88A]">
              <Link2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Importar oferta por enlace
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Pega el enlace de una vacante pública (LinkedIn, Get on Board, CompuTrabajo, etc.). Nuestro sistema extraerá los datos y la adaptará a tu radar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.getonbrd.com/jobs/..."
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#20A88A]/40"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20A88A] hover:bg-[#18856d] text-white text-xs font-semibold transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <span>Importar oferta</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
