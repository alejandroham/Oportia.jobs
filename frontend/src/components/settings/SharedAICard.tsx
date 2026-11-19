import React, { useEffect, useState } from 'react';
import { Download, FileText, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore';
import { OpiAvatar } from '../ui/OpiAvatar';
import { useToast } from '../Toast';
import { api } from '../../api';
import { AI_CONSENT_STATEMENTS, AI_NOTICE_VERSION, downloadNotice, type ConsentRecord } from '../../legal/aiNotice';
import { currentAIConsent, recordAIConsent } from '../../utils/consentLog';
import { AINoticeDialog } from './AINoticeDialog';

/**
 * IA gratuita de Oportia: activación con aviso de privacidad obligatorio y cupo diario visible.
 * La clave propia (abajo, en "Conexión con Inteligencia Artificial") siempre tiene prioridad.
 */
export const SharedAICard: React.FC = () => {
  const toast = useToast();
  const { settings, setSharedAIConsent, refreshSharedAI } = useAppStore();
  // Doble confirmación: las dos casillas son obligatorias.
  const [checks, setChecks] = useState<[boolean, boolean]>([false, false]);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [record, setRecord] = useState<ConsentRecord | null>(() => currentAIConsent());
  const [justActivated, setJustActivated] = useState(false);
  const shared = settings.shared_ai;

  useEffect(() => {
    refreshSharedAI();
  }, [refreshSharedAI]);

  if (!shared) return null;

  const ownKey = Boolean(settings.has_own_key);
  const bothChecked = checks[0] && checks[1];

  const activate = () => {
    const rec = recordAIConsent();
    setRecord(rec);
    setSharedAIConsent(true);
    setJustActivated(true);
    // Oportia queda informada de forma anónima: versión, acción y código del comprobante (sin datos personales).
    api.sendEvent('consentimiento_ia', { accion: 'acepta', version: AI_NOTICE_VERSION, codigo: rec.code });
    toast.success('IA gratuita activada', `Tienes ${shared.remaining} consultas disponibles hoy. Puedes descargar tu comprobante.`);
  };

  const downloadReceipt = () => {
    downloadNotice(record);
    api.sendEvent('comprobante_ia');
  };

  const noticeLink = (
    <button type="button" onClick={() => setNoticeOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold underline cursor-pointer">
      <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Leer el aviso completo y la exclusión de responsabilidad
    </button>
  );
  const consented = Boolean(shared.consented);

  return (
    <section
      aria-labelledby="shared-ai-title"
      className="apple-glass apple-card p-6 rounded-2xl space-y-4"
    >
      <div className="flex items-start gap-4">
        <OpiAvatar expression={shared.active ? 'saludando' : 'durmiendo'} size={64} decorative />
        <div className="space-y-1 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="shared-ai-title" className="text-sm font-bold text-ink dark:text-white">
              IA gratuita de Oportia
            </h2>
            {shared.active && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                Activa
              </span>
            )}
          </div>
          <p className="text-xs text-ink-muted dark:text-ink-200 leading-relaxed">
            Usa la IA sin configurar nada: evaluar tu compatibilidad con ofertas, adaptar tu CV y tu carta, preparar
            entrevistas y conversar con Opi. Tienes <strong>{shared.daily_limit} consultas al día</strong>.
          </p>
        </div>
      </div>

      {!shared.available ? (
        <p className="text-xs p-3 rounded-xl bg-gray-50 dark:bg-ink-raised text-ink-muted dark:text-ink-200">
          La IA gratuita no está disponible en este momento. Puedes conectar tu propia clave más abajo.
        </p>
      ) : ownKey ? (
        <p className="text-xs p-3 rounded-xl bg-gray-50 dark:bg-ink-raised text-ink dark:text-gray-100">
          Estás usando <strong>tu propia clave</strong>, sin límite diario. Si la quitas, Oportia usará la IA gratuita
          {consented ? '.' : ' cuando la actives aquí.'}
        </p>
      ) : consented ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-700/50">
          <p className="text-sm text-ink dark:text-white" role="status">
            Te quedan <strong>{shared.remaining}</strong> de {shared.daily_limit} consultas hoy.
            {shared.remaining === 0 && ' Opi está descansando: vuelve mañana o conecta tu propia clave.'}
          </p>
          <div className="flex flex-wrap gap-2 shrink-0">
          {record && (
            <button
              type="button"
              onClick={downloadReceipt}
              className={`inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                justActivated ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'border border-gray-300 dark:border-ink-line text-ink dark:text-white hover:bg-white dark:hover:bg-ink-hover'
              }`}
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" /> Descargar mi comprobante
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSharedAIConsent(false);
              setJustActivated(false);
              setChecks([false, false]);
              api.sendEvent('consentimiento_ia', { accion: 'retira', version: AI_NOTICE_VERSION });
              toast.info('Dejaste de usar la IA gratuita de Oportia.');
            }}
            className="shrink-0 min-h-[44px] px-3 py-2 rounded-xl border border-gray-300 dark:border-ink-line text-xs font-semibold text-ink dark:text-white hover:bg-white dark:hover:bg-ink-hover transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            Dejar de usar IA gratuita
          </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-400/40 space-y-2 text-amber-950 dark:text-amber-100">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
              <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
              Antes de activarla, lee esto
            </p>
            <ul className="list-disc pl-5 text-xs space-y-1 leading-relaxed">
              <li>
                Funciona con el <strong>plan gratuito de la API de Google Gemini</strong>: Google puede usar lo que envías
                para mejorar sus productos y personas revisoras de Google pueden leerlo.
              </li>
              <li>
                <strong>Se envía</strong> tu experiencia, estudios, logros, las ofertas y lo que escribas en el chat.{' '}
                <strong>No se envían</strong> tu nombre, correo, teléfono, enlaces ni RUT: Oportia los reemplaza por marcadores.
              </li>
              <li>
                <strong>No escribas datos sensibles</strong> en tu CV, en el chat ni en la práctica de entrevista: dirección,
                salud, situación familiar o datos de otras personas.
              </li>
              <li>
                Oportia <strong>no guarda tu CV</strong> en su servidor y solo cuenta tu cupo con un identificador anónimo
                de este navegador.
              </li>
              <li>
                La IA puede equivocarse: <strong>revisa todo antes de usarlo</strong>. Oportia no garantiza entrevistas ni
                contrataciones.
              </li>
              <li>¿Prefieres que Google no use tus datos? Conecta tu propia clave de un plan de pago en Ajustes → Motor de IA.</li>
            </ul>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-amber-900 dark:text-amber-200">{noticeLink}</div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-ink dark:text-white mb-1">Para activarla, confirma las dos cosas:</legend>
            {AI_CONSENT_STATEMENTS.map((text, i) => (
              <label key={i} className="flex items-start gap-2.5 text-sm text-ink dark:text-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) => setChecks((prev) => (i === 0 ? [e.target.checked, prev[1]] : [prev[0], e.target.checked]))}
                  className="mt-0.5 w-4 h-4 accent-brand-600"
                />
                <span>{text}</span>
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            disabled={!bothChecked}
            onClick={activate}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            Activar IA gratuita
          </button>
          {!bothChecked && <p className="text-xs text-ink-muted dark:text-ink-200">Marca las dos casillas para activar.</p>}
        </div>
      )}
      {consented && !ownKey && <div className="text-xs text-ink-muted dark:text-ink-200">{noticeLink}</div>}
      <AINoticeDialog isOpen={noticeOpen} onClose={() => setNoticeOpen(false)} record={consented ? record : null} />
    </section>
  );
};
