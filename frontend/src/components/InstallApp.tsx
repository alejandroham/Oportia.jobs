import React, { useEffect, useState } from 'react';
import { Smartphone, Share, PlusSquare, MoreVertical, Download, CheckCircle2 } from 'lucide-react';
import { Dialog } from './ui/Dialog';
import { OpiAvatar } from './ui/OpiAvatar';
import { canPromptInstall, detectPlatform, isStandalone, onInstallStateChange, promptInstall, type InstallPlatform } from '../utils/pwa';
import { useToast } from './Toast';

/**
 * "Instalar en tu celular": deja Oportia como acceso directo (app) en iPhone y Android.
 * Se oculta si la app ya se abrió desde el ícono instalado.
 */

const Step: React.FC<{ n: number; icon: React.ReactNode; children: React.ReactNode }> = ({ n, icon, children }) => (
  <li className="flex items-start gap-3">
    <span className="w-7 h-7 shrink-0 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">{n}</span>
    <span className="flex-1 text-sm text-ink dark:text-gray-100 leading-relaxed">{children}</span>
    <span className="shrink-0 w-9 h-9 rounded-xl bg-gray-100 dark:bg-ink-raised text-ink dark:text-white flex items-center justify-center" aria-hidden="true">
      {icon}
    </span>
  </li>
);

const PLATFORM_TABS: Array<{ id: InstallPlatform; label: string }> = [
  { id: 'ios', label: 'iPhone / iPad' },
  { id: 'android', label: 'Android' },
  { id: 'desktop', label: 'Computador' }
];

export const InstallAppDialog: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const toast = useToast();
  const [platform, setPlatform] = useState<InstallPlatform>(detectPlatform());
  const [canPrompt, setCanPrompt] = useState(canPromptInstall());

  useEffect(() => onInstallStateChange(() => setCanPrompt(canPromptInstall())), []);
  useEffect(() => {
    if (isOpen) setPlatform(detectPlatform());
  }, [isOpen]);

  const handleNativeInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      toast.success('¡Oportia quedó instalada!', 'La encontrarás junto a tus otras apps.');
      onClose();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Lleva Oportia en tu celular"
      description="Déjala como una app en tu pantalla de inicio: se abre en un toque, a pantalla completa y sin buscarla en el navegador."
      maxWidth="md"
    >
      <div className="space-y-5 text-sm">
        <div className="flex justify-center">
          <OpiAvatar expression="celebrando" size={96} decorative />
        </div>

        {canPrompt && (
          <button
            type="button"
            onClick={handleNativeInstall}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:outline-none"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Instalar Oportia ahora
          </button>
        )}

        <div role="tablist" aria-label="Tu dispositivo" className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-ink-raised">
          {PLATFORM_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={platform === t.id}
              onClick={() => setPlatform(t.id)}
              className={`min-h-[40px] rounded-lg text-xs font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
                platform === t.id ? 'bg-white dark:bg-ink-surface text-ink dark:text-white shadow-xs' : 'text-gray-600 dark:text-ink-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {platform === 'ios' && (
            <ol className="space-y-3">
              <Step n={1} icon={<Share className="w-4 h-4" />}>
                Abre Oportia en <strong>Safari</strong> y toca el botón <strong>Compartir</strong> (el cuadrado con una flecha hacia arriba).
              </Step>
              <Step n={2} icon={<PlusSquare className="w-4 h-4" />}>
                Desliza hacia abajo y elige <strong>Agregar a pantalla de inicio</strong>.
              </Step>
              <Step n={3} icon={<CheckCircle2 className="w-4 h-4" />}>
                Toca <strong>Agregar</strong>. El ícono de Oportia aparecerá junto a tus apps.
              </Step>
            </ol>
          )}
          {platform === 'android' && (
            <ol className="space-y-3">
              <Step n={1} icon={<MoreVertical className="w-4 h-4" />}>
                Abre Oportia en <strong>Chrome</strong> y toca el menú <strong>⋮</strong> (arriba a la derecha).
              </Step>
              <Step n={2} icon={<Smartphone className="w-4 h-4" />}>
                Elige <strong>Instalar aplicación</strong> o <strong>Agregar a la pantalla principal</strong>.
              </Step>
              <Step n={3} icon={<CheckCircle2 className="w-4 h-4" />}>
                Confirma con <strong>Instalar</strong>. Encontrarás Oportia junto a tus apps.
              </Step>
            </ol>
          )}
          {platform === 'desktop' && (
            <ol className="space-y-3">
              <Step n={1} icon={<Download className="w-4 h-4" />}>
                En <strong>Chrome</strong> o <strong>Edge</strong>, busca el ícono de instalar al final de la barra de direcciones.
              </Step>
              <Step n={2} icon={<CheckCircle2 className="w-4 h-4" />}>
                Toca <strong>Instalar</strong>. Oportia se abrirá en su propia ventana.
              </Step>
              <Step n={3} icon={<Smartphone className="w-4 h-4" />}>
                Para tu celular, abre <strong>{typeof window !== 'undefined' ? window.location.host : 'Oportia'}</strong> en el teléfono y sigue los pasos de iPhone o Android.
              </Step>
            </ol>
          )}
        </div>

        <p className="text-xs text-ink-muted dark:text-ink-200">
          Es gratis y no ocupa casi espacio: no se descarga desde una tienda de apps. Tus datos siguen guardados solo en tu
          equipo.
        </p>
      </div>
    </Dialog>
  );
};

/** Botón que abre las instrucciones. No se muestra si Oportia ya se abrió como app instalada. */
export const InstallAppButton: React.FC<{ className?: string; label?: string; variant?: 'primary' | 'outline' | 'link' }> = ({
  className = '',
  label = 'Instalar en tu celular',
  variant = 'outline'
}) => {
  const [open, setOpen] = useState(false);
  if (isStandalone()) return null;
  const styles =
    variant === 'primary'
      ? 'bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 min-h-[48px] rounded-2xl font-bold text-sm'
      : variant === 'link'
      ? 'hover:text-brand-700 dark:hover:text-brand-300 underline-offset-2 hover:underline text-xs font-medium'
      : 'border border-gray-300 dark:border-ink-line bg-white dark:bg-ink-surface text-ink dark:text-white hover:bg-gray-50 dark:hover:bg-ink-hover px-4 py-2.5 min-h-[44px] rounded-xl font-semibold text-sm';
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${styles} ${className}`}
      >
        <Smartphone className={variant === 'link' ? 'w-3 h-3' : 'w-4 h-4'} aria-hidden="true" />
        {label}
      </button>
      <InstallAppDialog isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};
