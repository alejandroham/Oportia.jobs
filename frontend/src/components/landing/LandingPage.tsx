import React from 'react';
import { ArrowRight, Search, Sparkles, FileText, KeyRound, Smartphone, Lock, Briefcase, CheckCircle2, MessageSquareHeart, Heart } from 'lucide-react';
import { OpiAvatar, type OpiExpression } from '../ui/OpiAvatar';
import { InstallAppButton } from '../InstallApp';
import { useFeedbackStore } from '../../state/useFeedbackStore';
import { SPONSOR_URL } from '../feedback/FeedbackDialog';
import { useRestoreDialog } from '../settings/RestoreDataDialog';

/**
 * Portada de Oportia: lo primero que ve quien llega por primera vez.
 * Presenta la app antes de pedir el CV. "Comenzar" abre la guía de inicio.
 * También disponible en /conoce-oportia para quien ya usa la app.
 */

interface LandingPageProps {
  onStart: () => void;
  onExplore: () => void;
}

const STEPS: Array<{ expression: OpiExpression; title: string; text: string }> = [
  {
    expression: 'curioso',
    title: 'Sube tu CV',
    text: 'Opi lee tu experiencia y tus habilidades, y todo queda guardado en tu navegador. No inventa datos: solo ordena lo que ya hiciste.'
  },
  {
    expression: 'pensando',
    title: 'Recibe ofertas de todo Chile',
    text: 'Cada mañana reunimos ofertas de todas las áreas, te mostramos tu compatibilidad con cada una y cuándo vencen.'
  },
  {
    expression: 'celebrando',
    title: 'Postula con documentos a la medida',
    text: 'Genera un CV y una carta de presentación adaptados a cada vacante, descárgalos en PDF y prepara tu entrevista.'
  }
];

const AREAS = [
  'Salud',
  'Educación',
  'Comercio y ventas',
  'Construcción',
  'Logística y bodega',
  'Administración y finanzas',
  'Tecnología',
  'Sector público',
  'Gastronomía y turismo',
  'Oficios y servicios'
];

const SOURCES = ['Empleos Públicos', 'Get on Board', 'portales de empleo de empresas', 'ChileTrabajos'];

const YOU_CONTROL = [
  'Tu CV, tu perfil y tus postulaciones se guardan en tu navegador, no en nuestros servidores.',
  'No creas cuenta ni contraseña.',
  'Descargas un respaldo o borras todo cuando quieras.',
  'Tú decides qué envías a la IA y cuándo postulas.'
];

