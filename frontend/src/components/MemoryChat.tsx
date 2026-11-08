import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Brain,
  Sparkles,
  Star,
  ShieldAlert,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import type { UserPreferences } from '../types';
import { api } from '../api';
import { useToast } from './Toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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
}

export const MemoryChat: React.FC<MemoryChatProps> = ({
  preferences,
  onPreferencesUpdated
}) => {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '¡Hola! Soy Nexus, tu asistente de perfil profesional y búsqueda de empleo. Mi objetivo es estructurar con precisión tus mayores logros laborales en formato STAR, calibrar tus condiciones ideales de trabajo y ayudarte a consultar las mejores ofertas de tu Radar. ¿Qué proyecto reciente te gustaría registrar o qué vacantes deseas consultar?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.chatMemory(text, history);

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

      setMessages((prev) => [...prev, assistantMsg]);

      if (res.preferences) {
        onPreferencesUpdated(res.preferences);
      }

      if (res.has_new_story && res.new_story?.title) {
        toast.success('Nueva Historia STAR aprendida', res.new_story.title);
      } else if (res.new_insights && res.new_insights.length > 0) {
        toast.success('Preferencia registrada en tu memoria IA');
      }
    } catch (e: any) {
      toast.error('Error al procesar mensaje: ' + (e?.message || e));
    } finally {
      setIsLoading(false);
    }
  };

  const promptSuggestions = [
    '¿Qué ofertas laborales remotas tengo en el Radar?',
    'Quiero registrar un proyecto donde optimicé costos o infraestructura',
    'Solo busco empresas con trabajo 100% remoto y stack moderno',
    'Descarto ofertas presenciales o en sectores tradicionales'
  ];

  return (
    <div className="flex flex-col h-[650px] max-h-[75vh] rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-black/5 dark:border-white/5 shadow-xl backdrop-blur-md overflow-hidden">
      
      {/* Chat Header */}
      <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 bg-gray-50/60 dark:bg-zinc-900/60 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Nexus — Asistente de Perfil Profesional
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Nexus AI
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Estructura logros STAR, define preferencias y consulta vacantes reales del Radar con precisión.
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-[11px] font-medium text-gray-400">Madurez del Modelo:</span>
          <span className="ml-1.5 font-bold text-blue-600 dark:text-blue-400 text-xs">
            {preferences.memory_stats?.maturity_percentage || 0}%
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs transition ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-gray-100/90 dark:bg-zinc-800/90 text-gray-900 dark:text-gray-100 rounded-tl-none border border-black/5 dark:border-white/5'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div
                  className={`text-[9px] mt-1.5 text-right ${
                    isUser ? 'text-blue-200' : 'text-gray-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {/* Detected STAR Story Badge Card */}
              {msg.learnedStory && (
                <div className="w-full max-w-[85%] sm:max-w-[78%] rounded-2xl p-3 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1 animate-fade-in shadow-xs">
                  <div className="flex items-center space-x-1.5 font-bold text-[11px] text-amber-700 dark:text-amber-300">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>¡Caso de éxito extraído y guardado en tu memoria!</span>
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {msg.learnedStory.title}
                  </div>
                  {msg.learnedStory.result_and_metrics && (
                    <p className="text-[11px] text-gray-600 dark:text-gray-300">
                      <span className="font-medium text-amber-600 dark:text-amber-400">Métrica: </span>
                      {msg.learnedStory.result_and_metrics}
                    </p>
                  )}
                </div>
              )}

              {/* Detected Insights Badge */}
              {msg.learnedInsights && msg.learnedInsights.length > 0 && (
                <div className="w-full max-w-[85%] sm:max-w-[78%] rounded-2xl p-2.5 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1 animate-fade-in">
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
                <div className="w-full max-w-[85%] sm:max-w-[78%] rounded-2xl p-2.5 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/60 text-[11px] text-rose-900 dark:text-rose-200 space-y-1 animate-fade-in">
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
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center space-x-2 text-gray-400 text-xs py-2">
            <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <span>Nexus está analizando y respondiendo de forma concisa...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Pills */}
      <div className="px-4 py-2 border-t border-black/5 dark:border-white/5 bg-gray-50/40 dark:bg-zinc-900/40 overflow-x-auto no-scrollbar flex items-center space-x-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 shrink-0">
          Sugerencias:
        </span>
        {promptSuggestions.map((sugg, i) => (
          <button
            key={i}
            onClick={() => handleSend(sugg)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full text-[11px] bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition whitespace-nowrap shrink-0 shadow-xs disabled:opacity-50"
          >
            {sugg}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3.5 sm:p-4 border-t border-black/5 dark:border-white/5 bg-white dark:bg-zinc-900 flex items-end space-x-2">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escribe a Nexus: consulta ofertas del Radar, comparte un logro o define condiciones... (Enter)"
          rows={1}
          disabled={isLoading}
          className="flex-1 max-h-32 min-h-[42px] px-3.5 py-2.5 rounded-2xl bg-gray-100/80 dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-hidden text-xs resize-none placeholder-gray-400 dark:placeholder-gray-500 transition leading-relaxed"
        />

        <button
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || isLoading}
          className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 transition"
          title="Enviar a Nexus"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
