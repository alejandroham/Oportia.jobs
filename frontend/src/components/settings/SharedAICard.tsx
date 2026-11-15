import React, { useEffect, useState } from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore';
import { OpiAvatar } from '../ui/OpiAvatar';
import { useToast } from '../Toast';

/**
 * IA gratuita de Oportia: activación con aviso de privacidad obligatorio y cupo diario visible.
 * La clave propia (abajo, en "Conexión con Inteligencia Artificial") siempre tiene prioridad.
 */
export const SharedAICard: React.FC = () => {
  const toast = useToast();
  const { settings, setSharedAIConsent, refreshSharedAI } = useAppStore();
  const [accepted, setAccepted] = useState(false);
  const shared = settings.shared_ai;

  useEffect(() => {
    refreshSharedAI();
  }, [refreshSharedAI]);

  if (!shared) return null;

  const ownKey = Boolean(settings.has_own_key);
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
          <button
            type="button"
            onClick={() => {
              setSharedAIConsent(false);
              toast.info('Dejaste de usar la IA gratuita de Oportia.');
            }}
            className="shrink-0 min-h-[44px] px-3 py-2 rounded-xl border border-gray-300 dark:border-ink-line text-xs font-semibold text-ink dark:text-white hover:bg-white dark:hover:bg-ink-hover transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            Dejar de usar IA gratuita
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-400/40 space-y-2">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
              <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
              Antes de activarla, lee esto
            </p>
            <ul className="list-disc pl-5 text-xs text-amber-950 dark:text-amber-100 space-y-1 leading-relaxed">
              <li>
                La IA gratuita usa el <strong>plan gratuito de la API de Google Gemini</strong>. En ese plan, Google puede
                usar lo que envías (por ejemplo, partes de tu CV y de las ofertas) para mejorar sus productos, y personas
                revisoras de Google pueden leerlo.
              </li>
              <li>
                <strong>No incluyas datos sensibles</strong> en tu CV o en el chat: RUT, dirección, datos de salud o de
                tu familia.
              </li>
              <li>
                Oportia no guarda tu CV en su servidor. Para contar tu cupo diario usa un identificador anónimo de este
                navegador.
              </li>
              <li>Si prefieres que Google no use tus datos, conecta tu propia clave de un plan de pago en Ajustes → Motor de IA.</li>
            </ul>
            <a
              href="https://ai.google.dev/gemini-api/terms"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 dark:text-amber-200 underline"
            >
              Términos de la API de Gemini <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
          <label className="flex items-start gap-2.5 text-sm text-ink dark:text-gray-100 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-brand-600"
            />
            <span>Entiendo que Google puede usar lo que envíe a la IA gratuita para mejorar sus productos.</span>
          </label>
          <button
            type="button"
            disabled={!accepted}
            onClick={() => {
              setSharedAIConsent(true);
              toast.success('IA gratuita activada', `Tienes ${shared.remaining} consultas disponibles hoy.`);
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          >
            Activar IA gratuita
          </button>
        </div>
      )}
    </section>
  );
};
