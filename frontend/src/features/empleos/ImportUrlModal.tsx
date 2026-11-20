import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ClipboardPaste, Link2 } from 'lucide-react';
import type { JobPosting } from '../../types';
import { api, getHumanErrorMessage, isAIBusyError, AI_BUSY_MESSAGE, BASIC_READING_LABEL } from '../../api';
import { useToast } from '../../components/Toast';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';

interface ImportUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Recibe la oferta lista para guardarla en tus postulaciones. */
  onImportSuccess: (job: JobPosting) => void | Promise<void>;
}

// Portales cuyas condiciones no permiten que otras apps lean sus avisos: se pega el texto.
const RESTRICTED = /(^|\.)(indeed\.com|computrabajo\.com|laborum\.cl)$/i;
const restrictedName = (url: string) => {
  try {
    const host = new URL(url.trim()).hostname;
    if (!RESTRICTED.test(host)) return null;
    return /indeed/i.test(host) ? 'Indeed' : /computrabajo/i.test(host) ? 'Computrabajo' : 'Laborum';
  } catch {
    return null;
  }
};

const fieldCls =
  'w-full text-xs px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-ink-raised border border-gray-200 dark:border-ink-line text-ink dark:text-gray-100 placeholder-ink-muted focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none';

/**
 * Importar una oferta que encontraste en otro lado:
 * - "Pegar texto": copias el texto de la oferta (Indeed, un correo, WhatsApp, el sitio de la empresa…).
 * - "Enlace": Oportia lee la página, salvo portales que no lo permiten (Indeed, Computrabajo, Laborum).
 * La oferta queda solo para ti, en Mis postulaciones.
 */
export const ImportUrlModal: React.FC<ImportUrlModalProps> = ({ isOpen, onClose, onImportSuccess }) => {
  const [mode, setMode] = useState<'text' | 'url'>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen) setIsLoading(false);
  }, [isOpen]);

  const blockedPortal = mode === 'url' ? restrictedName(url) : null;

  const finish = async (job: JobPosting, note?: string | null) => {
    await onImportSuccess(job);
    const msg = `«${job.title}» quedó guardada en Mis postulaciones.`;
    if (note) toast.showToast(`${msg} ${note}`, 'warning', 'Oferta importada', 7000);
    else toast.success(msg, 'Oferta importada');
    setText('');
    setUrl('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'text') {
        const res = await api.jobFromText(text.trim(), url.trim() || undefined);
        // Sin IA se avisa siempre (antes, si el servidor no mandaba nota, no se decía nada).
        await finish(res.job, res.method === 'ia' ? null : `${BASIC_READING_LABEL}: ${res.note || 'revisa los datos de la oferta.'}`);
      } else {
        const res = await api.importJobUrl(url.trim());
        await finish(res.job);
      }
    } catch (err) {
      if (isAIBusyError(err)) toast.withAction(AI_BUSY_MESSAGE, { label: 'Reintentar', onClick: () => formRef.current?.requestSubmit() });
      else toast.error('No se pudo importar la oferta: ' + getHumanErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const tab = (key: 'text' | 'url', label: string, Icon: typeof Link2) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === key}
      onClick={() => setMode(key)}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl text-xs font-semibold cursor-pointer ${
        mode === key ? 'bg-white dark:bg-ink-surface text-ink dark:text-white shadow-xs' : 'text-ink-muted hover:text-ink dark:hover:text-white'
      }`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}
    </button>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Importar una oferta"
      description="¿Encontraste una oferta en otro sitio? Tráela a Oportia para evaluar tu compatibilidad, adaptar tu CV y seguir tu postulación. Queda solo para ti."
      maxWidth="lg"
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div role="tablist" aria-label="Cómo importar" className="flex gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-ink-raised">
          {tab('text', 'Pegar texto', ClipboardPaste)}
          {tab('url', 'Enlace', Link2)}
        </div>

        {mode === 'text' ? (
          <>
            <label className="block space-y-1">
              <span className="font-semibold text-ink dark:text-white">Texto de la oferta</span>
              <textarea
                required
                minLength={60}
                rows={9}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Abre la oferta (en Indeed, Computrabajo, un correo, WhatsApp…), selecciona todo su texto, cópialo y pégalo aquí."
                className={fieldCls}
              />
              <span className="block text-ink-muted dark:text-ink-200">
                {text.trim().length < 60 ? 'Pega al menos el cargo, la empresa y la descripción.' : 'Oportia ordenará el cargo, la empresa, la ubicación, la renta, el cierre y los requisitos.'}
              </span>
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-ink dark:text-white">Enlace de la oferta (opcional)</span>
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… para volver a la oferta original y postular" className={`${fieldCls} min-h-[44px]`} />
            </label>
          </>
        ) : (
          <>
            <label className="block space-y-1">
              <span className="font-semibold text-ink dark:text-white">Enlace de la oferta</span>
              <input
                id="import-job-url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.getonbrd.com/jobs/… o el sitio de la empresa"
                className={`${fieldCls} min-h-[44px]`}
              />
            </label>
            {blockedPortal && (
              <p role="alert" className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/30 text-amber-900 dark:text-amber-100">
                {blockedPortal} no permite que otras apps lean sus avisos. Abre la oferta, copia su texto y usa{' '}
                <button type="button" className="underline font-semibold cursor-pointer" onClick={() => setMode('text')}>
                  Pegar texto
                </button>{' '}
                (el enlace se guarda igual para que vuelvas a ella).
              </p>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            disabled={mode === 'text' ? text.trim().length < 60 : !url.trim() || Boolean(blockedPortal)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            {mode === 'text' ? 'Ordenar y guardar' : 'Importar oferta'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
