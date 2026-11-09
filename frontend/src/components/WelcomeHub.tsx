import React, { useRef } from 'react';
import {
  ShieldCheck,
  Compass,
  Brain,
  Lock,
  FileText,
  CheckCircle2,
  Globe,
  Sparkles,
  Key,
  UploadCloud,
  ArrowRight,
  UserCheck,
  Building2,
  Award,
  Layers,
  HeartHandshake,
  AlertCircle
} from 'lucide-react';
import type { CandidateProfile, LLMSettings } from '../types';

interface WelcomeHubProps {
  profile: CandidateProfile | null;
  llmSettings: LLMSettings;
  onNavigateToTab: (tab: string) => void;
  onOpenPrivacyModal: () => void;
  onOpenSettings: () => void;
  onUploadCVClick: () => void;
}

export const WelcomeHub: React.FC<WelcomeHubProps> = ({
  profile,
  llmSettings,
  onNavigateToTab,
  onOpenPrivacyModal,
  onOpenSettings,
  onUploadCVClick
}) => {
  const hasProfile = Boolean(profile?.name && profile.name !== 'Candidato');
  const hasKey = Boolean(llmSettings?.has_active_key);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Hero Banner (Apple Glass Hero) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900/20 via-indigo-900/10 to-transparent border border-blue-500/20 p-6 sm:p-10 backdrop-blur-xl shadow-2xl">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300/60 dark:border-blue-800/60 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Soberanía Digital & Privacidad Local Certificada</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-1">
            <img
              src="/nexusjob-logo.png"
              alt="Nexus.Job"
              className="h-9 sm:h-12 w-auto object-contain dark:hidden"
            />
            <img
              src="/nexusjob-logo-dark.png"
              alt="Nexus.Job"
              className="h-9 sm:h-12 w-auto object-contain hidden dark:block"
            />
            <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
              AI
            </span>
          </div>

          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
            El ecosistema autónomo e inteligente de búsqueda de empleo, radar geográfico y preparación profesional para <strong>cualquier carrera, especialidad u oficio</strong>, con arquitectura soberana <em>Zero-Knowledge</em> y cumplimiento estricto de la legislación de protección de datos personales.
          </p>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={onUploadCVClick}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/25 transition active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{hasProfile ? 'Actualizar mi CV Maestro' : 'Cargar mi Currículum Vitae'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>

            <button
              onClick={() => onNavigateToTab('radar')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white text-xs font-semibold border border-black/5 dark:border-white/5 transition"
            >
              <Compass className="w-4 h-4 text-blue-500" />
              <span>Explorar Radar de Empleos</span>
            </button>

            <button
              onClick={onOpenPrivacyModal}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-300/50 dark:border-emerald-800/50 transition"
            >
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Respaldo Cifrado & Purgado</span>
            </button>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Section 1: ¿Qué es NexusJob AI? */}
      <div className="apple-glass apple-card p-6 sm:p-8 space-y-4">
        <div className="border-b border-black/5 dark:border-white/5 pb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span>¿Qué es NexusJob AI y cuál es su propósito?</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Democratización real del acceso al empleo eliminando algoritmos opacos e intermediarios innecesarios.
          </p>
        </div>

        <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">
          <p>
            <strong>NexusJob AI</strong> nace para transformar la búsqueda de empleo en un proceso transparente, digno y eficiente. Tradicionalmente, los portales laborales condicionan las oportunidades a algoritmos cerrados, sesgos predefinidos o suscripciones de pago que penalizan a quienes buscan trabajo.
          </p>
          <p>
            Esta plataforma pone en tus manos un <strong>agente de inteligencia artificial personal</strong> que trabaja exclusivamente para ti: lee tu currículum sin inventar ni falsificar datos, mapea ofertas de todo Chile y del mundo, adapta tus postulaciones a los filtros ATS de los empleadores y entrena tus respuestas para entrevistas bajo la metodología STAR.
          </p>
        </div>
      </div>

      {/* Section 2: ¿Cómo funciona y qué puedes hacer? (3 Pilares) */}
      <div className="space-y-4">
        <div className="text-center sm:text-left">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            ¿Cómo funciona y qué puedes hacer en la aplicación?
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Tres capacidades agénticas diseñadas para potenciar tu carrera profesional.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Pillar 1: Universal Profiler */}
          <div className="apple-glass apple-card p-5 space-y-3 hover:border-blue-500/40 transition">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-gray-900 dark:text-white">
              1. Análisis de CV Universal (Sin Sesgos)
            </h4>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
              Diseñado para cualquier formación u oficio: <strong>Salud</strong> (TENS, enfermeros, médicos), <strong>Construcción</strong> (arquitectos, constructores), <strong>Derecho</strong> (abogados, procuradores), <strong>Educación</strong> (profesores, educadores), <strong>Comercio</strong>, <strong>Administración</strong>, <strong>Minería</strong> y <strong>Tecnología</strong>.
            </p>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Deduce sinónimos ATS y sectores reales</span>
            </div>
          </div>

          {/* Pillar 2: Chile Geographic Radar */}
          <div className="apple-glass apple-card p-5 space-y-3 hover:border-indigo-500/40 transition">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-gray-900 dark:text-white">
              2. Radar de 16 Regiones de Chile & Remoto
            </h4>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
              Doble nivel de búsqueda: <strong>Cobertura Nacional continua</strong> combinada con <strong>Prioridad Regional Inteligente</strong>. Si vives en el Biobío, Araucanía, Valparaíso o RM, verás primero las vacantes de tu zona sin que jamás desaparezcan las oportunidades del resto del país.
            </p>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Compatibilidad profesional manda sobre distancia</span>
            </div>
          </div>

          {/* Pillar 3: AI Cognitive Brain & STAR Coach */}
          <div className="apple-glass apple-card p-5 space-y-3 hover:border-purple-500/40 transition">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-gray-900 dark:text-white">
              3. Memoria Cognitiva & Coach STAR
            </h4>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
              Asistente conversacional "Nexus" que aprende de tus logros laborales, los estructura con métricas verificables (Situación, Tarea, Acción, Resultado), redacta CVs adaptados y cartas de presentación, y simula entrevistas reales.
            </p>
            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ahorro máximo de tokens y cero alucinaciones</span>
            </div>
          </div>

        </div>
      </div>

      {/* Section 2.5: ¿Cómo funciona la postulación? Copiloto Humano vs Bots */}
      <div className="apple-glass apple-card p-6 sm:p-8 space-y-5 border-blue-500/20 bg-gradient-to-br from-blue-50/50 via-white/40 to-indigo-50/40 dark:from-blue-950/20 dark:via-zinc-900/40 dark:to-indigo-950/20">
        <div className="flex items-center space-x-3 border-b border-black/5 dark:border-white/5 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              ¿Cómo funciona la postulación? Copiloto de Alto Rendimiento vs. Bots a Ciegas
            </h3>
            <p className="text-xs text-gray-500">
              NexusJob AI asume el 95% del esfuerzo técnico y te entrega el control soberano final en 1 clic.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-2">
            <div className="font-semibold text-rose-600 dark:text-rose-400 flex items-center space-x-1.5">
              <span className="text-base">🚫</span>
              <span>Por qué NO usamos bots automáticos</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
              Los portales de empleo (LinkedIn, Computrabajo, Trabajando.com) bloquean y banean cuentas que usan scripts automáticos. Sitios estatales como <em>Empleos Públicos</em> exigen autenticación obligatoria con <strong>ClaveÚnica</strong>. Además, la Ley N° 21.719 exige tu consentimiento expreso y veracidad en cada antecedente entregado.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-2">
            <div className="font-semibold text-blue-600 dark:text-blue-400 flex items-center space-x-1.5">
              <span className="text-base">⚡</span>
              <span>Qué hace la IA por ti (95% del trabajo)</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
              Rastrea y consolida múltiples fuentes, calcula el <strong>Fit Score de compatibilidad (ordenando de mayor a menor porcentaje)</strong>, redacta un CV a la medida destacando tus logros STAR reales, genera la carta de presentación y audita la compatibilidad ATS.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-2">
            <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Tú en Control Soberano (1 Clic)</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
              Revisas tus materiales adaptados, los descargas en PDF o los copias, y haces clic en el enlace oficial de la vacante para postular directamente en la empresa con una candidatura auténtica, protegida y con la más alta tasa de respuesta.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Privacidad, Seguridad y Cumplimiento Legal (Ley 21.719 y Ley 19.628 de Chile) */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-950/30 via-zinc-900/40 to-blue-950/30 border border-emerald-500/30 p-6 sm:p-8 space-y-5 backdrop-blur-xl shadow-xl">
        <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Compromiso de Seguridad, Soberanía y Cumplimiento Legal</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Ley N° 21.719 & 19.628 (Chile)
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              Garantía de protección de datos personales, privacidad desde el diseño y por defecto (Privacy by Design), y consentimiento informado verificable.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1.5">
            <div className="font-semibold text-emerald-300 flex items-center space-x-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Almacenamiento Local Soberano (Zero-Knowledge)</span>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Tus datos de contacto, historial laboral y postulaciones residen exclusivamente en la base de datos local de tu navegador (IndexedDB). No existen bases de datos centrales en la nube recopilando tu información personal ni custodia de terceros (Art. 12 Ley 21.719).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1.5">
            <div className="font-semibold text-emerald-300 flex items-center space-x-1.5">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Cifrado Militar AES-256 en Respaldos</span>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Los archivos de respaldo exportados (<code className="text-emerald-400 font-mono">.nexusjob</code>) se cifran mediante <strong>AES-GCM de 256 bits</strong> con derivación PBKDF2 bajo tu contraseña personal. Nadie puede leer su contenido sin tu clave.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1.5">
            <div className="font-semibold text-emerald-300 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Gestión Protegida de Claves de IA</span>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Tus claves API (Google Gemini, OpenAI, Anthropic) se guardan cifradas en tu navegador y nunca en texto plano. Se comunican directamente con los proveedores y se destruyen en memoria al purgar o cerrar sesión.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1.5">
            <div className="font-semibold text-emerald-300 flex items-center space-x-1.5">
              <HeartHandshake className="w-4 h-4 text-emerald-400" />
              <span>Derecho al Olvido y Supresión Efectiva (Art. 17 Ley 21.719)</span>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              En pleno cumplimiento de los derechos ARCO de la <strong>Ley N° 21.719</strong> y Ley 19.628, el botón de purgado elimina el 100% de tu información personal, historial y credenciales con un solo clic de forma irreversible.
            </p>
          </div>

        </div>
      </div>

      {/* Section 4: Acciones Rápidas para Comenzar */}
      <div className="apple-glass apple-card p-6 sm:p-8 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          ¿Cómo deseas comenzar tu sesión?
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          <button
            onClick={onUploadCVClick}
            className="p-4 rounded-2xl border border-black/5 dark:border-white/5 hover:border-blue-500 bg-gray-50 dark:bg-zinc-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition text-left space-y-2 group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
              1. Cargar mi CV (PDF/Word)
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
              Analiza tu perfil y extrae tu profesión y competencias.
            </p>
          </button>

          <button
            onClick={onOpenPrivacyModal}
            className="p-4 rounded-2xl border border-black/5 dark:border-white/5 hover:border-emerald-500 bg-gray-50 dark:bg-zinc-800/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition text-left space-y-2 group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
              <Lock className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              2. Restaurar Respaldo Cifrado
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
              Importa un archivo <span className="font-mono">.nexusjob</span> con contraseña.
            </p>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-4 rounded-2xl border border-black/5 dark:border-white/5 hover:border-purple-500 bg-gray-50 dark:bg-zinc-800/60 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition text-left space-y-2 group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition">
              <Key className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
              3. Configurar Motor de IA
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
              {hasKey ? 'Clave de IA activa y cifrada.' : 'Conecta Gemini, OpenAI o Claude.'}
            </p>
          </button>

          <button
            onClick={() => onNavigateToTab('radar')}
            className="p-4 rounded-2xl border border-black/5 dark:border-white/5 hover:border-sky-500 bg-gray-50 dark:bg-zinc-800/60 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition text-left space-y-2 group"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition">
              <Compass className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400">
              4. Explorar Radar
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
              Revisa vacantes activas en Chile y remotas globales.
            </p>
          </button>

        </div>
      </div>

    </div>
  );
};