const WE_PROVIDE = [
  'Un índice de ofertas de Chile que se actualiza cada mañana, de fuentes que permiten este uso.',
  'Tu compatibilidad con cada oferta, calculada con IA.',
  'La fecha de cierre de cada oferta, o una estimación si no la publica.',
  'CV y carta adaptados a cada vacante, y preparación para la entrevista.'
];

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onExplore }) => {
  const openFeedback = useFeedbackStore((s) => s.open);
  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-16 sm:space-y-20 animate-fade-in">
      {/* Portada */}
      <section aria-labelledby="landing-title" className="grid md:grid-cols-[1fr_auto] items-center gap-8 pt-4 sm:pt-10">
        <div className="space-y-6 text-center md:text-left order-2 md:order-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-200 dark:ring-1 dark:ring-brand-400/40">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Tu talento. Tus decisiones. Tus oportunidades.
          </span>
          <h1 id="landing-title" className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink dark:text-white leading-tight">
            Tú manejas tu información. Nosotros te traemos las ofertas.
          </h1>
          <p className="text-base sm:text-lg text-ink-muted dark:text-ink-200 leading-relaxed max-w-2xl mx-auto md:mx-0">
            Tu perfil y tus postulaciones se guardan en tu navegador, no en nuestros servidores. Oportia reúne cada mañana ofertas de empleo de todo
            Chile, te muestra qué tan compatible eres con cada una y te ayuda a postular con un CV y una carta a la medida.
            Para cualquier profesión u oficio.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
            <button
              type="button"
              onClick={onStart}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-600/20 transition active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:outline-none"
            >
              Comenzar
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onExplore}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] rounded-2xl border border-gray-300 dark:border-ink-line bg-white dark:bg-ink-surface text-ink dark:text-white font-semibold text-sm hover:bg-gray-50 dark:hover:bg-ink-hover transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:outline-none"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              Ver ofertas primero
            </button>
          </div>
          <p className="text-xs text-ink-muted dark:text-ink-300">
            Gratis · Sin crear cuenta · Tus datos son tuyos
          </p>
          <p className="text-sm text-ink dark:text-gray-200">
            ¿Ya usabas Oportia en otro equipo?{' '}
            <button
              type="button"
              onClick={() => useRestoreDialog.getState().open()}
              className="font-semibold text-brand-700 dark:text-brand-300 underline cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:outline-none rounded"
            >
              Recupera tus datos
            </button>
          </p>
          <InstallAppButton variant="link" label="Instalar Oportia en tu celular" className="text-brand-700 dark:text-brand-300" />
        </div>
        <div className="order-1 md:order-2 flex justify-center">
          <div className="relative">
            <div
              className="absolute inset-6 rounded-full bg-brand-200/60 dark:bg-brand-500/20 blur-3xl"
              aria-hidden="true"
            />
            <OpiAvatar expression="saludando" size={150} className="relative drop-shadow-xl md:hidden" />
            <OpiAvatar expression="saludando" size={240} className="relative drop-shadow-xl hidden md:block" />
          </div>
        </div>
      </section>

      {/* Fortaleza principal: tú controlas tus datos, Oportia aporta las ofertas */}
      <section aria-labelledby="landing-split" className="space-y-6">
        <h2 id="landing-split" className="text-xl sm:text-2xl font-bold text-ink dark:text-white text-center">
          Un trato claro
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="p-6 rounded-3xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border space-y-4">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink dark:text-white">
              <Lock className="w-5 h-5 text-brand-700 dark:text-brand-300" aria-hidden="true" />
              Tú controlas tu información
            </h3>
            <ul className="space-y-2.5">
              {YOU_CONTROL.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-ink-muted dark:text-ink-200">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </article>
          <article className="p-6 rounded-3xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-700/50 space-y-4">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink dark:text-white">
              <Briefcase className="w-5 h-5 text-brand-700 dark:text-brand-300" aria-hidden="true" />
              Oportia te trae las ofertas
            </h3>
            <ul className="space-y-2.5">
              {WE_PROVIDE.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-ink dark:text-gray-100">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {/* Cómo funciona */}
      <section aria-labelledby="landing-steps" className="space-y-6">
        <h2 id="landing-steps" className="text-xl sm:text-2xl font-bold text-ink dark:text-white text-center">
          Cómo funciona
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="relative p-6 rounded-3xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border shadow-xs text-center space-y-3"
            >
              <span className="absolute top-4 left-4 w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <OpiAvatar expression={step.expression} size={112} className="mx-auto" decorative />
              <h3 className="text-base font-bold text-ink dark:text-white">{step.title}</h3>
              <p className="text-sm text-ink-muted dark:text-ink-200 leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Para quién es */}
      <section aria-labelledby="landing-areas" className="space-y-5 text-center">
        <h2 id="landing-areas" className="text-xl sm:text-2xl font-bold text-ink dark:text-white">
          Para todas las áreas, no solo tecnología
        </h2>
        <p className="text-sm text-ink-muted dark:text-ink-200 max-w-2xl mx-auto">
          Escribe tu cargo como lo dirías tú: Oportia reconoce sinónimos y equivalentes (por ejemplo, enfermera, TENS o
          nurse) para que no se te escape ninguna oferta.
        </p>
        <ul className="flex flex-wrap justify-center gap-2" aria-label="Áreas laborales">
          {AREAS.map((area) => (
            <li
              key={area}
              className="px-3.5 py-1.5 rounded-full text-sm font-medium bg-white dark:bg-ink-raised text-ink dark:text-gray-100 border border-gray-200 dark:border-ink-border"
            >
              {area}
            </li>
          ))}
        </ul>
      </section>

      {/* Fuentes + documentos + privacidad */}
      <section aria-label="Características" className="grid gap-4 md:grid-cols-3">
        <article className="p-6 rounded-3xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border space-y-3">
          <Search className="w-6 h-6 text-brand-700 dark:text-brand-300" aria-hidden="true" />
          <h3 className="text-base font-bold text-ink dark:text-white">Ofertas al instante</h3>
          <p className="text-sm text-ink-muted dark:text-ink-200 leading-relaxed">
            Cada mañana reunimos ofertas de {SOURCES.join(', ')}. Si quieres, también buscas en vivo en esos portales y en
            LinkedIn Chile, y encuentras ofertas remotas.
          </p>
        </article>
        <article className="p-6 rounded-3xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border space-y-3">
          <FileText className="w-6 h-6 text-brand-700 dark:text-brand-300" aria-hidden="true" />
          <h3 className="text-base font-bold text-ink dark:text-white">CV y carta en PDF</h3>
          <p className="text-sm text-ink-muted dark:text-ink-200 leading-relaxed">
            Elige plantilla, revisa la versión adaptada a cada oferta y guárdala en PDF lista para enviar.
          </p>
        </article>
        <article className="p-6 rounded-3xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border space-y-3">
          <Sparkles className="w-6 h-6 text-brand-700 dark:text-brand-300" aria-hidden="true" />
          <h3 className="text-base font-bold text-ink dark:text-white">Compatibilidad automática</h3>
          <p className="text-sm text-ink-muted dark:text-ink-200 leading-relaxed">
            Con la IA activa, cada oferta muestra tu porcentaje de compatibilidad sin que lo pidas. Si actualizas tu
            experiencia, Oportia te avisa para recalcularlo.
          </p>
        </article>
      </section>

      {/* IA opcional */}
      <section
        aria-labelledby="landing-ai"
        className="flex flex-col sm:flex-row items-center gap-5 p-6 sm:p-8 rounded-3xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-700/50"
      >
        <OpiAvatar expression="pensando" size={96} decorative />
        <div className="space-y-2 text-center sm:text-left">
          <h2 id="landing-ai" className="text-lg font-bold text-ink dark:text-white flex items-center gap-2 justify-center sm:justify-start">
            <KeyRound className="w-5 h-5 text-brand-700 dark:text-brand-300" aria-hidden="true" />
            Inteligencia artificial, cuando la necesites
          </h2>
          <p className="text-sm text-ink-muted dark:text-ink-200 leading-relaxed">
            Buscar ofertas y armar tu CV funciona sin IA. Para evaluar tu compatibilidad, adaptar documentos o conversar
            con Opi, activa la IA gratuita de Oportia (con un cupo diario) o conecta tu propia clave de Gemini, OpenAI o
            Claude para usarla sin límites.
          </p>
        </div>
      </section>

      {/* Instalar como app */}
      <section
        aria-labelledby="landing-install"
        className="flex flex-col sm:flex-row items-center gap-5 p-6 sm:p-8 rounded-3xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border"
      >
        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
          <Smartphone className="w-8 h-8" aria-hidden="true" />
        </div>
        <div className="space-y-1 text-center sm:text-left flex-1">
          <h2 id="landing-install" className="text-lg font-bold text-ink dark:text-white">Llévala en tu celular</h2>
          <p className="text-sm text-ink-muted dark:text-ink-200 leading-relaxed">
            Déjala como app en tu pantalla de inicio, en iPhone o Android. Sin tiendas de apps y sin ocupar espacio.
          </p>
        </div>
        <InstallAppButton variant="primary" label="Instalar en tu celular" className="w-full sm:w-auto" />
      </section>

      {/* Opinión y donación */}
      <section
        aria-labelledby="landing-feedback"
        className="flex flex-col sm:flex-row items-center gap-5 p-6 sm:p-8 rounded-3xl bg-white dark:bg-ink-surface border border-gray-200/80 dark:border-ink-border"
      >
        <OpiAvatar expression="curioso" size={96} decorative />
        <div className="space-y-2 text-center sm:text-left flex-1">
          <h2 id="landing-feedback" className="text-lg font-bold text-ink dark:text-white">¿Qué te parece Oportia?</h2>
          <p className="text-sm text-ink-muted dark:text-ink-200 leading-relaxed">
            Cuéntanos qué te sirve y qué mejorarías. Si quieres, déjanos tu correo o teléfono para invitarte a una
            entrevista, solo con tu autorización. Y si Oportia te ayuda, puedes apoyar su desarrollo.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => openFeedback('manual', 'portada')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm cursor-pointer"
          >
            <MessageSquareHeart className="w-4 h-4" aria-hidden="true" /> Darnos tu opinión
          </button>
          <a
            href={SPONSOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-2xl border border-rose-300 dark:border-rose-400/40 text-rose-700 dark:text-rose-200 font-semibold text-sm hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            <Heart className="w-4 h-4" aria-hidden="true" /> Apoyar con una donación
          </a>
        </div>
      </section>

      {/* Llamado final */}
      <section className="text-center space-y-5">
        <OpiAvatar expression="celebrando" size={120} className="mx-auto" decorative />
        <h2 className="text-2xl font-bold text-ink dark:text-white">¿Partimos?</h2>
        <p className="text-sm text-ink-muted dark:text-ink-200">La guía de inicio tiene solo 3 pasos.</p>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-600/20 transition active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:outline-none"
        >
          Comenzar ahora
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </section>
    </div>
  );
};
