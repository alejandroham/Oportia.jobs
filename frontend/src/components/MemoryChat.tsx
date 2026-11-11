import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Star,
  ShieldAlert,
  Lightbulb,
  CheckCircle2,
  Briefcase,
  TrendingUp,
  KeyRound,
  ShieldCheck,
  Lock,
  ExternalLink,
  Bot,
  RotateCcw,
  Brain,
  ChevronDown
} from 'lucide-react';
import type { UserPreferences, LLMSettings } from '../types';
import { api } from '../api';
import { useToast } from './Toast';
import { saveClientStore, getClientStore } from '../utils/storage';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  quickReplies?: string[];
  learnedStory?: {
    title: string;
    action: string;
    result_and_metrics?: string;
  };
  learnedInsights?: string[];
  learnedDealBreakers?: string[];
}

interface MemoryChatProps {
  preferences: UserPreferences;
  onPreferencesUpdated: (p: UserPreferences) => void;
  llmSettings?: LLMSettings | null;
  onOpenSettings?: () => void;
  className?: string;
}

const ACTIONABLE_SUGGESTIONS = [
  {
    icon: Star,
    label: 'Extraer logros STAR',
    prompt: 'Hazme preguntas sobre mi mayor desafío o proyecto laboral para redactar un caso de éxito con métricas verificables bajo el método STAR.'
  },
  {
    icon: TrendingUp,
    label: 'Subir compatibilidad al 90%',
    prompt: '¿Cómo puedo adaptar y redactar mejor mis experiencias laborales para alcanzar una compatibilidad superior al 90% en las ofertas del Radar?'
  },
  {
    icon: Sparkles,
    label: 'Palabras clave ATS',
    prompt: '¿Qué competencias técnicas, verbos de acción y palabras clave críticas debería añadir a mi CV para superar los filtros ATS de los empleadores?'
  },
  {
    icon: Briefcase,
    label: 'Ofertas top del Radar',
    prompt: '¿Cuáles son las vacantes laborales actualmente indexadas en mi Oportia Radar que presentan mayor afinidad con mi experiencia y perfil?'
  },
  {
    icon: Lightbulb,
    label: 'Mejorar resumen profesional',
    prompt: 'Ayúdame a redactar un resumen ejecutivo de 3 líneas con alto impacto, enfoque en resultados y métricas para el encabezado de mi currículum.'
  }
];

