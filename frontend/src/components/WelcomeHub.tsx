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
  AlertCircle,
  GraduationCap,
  Heart,
  Instagram,
  ExternalLink,
  Users,
  Briefcase,
  TrendingUp
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
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#20A88A]/10 dark:bg-[#20A88A]/20 text-[#173B50] dark:text-[#8AD9C4] border border-[#20A88A]/30 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#20A88A]" />
              <span>Soberanía Digital & Privacidad por Diseño</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-1">
            <img
              src="/oportia-logo.svg"
              alt="Oportia Jobs IA"
              className="h-10 sm:h-12 w-auto object-contain dark:hidden"
            />
            <img
              src="/oportia-logo-dark.svg"
              alt="Oportia Jobs IA"
              className="h-10 sm:h-12 w-auto object-contain hidden dark:block"
            />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#173B50] dark:text-white tracking-tight">
              Tu talento. Tus decisiones. Tus oportunidades.
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
              El ecosistema inteligente que automatiza tu búsqueda laboral, protege tu información y te acompaña en tu desarrollo profesional con total autonomía humana.
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={onUploadCVClick}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#173B50] hover:bg-[#1E3B50] dark:bg-[#20A88A] dark:hover:bg-[#1C967A] text-white text-xs font-semibold shadow-md shadow-[#173B50]/20 transition active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{hasProfile ? 'Actualizar mi CV' : 'Cargar mi Currículum Vitae'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>

            <button
              onClick={() => onNavigateToTab('radar')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1E3B50] hover:bg-gray-100 dark:hover:bg-[#243F55] text-gray-900 dark:text-white text-xs font-semibold border border-black/5 dark:border-white/5 transition"
            >
              <Compass className="w-4 h-4 text-[#20A88A]" />
              <span>Explorar Oportia Radar</span>
            </button>

            <button
              onClick={() => onNavigateToTab('coach')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#EDF3F5] dark:bg-[#243F55] hover:opacity-90 text-[#173B50] dark:text-[#8AD9C4] text-xs font-semibold border border-[#DCE5EA] dark:border-[#365368] transition"
            >
              <GraduationCap className="w-4 h-4 text-[#20A88A]" />
              <span>Opi Coach & Oportia Aprende</span>
            </button>

            <button
              onClick={onOpenPrivacyModal}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#20A88A]/10 dark:bg-[#20A88A]/20 hover:opacity-90 text-[#173B50] dark:text-[#8AD9C4] text-xs font-semibold border border-[#20A88A]/30 transition"
            >
              <Lock className="w-4 h-4 text-[#20A88A]" />
              <span>Respaldo Cifrado & Purgado</span>
            </button>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#20A88A]/10 dark:bg-[#20A88A]/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Section 1: ¿Qué es Oportia Jobs IA? */}
      <div className="apple-glass apple-card p-6 sm:p-8 space-y-4">
        <div className="border-b border-black/5 dark:border-white/5 pb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-[#20A88A]" />
            <span>¿Qué es Oportia Jobs IA y cuál es su propósito?</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Democratizar el acceso a oportunidades laborales mediante herramientas inteligentes centradas en tus decisiones.
          </p>
        </div>

        <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">
          <p>
            <strong>Oportia Jobs IA</strong> nace para transformar la búsqueda de empleo en un proceso más organizado, transparente y eficiente. La idea fundamental es sencilla y clara: <em>la IA organiza y te orienta, tú decides tu camino</em>.
          </p>
          <p>
            La plataforma actúa como tu <strong>copiloto profesional inteligente</strong>: lee tu currículum sin inventar ni falsificar datos, mapea ofertas en Chile y el mundo, analiza la compatibilidad con diferentes cargos de forma explicable, adapta postulaciones y entrena tus respuestas con el asistente <strong>Opi</strong>.
          </p>
        </div>
      </div>

      {/* Section 2: ¿Cómo funciona y qué puedes hacer? (6 Módulos Especializados) */}
      <div className="space-y-4">
        <div className="text-center sm:text-left">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            ¿Cómo funciona y qué puedes hacer en Oportia Jobs IA?
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Módulos inteligentes de alta precisión diseñados para potenciar tu carrera profesional con autonomía.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Module 1: Universal Profiler */}
          <div 
            onClick={() => onNavigateToTab('profile')}
            className="apple-glass apple-card p-5 space-y-3 hover:border-blue-500/40 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                1. Perfil & CV Maestro Universal
              </h4>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                Extracción limpia de archivos PDF o Word sin inventar datos. Taxonomías universales para <strong>Salud</strong> (TENS, enfermeros, médicos), <strong>Construcción</strong>, <strong>Derecho</strong>, <strong>Educación</strong>, <strong>Administración</strong>, <strong>Minería</strong> y <strong>Tecnología</strong>.
              </p>
            </div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Deduce sinónimos ATS y sectores
              </span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* Module 2: Chile Geographic Radar */}
          <div 
            onClick={() => onNavigateToTab('radar')}
            className="apple-glass apple-card p-5 space-y-3 hover:border-indigo-500/40 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <Compass className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                2. Radar de Empleo (16 Regiones & Remoto)
              </h4>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                Doble nivel de búsqueda: <strong>Cobertura Nacional continua</strong> combinada con <strong>Prioridad Regional Inteligente</strong>. Indexa Get on Board, CompuTrabajo, ChileTrabajos, Laborum, LinkedIn y portales ATS limpios vía ATS Dorks.
              </p>
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Prioridad regional activa sin sesgos
              </span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* Module 3: Comité de Evaluación IA */}
          <div 
            onClick={() => onNavigateToTab('radar')}
            className="apple-glass apple-card p-5 space-y-3 hover:border-emerald-500/40 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                3. Comité de Evaluación IA Multiagente
              </h4>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                Simula un proceso real con <strong>5 evaluadores independientes</strong>: Reclutador RR. HH. (25%), Hiring Manager (25%), Evaluador Técnico (25%), Especialista ATS (15%) y Consultor Estratégico (10%), consolidado por el Director con <strong>Fit Score Actual y Potential Fit Score</strong>.
              </p>
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Matriz de evidencias y deal-breakers
              </span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* Module 4: Mis Postulaciones 360 & Laboratorio CV */}
          <div 
            onClick={() => onNavigateToTab('tracker')}
            className="apple-glass apple-card p-5 space-y-3 hover:border-blue-500/40 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <Briefcase className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400">
                4. Mis Postulaciones & Laboratorio CV
              </h4>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                Genera tu CV adaptado a la vacante con tipografía formal justificada (<code>.formal-justify</code>), carta de presentación persuasiva, bitácora cronológica transparente y postulación soberana en 1 clic oficial sin riesgo de baneo.
              </p>
            </div>
            <div className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Control humano 100% en cada envío
              </span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* Module 5: Coach IA & Cursos Verificados */}
          <div 
            onClick={() => onNavigateToTab('coach')}
            className="apple-glass apple-card p-5 space-y-3 hover:border-purple-500/40 transition cursor-pointer group flex flex-col justify-between ring-1 ring-purple-500/20"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                5. Coach IA: Desarrollo Profesional
              </h4>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                Acompañamiento continuo: diagnóstico vivo de competencias, catálogo de <strong>cursos oficiales verificados</strong> (Microsoft Learn, AWS, Cisco, SENCE Chile), generador de rutas por hitos, <strong>Tutor de casos prácticos</strong> y simulador de entrevistas por rol.
              </p>
            </div>
            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Valida competencias con evidencias
              </span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

          {/* Module 6: Memoria Cognitiva & Biblioteca STAR */}
          <div 
            onClick={() => onNavigateToTab('preferences')}
            className="apple-glass apple-card p-5 space-y-3 hover:border-amber-500/40 transition cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <Brain className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                6. Oportia Skills & ADN Profesional
              </h4>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                Cerebro que aprende de tus interacciones: infiere tu tono y seniority, extrae historias de éxito bajo el método STAR (Situación, Tarea, Acción, Resultado) y asiste mediante el chat con "Opi Copiloto" con reinicio seguro.
              </p>
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Memoria soberana y auditable
              </span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </div>

        </div>
      </div>

      {/* Section 2.5: Copiloto de Empleabilidad Soberano (Control Humano 100%) & Ley 21.719 */}
      <div className="apple-glass apple-card p-6 sm:p-8 space-y-5 border-blue-500/20 bg-gradient-to-br from-blue-50/50 via-white/40 to-indigo-50/40 dark:from-blue-950/20 dark:via-zinc-900/40 dark:to-indigo-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#20A88A]/10 text-[#20A88A] dark:text-[#8AD9C4] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                  Copiloto de Empleabilidad Soberano (Control Humano 100%)
                </h3>
                <span className="text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                  Anti-Bloqueo & Ley N° 21.719
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                ¿Cómo postulas? Oportia Jobs IA asume el esfuerzo operativo y te entrega el control soberano final en 1 clic oficial.
              </p>
            </div>
          </div>
        </div>

        {/* Core explanation */}
        <div className="p-4 rounded-2xl bg-[#20A88A]/5 border border-[#20A88A]/20 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            <strong>¿Cómo postulas?</strong> Oportia Jobs IA rastrea y evalúa las vacantes ordenándolas por <strong>Compatibilidad Oportia (mayor % primero)</strong> y genera tu CV adaptado y carta de presentación a la medida. <strong>No postula automáticamente a ciegas</strong> para evitar que tu cuenta sea bloqueada por los portales, permitir la autenticación con ClaveÚnica (Empleos Públicos) y garantizar que tú valides tus antecedentes bajo la Ley N° 21.719. Tú revisas tus materiales y postulas en 1 clic en el enlace oficial.
          </p>
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
              Rastrea y consolida múltiples fuentes, calcula la <strong>Compatibilidad Oportia (ordenando de mayor a menor porcentaje)</strong>, redacta un CV a la medida destacando tus logros STAR reales, genera la carta de presentación y audita la compatibilidad ATS.
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

        {/* Radar Modes & Regional Priority Explanation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300/40 dark:border-amber-700/40 space-y-1.5">
            <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Modo Búsqueda Libre en Radar vs. Fit Score</span>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              Puedes buscar y explorar vacantes libremente por cargo o palabras clave sin cargar nada. Para calcular tu <strong>porcentaje de Compatibilidad Oportia (100% a 0%)</strong>, detectar tu región y deducir tu estrategia de búsqueda sin sesgos, primero debes cargar tu currículum o conectar tu clave de API.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-300/40 dark:border-indigo-700/40 space-y-1.5">
            <div className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center space-x-1.5">
              <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Prioridad Regional Inteligente & Cobertura Chile</span>
            </div>
            <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
              Prioridad regional activa para las 16 regiones de Chile (ej: Región del Biobío, Metropolitana, Valparaíso) detectada sin sesgo desde tu CV, manteniendo siempre la cobertura activa en <strong>Chile Completo</strong> y oportunidades remotas globales.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Privacidad, Seguridad y Cumplimiento Legal (Ley 21.719 y Ley 19.628 de Chile) */}
      <div className="apple-glass apple-card p-6 sm:p-8 space-y-5 border border-[#20A88A]/30 dark:border-[#20A88A]/40 bg-gradient-to-br from-[#20A88A]/5 via-white/80 to-[#173B50]/5 dark:from-[#1E3B50]/90 dark:via-[#142B3D]/95 dark:to-[#173B50]/90 shadow-xl rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/8 dark:border-white/10 pb-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#20A88A]/10 text-[#20A88A] dark:bg-[#20A88A]/20 dark:text-[#8AD9C4] flex items-center justify-center shrink-0 border border-[#20A88A]/30 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-[#173B50] dark:text-white">
                  Compromiso de Seguridad, Soberanía y Cumplimiento Legal
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#20A88A]/10 dark:bg-[#20A88A]/20 text-[#173B50] dark:text-[#8AD9C4] border border-[#20A88A]/30">
                  Ley N° 21.719 & 19.628 (Chile)
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                Garantía de protección de datos personales, privacidad por diseño y por defecto (Privacy by Design), y consentimiento informado verificable.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#142B3D]/90 border border-black/8 dark:border-white/10 shadow-xs hover:shadow-md transition space-y-2">
            <div className="font-bold text-xs text-[#173B50] dark:text-[#8AD9C4] flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-[#20A88A]/10 dark:bg-[#20A88A]/20 text-[#20A88A] dark:text-[#8AD9C4]">
                <Lock className="w-4 h-4" />
              </span>
              <span>Almacenamiento Local Soberano</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-[11px] leading-relaxed">
              Tus datos de contacto, historial laboral y postulaciones residen exclusivamente en la base de datos local de tu navegador (IndexedDB). El servidor no tiene base de datos ni recopila tu información personal (<strong className="text-gray-900 dark:text-white font-semibold">Art. 12 Ley 21.719</strong>).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#142B3D]/90 border border-black/8 dark:border-white/10 shadow-xs hover:shadow-md transition space-y-2">
            <div className="font-bold text-xs text-[#173B50] dark:text-[#8AD9C4] flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-[#20A88A]/10 dark:bg-[#20A88A]/20 text-[#20A88A] dark:text-[#8AD9C4]">
                <Key className="w-4 h-4" />
              </span>
              <span>Cifrado Local AES-256 en Respaldos</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-[11px] leading-relaxed">
              Los archivos de respaldo exportados (<code className="px-1.5 py-0.5 rounded bg-[#EDF3F5] dark:bg-white/10 text-[#173B50] dark:text-[#8AD9C4] font-mono font-semibold">.oportia</code>) se cifran mediante <strong className="text-gray-900 dark:text-white font-semibold">AES-GCM de 256 bits</strong> con derivación PBKDF2 bajo tu contraseña personal. Nadie puede leer su contenido sin tu clave.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#142B3D]/90 border border-black/8 dark:border-white/10 shadow-xs hover:shadow-md transition space-y-2">
            <div className="font-bold text-xs text-[#173B50] dark:text-[#8AD9C4] flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-[#20A88A]/10 dark:bg-[#20A88A]/20 text-[#20A88A] dark:text-[#8AD9C4]">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span>Custodia Segura de Claves de IA</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-[11px] leading-relaxed">
              Tus claves de API (Google Gemini, OpenAI, Anthropic) se guardan cifradas en tu navegador (WebCrypto) y nunca en disco del servidor. Viajan temporalmente por petición y se descartan en memoria tras su uso.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#142B3D]/90 border border-black/8 dark:border-white/10 shadow-xs hover:shadow-md transition space-y-2">
            <div className="font-bold text-xs text-[#173B50] dark:text-[#8AD9C4] flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-[#20A88A]/10 dark:bg-[#20A88A]/20 text-[#20A88A] dark:text-[#8AD9C4]">
                <HeartHandshake className="w-4 h-4" />
              </span>
              <span>Derecho al Olvido y Supresión Efectiva</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-[11px] leading-relaxed">
              En pleno cumplimiento de los derechos ARCO de la <strong className="text-gray-900 dark:text-white font-semibold">Ley N° 21.719</strong> y Ley 19.628, el botón de purgado elimina el 100% de tu información personal, historial y credenciales con un solo clic de forma irreversible.
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
              Importa un archivo <span className="font-mono">.oportia</span> (o .nexusjob) con contraseña.
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

      {/* Section 5: Apoyo al Desarrollo, Patrocinio y Comunidad */}
      <div className="apple-glass apple-card p-6 sm:p-8 space-y-5 border-pink-500/20 bg-gradient-to-br from-pink-50/40 via-white/40 to-rose-50/30 dark:from-pink-950/20 dark:via-zinc-900/40 dark:to-rose-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-pink-500/20">
              <Heart className="w-6 h-6 fill-white/80" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                  Apoya el Desarrollo y Evolución Continua de Oportia Jobs IA
                </h3>
                <span className="text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300 border border-pink-300/40">
                  Open Source & Soberano
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Oportia Jobs IA es una iniciativa creada para democratizar la búsqueda de empleo ética, transparente, asistida por IA y centrada en tus decisiones.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <a
            href="https://github.com/sponsors/alejandroham"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-2xl bg-white/80 dark:bg-zinc-800/70 border border-pink-200 dark:border-pink-900/50 hover:border-pink-500 dark:hover:border-pink-400 transition-all shadow-sm hover:shadow-md flex items-center justify-between"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 flex items-center justify-center group-hover:scale-110 transition">
                <Heart className="w-5 h-5 fill-pink-500" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 flex items-center gap-1.5">
                  <span>Conviértete en Sponsor en GitHub</span>
                  <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  github.com/sponsors/alejandroham — Impulsa nuevas mejoras y servidores
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex text-[10px] font-bold px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white transition">
              Sponsor ❤️
            </span>
          </a>

          <a
            href="https://www.instagram.com/not.kano/"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-2xl bg-white/80 dark:bg-zinc-800/70 border border-purple-200 dark:border-purple-900/50 hover:border-purple-500 dark:hover:border-purple-400 transition-all shadow-sm hover:shadow-md flex items-center justify-between"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
                <Instagram className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 flex items-center gap-1.5">
                  <span>Sígueme en Instagram</span>
                  <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  @not.kano — Actualizaciones en vivo, feedback y comunidad
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex text-[10px] font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white transition">
              @not.kano 📸
            </span>
          </a>
        </div>
      </div>

    </div>
  );
};
