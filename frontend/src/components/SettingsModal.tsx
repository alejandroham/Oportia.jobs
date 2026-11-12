import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Check,
  Info,
  Cpu,
  Sparkles,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Layers,
  AlertTriangle,
  Shield,
  Lock
} from 'lucide-react';
import type { LLMSettings, ModelOption } from '../types';
import { api } from '../api';
import { useToast } from './Toast';
import { encryptApiKeyLocally, decryptApiKeyLocally } from '../utils/crypto';

const DEFAULT_PROVIDER_MODELS: Record<'gemini' | 'openai' | 'claude', ModelOption[]> = {
  gemini: [
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      tag: 'Recomendado Estable',
      status: 'recommended',
      description: 'Modelo insignia oficial de Google de última generación, baja latencia y alta cuota.'
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      tag: 'Rápido & Eficiente',
      status: 'active',
      description: 'Excelente velocidad para parseo rápido de CV y resúmenes ejecutivos.'
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      tag: 'Avanzado',
      status: 'active',
      description: 'Capacidad analítica ampliada para evaluaciones complejas de compatibilidad.'
    }
  ],
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o (Omni)',
      tag: 'Recomendado',
      status: 'recommended',
      description: 'Modelo insignia de OpenAI. Excelente comprensión de requisitos laborales y redacción fluida.'
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      tag: 'Rápido & Económico',
      status: 'active',
      description: 'Versión ligera, económica y muy veloz para clasificación masiva de empleos.'
    },
    {
      id: 'o1',
      name: 'OpenAI o1',
      tag: 'Razonamiento Profundo',
      status: 'active',
      description: 'Modelo de razonamiento reflexivo para análisis minucioso de ajuste candidato-vacante.'
    },
    {
      id: 'o3-mini',
      name: 'OpenAI o3-mini',
      tag: 'Nuevo • STEM & Lógica',
      status: 'active',
      description: 'Razonamiento ágil y optimizado para lógica estructurada y preparación de entrevistas.'
    }
  ],
  claude: [
    {
      id: 'claude-3-5-sonnet-latest',
      name: 'Claude 3.5 Sonnet',
      tag: 'Recomendado',
      status: 'recommended',
      description: 'El modelo más elogiado para redacción elegante de cartas de presentación y personalización de CVs.'
    },
    {
      id: 'claude-3-5-haiku-latest',
      name: 'Claude 3.5 Haiku',
      tag: 'Ultra Rápido',
      status: 'active',
      description: 'Velocidad de respuesta casi instantánea con excelente sintaxis y análisis.'
    },
    {
      id: 'claude-3-7-sonnet-latest',
      name: 'Claude 3.7 Sonnet',
      tag: 'Última Generación',
      status: 'active',
      description: 'Modelo híbrido de razonamiento profundo y respuesta rápida para preparación de entrevistas.'
    }
  ]
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LLMSettings;
  onSettingsUpdated: (s: LLMSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsUpdated
}) => {
  const toast = useToast();
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'claude'>(settings.provider || 'gemini');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelText, setCustomModelText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const getProviderModels = (p: 'gemini' | 'openai' | 'claude'): ModelOption[] => {
    return settings.available_models?.[p] || DEFAULT_PROVIDER_MODELS[p];
  };

  const getCurrentDefaultModel = (p: 'gemini' | 'openai' | 'claude'): string => {
    if (p === 'gemini') return settings.gemini_model || 'gemini-2.0-flash';
    if (p === 'openai') return settings.openai_model || 'gpt-4o';
    return settings.claude_model || 'claude-3-5-sonnet-latest';
  };

  useEffect(() => {
    if (isOpen) {
      const curProvider = settings.provider || 'gemini';
      setProvider(curProvider);
      
      const localKey = localStorage.getItem(`job_search_llm_key_${curProvider}`);
      if (localKey && !apiKey) {
        decryptApiKeyLocally(localKey).then((dec) => {
          if (dec) setApiKey(dec);
        });
      }

      const activeModel = getCurrentDefaultModel(curProvider);
      const isKnown = getProviderModels(curProvider).some(m => m.id === activeModel);
      if (isKnown) {
        setSelectedModel(activeModel);
        setIsCustomModel(false);
        setCustomModelText('');
      } else {
        setSelectedModel('custom');
        setIsCustomModel(true);
        setCustomModelText(activeModel);
      }
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleProviderChange = async (p: 'gemini' | 'openai' | 'claude') => {
    setProvider(p);
    const cachedKey = localStorage.getItem(`job_search_llm_key_${p}`) || '';
    if (cachedKey) {
      const decrypted = await decryptApiKeyLocally(cachedKey);
      setApiKey(decrypted);
    } else {
      setApiKey('');
    }

    const activeModel = getCurrentDefaultModel(p);
    const models = getProviderModels(p);
    const isKnown = models.some(m => m.id === activeModel);
    if (isKnown) {
      setSelectedModel(activeModel);
      setIsCustomModel(false);
      setCustomModelText('');
    } else {
      setSelectedModel('custom');
      setIsCustomModel(true);
      setCustomModelText(activeModel);
    }
  };

  const handleModelDropdownChange = (val: string) => {
    if (val === 'custom') {
      setSelectedModel('custom');
      setIsCustomModel(true);
      if (!customModelText) {
        setCustomModelText(getCurrentDefaultModel(provider));
      }
    } else {
      setSelectedModel(val);
      setIsCustomModel(false);
    }
  };

  const handleResetRecommended = () => {
    const models = getProviderModels(provider);
    const recommended = models.find(m => m.status === 'recommended') || models[0];
    setSelectedModel(recommended.id);
    setIsCustomModel(false);
    setCustomModelText('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const trimmedKey = apiKey.trim();
      if (trimmedKey) {
        const encryptedKey = await encryptApiKeyLocally(trimmedKey);
        localStorage.setItem(`job_search_llm_key_${provider}`, encryptedKey);
      } else {
        localStorage.removeItem(`job_search_llm_key_${provider}`);
      }
      localStorage.setItem('job_search_default_provider', provider);

      const finalModelName = isCustomModel ? customModelText.trim() : selectedModel;
      if (finalModelName) {
        localStorage.setItem(`job_search_llm_model_${provider}`, finalModelName);
      }

      // Notify backend about preferred provider/model in RAM (never send api_key)
      try {
        await api.updateSettings({
          provider,
          model_name: finalModelName ? finalModelName : undefined
        });
      } catch (netErr: any) {
        console.warn('Backend sync delayed or in cold start:', netErr);
      }

      const hasKey = Boolean(trimmedKey);
      const updatedSettings: LLMSettings = {
        ...settings,
        provider,
        has_active_key: hasKey,
        has_gemini_key: provider === 'gemini' ? hasKey : Boolean(localStorage.getItem('job_search_llm_key_gemini')),
        has_openai_key: provider === 'openai' ? hasKey : Boolean(localStorage.getItem('job_search_llm_key_openai')),
        has_claude_key: provider === 'claude' ? hasKey : Boolean(localStorage.getItem('job_search_llm_key_claude')),
        active_model_name: finalModelName,
        status_label: hasKey ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} (${finalModelName})` : 'IA no conectada',
        status_color: hasKey ? 'green' : 'yellow',
        gemini_model: provider === 'gemini' ? finalModelName : (localStorage.getItem('job_search_llm_model_gemini') || 'gemini-2.0-flash'),
        openai_model: provider === 'openai' ? finalModelName : (localStorage.getItem('job_search_llm_model_openai') || 'gpt-4o'),
        claude_model: provider === 'claude' ? finalModelName : (localStorage.getItem('job_search_llm_model_claude') || 'claude-3-5-sonnet-latest')
      };
      onSettingsUpdated(updatedSettings);

      setSavedSuccess(true);
      toast.success('Configuración y clave de IA guardadas (Cifradas)');
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (e: any) {
      toast.error('Error guardando configuración: ' + (e?.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearKey = async () => {
    try {
      localStorage.removeItem(`job_search_llm_key_${provider}`);
      setApiKey('');
      await api.updateSettings({
        provider,
        model_name: undefined
      }).catch(() => {});
      await api.purgeSettings().catch(() => {});
      const updatedSettings: LLMSettings = {
        ...settings,
        has_active_key: false,
        has_gemini_key: provider === 'gemini' ? false : Boolean(localStorage.getItem('job_search_llm_key_gemini')),
        has_openai_key: provider === 'openai' ? false : Boolean(localStorage.getItem('job_search_llm_key_openai')),
        has_claude_key: provider === 'claude' ? false : Boolean(localStorage.getItem('job_search_llm_key_claude')),
        status_label: 'IA no conectada',
        status_color: 'yellow'
      };
      onSettingsUpdated(updatedSettings);
      toast.info(`Clave de ${provider.toUpperCase()} purgada del navegador. Modo sin IA activo.`);
    } catch (e: any) {
      toast.error('Error al borrar la clave: ' + (e?.message || e));
    }
  };

  const currentModelInfo = getProviderModels(provider).find(m => m.id === selectedModel);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="apple-glass apple-card max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 sm:space-y-5 rounded-t-3xl sm:rounded-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Motor de Inteligencia Artificial (LLM)
              </h3>
              <p className="text-[11px] text-gray-500">Modelos Oficiales y Claves Locales</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informational banner */}
        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 flex items-start space-x-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Puedes seleccionar modelos oficiales vigentes (2026) para evitar versiones descontinuadas. Todas las credenciales se guardan <strong>100% en local</strong> y nunca en GitHub.
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* 1. Provider selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              1. Selecciona el Proveedor de IA:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'gemini', label: 'Google Gemini', badge: 'Recomendado' },
                { id: 'openai', label: 'OpenAI (ChatGPT)', badge: 'GPT-4o & o1' },
                { id: 'claude', label: 'Anthropic Claude', badge: 'Sonnet 3.5' }
              ].map((p) => {
                const isSelected = provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderChange(p.id as any)}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-600 text-blue-900 dark:text-blue-200 font-semibold shadow-xs'
                        : 'bg-gray-50 dark:bg-zinc-800 border-black/5 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs">{p.label}</div>
                    <div className="text-[10px] text-gray-400 font-normal">{p.badge}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Model Selection Dropdown (Avoids obsolete/discontinued models) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300">
              <span className="flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>2. Modelo a Utilizar:</span>
              </span>
              <button
                type="button"
                onClick={handleResetRecommended}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                title="Restaurar el modelo recomendado oficial"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar Recomendado</span>
              </button>
            </div>

            {/* Select Dropdown */}
            <div className="relative">
              <select
                value={isCustomModel ? 'custom' : selectedModel}
                onChange={(e) => handleModelDropdownChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
              >
                <optgroup label={`Modelos Oficiales Vigentes (${provider.toUpperCase()})`}>
                  {getProviderModels(provider).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — [{m.tag}]
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Opciones Avanzadas">
                  <option value="custom">✍️ Escribir otro modelo manualmente...</option>
                </optgroup>
              </select>
            </div>

            {/* Custom text input if custom selected */}
            {isCustomModel && (
              <div className="space-y-1 animate-fade-in pt-1">
                <input
                  type="text"
                  placeholder="Escribe el identificador exacto del modelo (ej. gemini-2.5-pro)..."
                  value={customModelText}
                  onChange={(e) => setCustomModelText(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-100 dark:bg-zinc-800 border border-blue-500/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                <p className="text-[10px] text-gray-400">
                  Verifica que el modelo ingresado no esté descontinuado y que tu clave tenga permisos habilitados en tu consola de proveedor.
                </p>
              </div>
            )}

            {/* Model Details Card */}
            {currentModelInfo && !isCustomModel && (
              <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 space-y-1 animate-fade-in text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-medium text-gray-900 dark:text-white">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{currentModelInfo.name}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    currentModelInfo.status === 'recommended'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                      : currentModelInfo.status === 'legacy'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
                  }`}>
                    {currentModelInfo.tag}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {currentModelInfo.description}
                </p>
                {currentModelInfo.status === 'legacy' && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center space-x-1 pt-0.5">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Nota: Este modelo pertenece a una generación previa. Se recomienda usar {getProviderModels(provider)[0].name}.</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 3. API Key */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300">
              <span>3. Clave API ({provider.toUpperCase()} API KEY):</span>
              <span className="text-[10px]">
                {provider === 'gemini' && (settings.has_gemini_key ? <span className="text-emerald-500 font-medium">● Activa en local</span> : <span className="text-amber-500 font-medium">○ Sin clave</span>)}
                {provider === 'openai' && (settings.has_openai_key ? <span className="text-emerald-500 font-medium">● Activa en local</span> : <span className="text-amber-500 font-medium">○ Sin clave</span>)}
                {provider === 'claude' && (settings.has_claude_key ? <span className="text-emerald-500 font-medium">● Activa en local</span> : <span className="text-amber-500 font-medium">○ Sin clave</span>)}
              </span>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                placeholder={`Ingresa tu clave de ${provider}...`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              {apiKey && (
                <button
                  type="button"
                  onClick={() => setApiKey('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center space-x-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-xl border border-emerald-200/40 dark:border-emerald-900/30">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>
                <strong>Almacenamiento Cifrado Local:</strong> Tu clave se cifra en tu navegador y en tu equipo. Cumple con la Ley 19.628 de Protección de Datos. Si la dejas vacía, el sistema opera en Modo Heurístico Offline.
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
            <div>
              {(settings.has_gemini_key || settings.has_openai_key || settings.has_claude_key) && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center space-x-1 transition"
                  title="Eliminar clave y pasar a modo offline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Borrar clave</span>
                </button>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>¡Guardado!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Guardando...' : 'Guardar en Local'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer Info / Version */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5 text-center">
            <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
              Oportia Jobs IA · v1.0.1
            </span>
          </div>
        </form>

      </div>
    </div>
  );
};