export const MemoryChat: React.FC<MemoryChatProps> = ({
  preferences,
  onPreferencesUpdated,
  llmSettings,
  onOpenSettings,
  className
}) => {
  const toast = useToast();
  const hasKey = Boolean(llmSettings?.has_active_key);

  const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content:
      '¡Hola! Soy Opi 👋\nPuedo ayudarte a encontrar oportunidades, analizar tu CV, preparar entrevistas y descubrir qué habilidades puedes desarrollar.\nTú decides qué hacer; yo te ayudo a organizar el camino.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    quickReplies: [
      '🎯 Extraer logros STAR de mi CV',
      '📈 ¿Cómo subir mi compatibilidad con ofertas?',
      '💼 Ver ofertas top en mi Radar',
      '🎓 Recomendar cursos y capacitaciones',
      '🚫 Definir mis límites laborales'
    ]
  };

  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFirstLoadRef = useRef(true);

  // Restore persistent conversation history from sovereign client storage
  useEffect(() => {
    getClientStore<ChatMessage[]>('oportia_chat_history').then(async (cached) => {
      const history = (cached && cached.length > 0)
        ? cached
        : await getClientStore<ChatMessage[]>('nexus_chat_history');
      if (history && Array.isArray(history) && history.length > 0) {
        setMessages(history);
      }
      // On initial load, set internal scroll to bottom instantly WITHOUT scrolling the whole browser page
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
        isFirstLoadRef.current = false;
      }, 100);
    });
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  const handleContainerScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Show 'scroll to bottom' button if user has scrolled up more than 120px
    const isUp = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottomBtn(isUp);
  };

  useEffect(() => {
    if (isFirstLoadRef.current) return;
    // Only auto-scroll to bottom if user is already near bottom (do not interrupt reading previous messages)
    if (!showScrollBottomBtn) {
      scrollToBottom('smooth');
    }
  }, [messages, isLoading]);

  const handleClearHistory = async () => {
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    await saveClientStore('oportia_chat_history', [DEFAULT_WELCOME_MESSAGE]);
    toast.info('Historial y contexto del chat reiniciados');
  };

  const handleSend = async (textToSend?: string) => {
    if (!hasKey) {
      if (onOpenSettings) onOpenSettings();
      toast.error('Opi requiere una clave de API activa para interactuar en vivo.');
      return;
    }

    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Extract chronological conversation history excluding initial welcome greeting
    const history = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveClientStore('oportia_chat_history', updatedMessages);

    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
    setIsLoading(true);
    setShowScrollBottomBtn(false);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      const res = await api.chatMemory(text, history);

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickReplies: res.quick_replies && res.quick_replies.length > 0 ? res.quick_replies : undefined,
        learnedStory: res.new_story
          ? {
              title: res.new_story.title,
              action: res.new_story.action,
              result_and_metrics: res.new_story.result_and_metrics
            }
          : undefined,
        learnedInsights: res.new_insights && res.new_insights.length > 0 ? res.new_insights : undefined,
        learnedDealBreakers:
          res.new_deal_breakers && res.new_deal_breakers.length > 0 ? res.new_deal_breakers : undefined
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      saveClientStore('oportia_chat_history', finalMessages);
      setShowScrollBottomBtn(false);
      setTimeout(() => scrollToBottom('smooth'), 50);

      if (res.preferences) {
        const oldVp = preferences?.profile_dna?.summary;
        const newVp = res.preferences?.profile_dna?.summary;
        if (newVp && newVp !== oldVp) {
          toast.success('Propuesta de Valor Actualizada', 'Tu ADN profesional ha sido calibrado.');
        }
        onPreferencesUpdated(res.preferences);
      }

      if (res.has_new_story && res.new_story?.title) {
        toast.success('Nueva Historia STAR aprendida', res.new_story.title);
      } else if (res.new_insights && res.new_insights.length > 0) {
        toast.success('Preferencia registrada en tu memoria IA');
      }
    } catch (e: any) {
      toast.error('Error al comunicarse con Opi: ' + (e?.message || e));
    } finally {
      setIsLoading(false);
    }
  };

  const historyCount = messages.filter((m) => m.id !== 'welcome').length;

  return (
    <div className={`flex flex-col rounded-3xl bg-white/85 dark:bg-zinc-900/85 border border-black/6 dark:border-white/8 shadow-xl backdrop-blur-xl overflow-hidden ${className || 'h-[620px] max-h-[calc(100vh-200px)] min-h-[500px]'}`}>
      
      {/* Chat Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-black/6 dark:border-white/8 bg-gray-50/70 dark:bg-zinc-900/70 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <img
            src="/opi-avatar.svg"
            alt="Opi"
            className="w-9 h-9 rounded-2xl object-cover shadow-xs border border-[#20A88A]/40 shrink-0"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                Opi — Tu copiloto profesional
              </h3>
              {hasKey ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{llmSettings?.provider?.toUpperCase() || 'IA Activa'}</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Clave Requerida</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#86868B] dark:text-[#A1A1A6] truncate max-w-[240px] sm:max-w-md">
              La IA organiza y te orienta. Tú decides tu camino.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {historyCount > 0 && (
            <span
              className="hidden md:inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60"
              title="El asistente mantiene el contexto completo de preguntas y respuestas de esta conversación"
            >
              <Brain className="w-3 h-3 shrink-0" />
              <span>Memoria activa ({historyCount} turnos)</span>
            </span>
          )}

          {historyCount > 0 && (
            <button
              onClick={handleClearHistory}
              className="px-2.5 py-1 rounded-xl text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 text-[11px] font-medium transition flex items-center space-x-1 cursor-pointer"
              title="Reiniciar conversación y comenzar un nuevo tema"
            >
              <RotateCcw className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">Limpiar chat</span>
            </button>
          )}

          <div className="text-right hidden sm:block shrink-0 border-l border-black/10 dark:border-white/10 pl-3">
            <span className="text-[11px] font-medium text-[#86868B] dark:text-[#A1A1A6]">Madurez:</span>
            <span className="ml-1 font-bold text-blue-600 dark:text-blue-400 text-xs">
              {preferences.memory_stats?.maturity_percentage || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area (Messages OR API Key Lock Screen) */}
      {!hasKey ? (
        /* GATED LOCK SCREEN: Active API Key Required + Zero-Knowledge Guarantee */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto animate-fade-in max-w-md mx-auto">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
              <KeyRound className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-base font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Opi Copiloto requiere una Clave de API
            </h4>
            <p className="text-xs text-[#86868B] dark:text-[#A1A1A6] leading-relaxed">
              Para conversar en vivo, extraer logros STAR con métricas y orientar tu desarrollo profesional, el copiloto necesita estar conectado a un motor de inteligencia artificial.
            </p>
          </div>

          {/* Security & Sovereign Storage Guarantee Box */}
          <div className="w-full text-left p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-2 text-xs text-blue-950 dark:text-blue-200">
            <div className="flex items-center space-x-2 font-bold text-blue-700 dark:text-blue-300">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Soberanía Digital & Privacidad por Diseño</span>
            </div>
            <p className="text-[11px] text-blue-900/90 dark:text-blue-200/90 leading-relaxed">
              <strong>Tu clave de API NO es guardada por la aplicación en servidores externos</strong> ni transferida a terceros. Se mantiene 100% cifrada y segura exclusivamente en tu propio equipo local.
            </p>
          </div>

          {/* Actions */}
          <div className="w-full space-y-2.5 pt-1">
            <button
              onClick={onOpenSettings}
              className="w-full min-h-[44px] px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Conectar Clave de API Segura</span>
            </button>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline pt-1"
            >
              <span>Obtener clave gratis en Google AI Studio (Gemini)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      ) : (
        /* ACTIVE MESSAGES SCROLL AREA */
        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
          <div
            ref={chatContainerRef}
            onScroll={handleContainerScroll}
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-0"
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs transition ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-gray-100/95 dark:bg-zinc-800/95 text-[#1D1D1F] dark:text-[#F5F5F7] rounded-tl-none border border-black/6 dark:border-white/8'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div
                      className={`text-[9px] mt-1.5 text-right ${
                        isUser ? 'text-blue-200' : 'text-[#86868B] dark:text-[#A1A1A6]'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Detected STAR Story Badge Card */}
                  {msg.learnedStory && (
                    <div className="w-full max-w-[88%] sm:max-w-[80%] rounded-2xl p-3.5 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5 animate-fade-in shadow-xs">
                      <div className="flex items-center space-x-1.5 font-bold text-[11px] text-amber-700 dark:text-amber-300">
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
                        <span>¡Caso de éxito extraído y guardado en memoria!</span>
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-white text-xs">
                        {msg.learnedStory.title}
                      </div>
                      {msg.learnedStory.result_and_metrics && (
                        <p className="text-[11px] text-gray-700 dark:text-gray-300">
                          <strong className="text-amber-600 dark:text-amber-400 font-semibold">Métrica: </strong>
                          {msg.learnedStory.result_and_metrics}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Detected Insights Badge */}
                  {msg.learnedInsights && msg.learnedInsights.length > 0 && (
                    <div className="w-full max-w-[88%] sm:max-w-[80%] rounded-2xl p-3 bg-indigo-50/90 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1 animate-fade-in">
                      <div className="flex items-center space-x-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                        <Lightbulb className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Regla de afinidad aprendida:</span>
                      </div>
                      {msg.learnedInsights.map((ins, i) => (
                        <div key={i} className="text-gray-700 dark:text-gray-300 ml-4 list-disc">
                          • {ins}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Detected Deal-Breakers Badge */}
                  {msg.learnedDealBreakers && msg.learnedDealBreakers.length > 0 && (
                    <div className="w-full max-w-[88%] sm:max-w-[80%] rounded-2xl p-3 bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/60 text-[11px] text-rose-900 dark:text-rose-200 space-y-1 animate-fade-in">
                      <div className="flex items-center space-x-1.5 font-bold text-rose-700 dark:text-rose-300">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                        <span>Límite / Deal-Breaker innegociable registrado:</span>
                      </div>
                      {msg.learnedDealBreakers.map((db_item, i) => (
                        <div key={i} className="text-gray-700 dark:text-gray-300 ml-4 list-disc">
                          • {db_item}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Proactive Quick Reply Chips */}
                  {!isUser && msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5 max-w-[95%] animate-fade-in">
                      {msg.quickReplies.map((qr, qIdx) => (
                        <button
                          key={qIdx}
                          type="button"
                          onClick={() => handleSend(qr)}
                          disabled={isLoading}
                          className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 text-xs font-semibold transition active:scale-95 shadow-2xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <span className="text-[11px]">💬</span>
                          <span>{qr}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center space-x-2 text-[#86868B] dark:text-[#A1A1A6] text-xs py-2 animate-pulse">
                <div className="w-4 h-4 rounded-full border-2 border-[#20A88A] border-t-transparent animate-spin" />
                <span>Opi está analizando tu consulta y organizando recomendaciones...</span>
              </div>
            )}
          </div>

          {/* Floating 'Ir al final' pill when scrolled up */}
          {showScrollBottomBtn && (
            <button
              type="button"
              onClick={() => {
                scrollToBottom('smooth');
                setShowScrollBottomBtn(false);
              }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-blue-600/90 hover:bg-blue-600 text-white text-[11px] font-semibold shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center space-x-1.5 z-10 animate-fade-in cursor-pointer border border-white/20"
            >
              <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
              <span>Ir a los últimos mensajes</span>
            </button>
          )}
        </div>
      )}

      {/* Suggested Prompt Pills (Only active when key is configured) */}
      {hasKey && (
        <div className="px-3.5 sm:px-4 py-2 border-t border-black/6 dark:border-white/8 bg-gray-50/60 dark:bg-zinc-900/60 overflow-x-auto no-scrollbar flex items-center space-x-2 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1A6] shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-500" />
            <span>Sugerencias:</span>
          </span>
          {ACTIONABLE_SUGGESTIONS.map((item, i) => {
            const IconComp = item.icon;
            return (
              <button
                key={i}
                onClick={() => handleSend(item.prompt)}
                disabled={isLoading}
                className="min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-zinc-800 text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/6 dark:border-white/8 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition whitespace-nowrap shrink-0 shadow-2xs disabled:opacity-50 active:scale-95 cursor-pointer flex items-center space-x-1.5"
                title={item.prompt}
              >
                <IconComp className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Chat Input Box */}
      <div className="p-3 sm:p-4 border-t border-black/6 dark:border-white/8 bg-white/95 dark:bg-zinc-900/95 shrink-0">
        {!hasKey ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 rounded-2xl bg-gray-100/70 dark:bg-zinc-800/60 border border-black/6 dark:border-white/8 text-xs text-[#86868B] dark:text-[#A1A1A6]">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Chat en pausa. Conecta tu API key para habilitar la conversación interactiva.</span>
            </div>
            <button
              onClick={onOpenSettings}
              className="min-h-[36px] px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition shrink-0 cursor-pointer active:scale-95"
            >
              Conectar Clave
            </button>
          </div>
        ) : (
          <div className="flex items-end space-x-2">
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Escribe a Opi: consulta ofertas, comparte un logro o define condiciones... (Enter para enviar)"
                rows={1}
                disabled={isLoading}
                className="w-full max-h-32 min-h-[44px] px-4 py-3 rounded-2xl bg-gray-100/90 dark:bg-zinc-800/90 border border-black/6 dark:border-white/8 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-hidden text-xs resize-none placeholder-[#86868B] dark:placeholder-[#A1A1A6] transition leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>

            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              className="min-h-[44px] min-w-[44px] rounded-2xl bg-[#173B50] hover:bg-[#1E3B50] dark:bg-[#20A88A] dark:hover:bg-[#1C967A] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 shadow-md shadow-[#173B50]/20 transition cursor-pointer active:scale-95"
              title="Enviar mensaje a Opi"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
