import React from 'react';
import { ArrowRight, Search, ShieldCheck, Sparkles, FileText, KeyRound } from 'lucide-react';
import { OpiAvatar, type OpiExpression } from '../ui/OpiAvatar';

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
    text: 'Opi lee tu experiencia y tus habilidades. No inventa datos: solo ordena lo que ya hiciste.'
  },
  {
    expression: 'pensando',
    title: 'Encuentra ofertas en todo Chile',
    text: 'Buscamos a la vez en los principales portales de empleo y te mostramos qué tan compatible eres con cada oferta.'
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

const SOURCES = ['LinkedIn Chile', 'Computrabajo', 'ChileTrabajos', 'Laborum', 'Empleos Públicos', 'GetOnBoard'];

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onExplore }) => {
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
            Encuentra trabajo en lo tuyo, con un copiloto que te acompaña.
          </h1>
          <p className="text-base sm:text-lg text-ink-muted dark:text-ink-200 leading-relaxed max-w-2xl mx-auto md:mx-0">
            Oportia busca ofertas en los principales portales de Chile, adapta tu CV y tu carta a cada vacante y te
            prepara para la entrevista. Para cualquier profesión u oficio.
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
            Gratis · Sin crear cuenta · Tus datos se quedan en tu navegador
          </p>
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
          <h3 className="text-base font-bold text-ink dark:text-white">Un solo buscador</h3>
          <p className="text-sm text-ink-muted dark:text-ink-200 leading-relaxed">
            Consulta en paralelo {SOURCES.join(', ')}, y también ofertas remotas.
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
          <ShieldCheck className="w-6 h-6 text-brand-700 dark:text-brand-300" aria-hidden="true" />
          <h3 className="text-base font-bold text-ink dark:text-white">Tus datos son tuyos</h3>
          <p className="text-sm text-ink-muted dark:text-ink-200 leading-relaxed">
            Tu CV y tu perfil se guardan en tu navegador, no en nuestros servidores. Puedes exportarlos o borrarlos cuando
            quieras.
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
