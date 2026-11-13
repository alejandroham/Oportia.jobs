import React, { useState, useEffect } from 'react';
import { Cpu, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../../state/useAppStore';
import { useToast } from '../Toast';
import { api } from '../../api';
import { encryptApiKeyLocally, decryptApiKeyLocally } from '../../utils/crypto';
import type { ModelOption, LLMSettings } from '../../types';

export const SettingsAIPanel: React.FC = () => {
  const toast = useToast();
  const { settings, setSettings } = useAppStore();

  const [provider, setProvider] = useState<'gemini' | 'openai' | 'claude'>(settings.provider || 'gemini');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [isSavingAI, setIsSavingAI] = useState(false);

  useEffect(() => {
    const curProvider = settings.provider || 'gemini';
    setProvider(curProvider);
    const localKey = localStorage.getItem(`job_search_llm_key_${curProvider}`);
    if (localKey) {
      decryptApiKeyLocally(localKey).then((plain) => {
        if (plain) setApiKey(plain);
      });
    } else {
      setApiKey('');
    }
    setSelectedModel(settings.active_model_name || '');
  }, [settings]);

  const handleProviderChange = async (p: 'gemini' | 'openai' | 'claude') => {
    setProvider(p);
    const cachedKey = localStorage.getItem(`job_search_llm_key_${p}`) || '';
    if (cachedKey) {
      const dec = await decryptApiKeyLocally(cachedKey);
      setApiKey(dec);
    } else {
      setApiKey('');
    }
    const cachedModel = localStorage.getItem(`job_search_llm_model_${p}`);
    if (cachedModel) {
      setSelectedModel(cachedModel);
    } else {
      const models = settings.available_models?.[p] || [];
      if (models.length > 0) {
        setSelectedModel(models[0].id);
      }
    }
  };

  const handleSaveAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAI(true);
    try {
      const trimmedKey = apiKey.trim();
      if (trimmedKey) {
        const encrypted = await encryptApiKeyLocally(trimmedKey);
        localStorage.setItem(`job_search_llm_key_${provider}`, encrypted);
      } else {
        localStorage.removeItem(`job_search_llm_key_${provider}`);
      }

      localStorage.setItem('job_search_default_provider', provider);
      if (selectedModel) {
        localStorage.setItem(`job_search_llm_model_${provider}`, selectedModel);
      }

      try {
        await api.updateSettings({
          provider,
          model_name: selectedModel ? selectedModel : undefined
        });
      } catch (netErr) {
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
        active_model_name: selectedModel,
        status_label: hasKey ? 'IA conectada' : 'IA no conectada',
        status_color: hasKey ? 'green' : 'yellow',
        gemini_model: provider === 'gemini' ? selectedModel : (localStorage.getItem('job_search_llm_model_gemini') || 'gemini-2.0-flash'),
        openai_model: provider === 'openai' ? selectedModel : (localStorage.getItem('job_search_llm_model_openai') || 'gpt-4o'),
        claude_model: provider === 'claude' ? selectedModel : (localStorage.getItem('job_search_llm_model_claude') || 'claude-3-5-sonnet-latest')
      };

      await setSettings(updatedSettings);

      toast.success(
        hasKey ? 'Clave de IA configurada con éxito' : 'Clave de IA desconectada',
        hasKey ? `Proveedor activo: ${provider.toUpperCase()}` : 'Modo sin IA'
      );
    } catch (err: any) {
      toast.error('Error al guardar configuración de IA: ' + (err?.message || err));
    } finally {
      setIsSavingAI(false);
    }
  };

  const handleClearAIKey = async () => {
    localStorage.removeItem(`job_search_llm_key_${provider}`);
    setApiKey('');
    await api.updateSettings({
      provider,
      model_name: undefined
    }).catch(() => {});
    await api.purgeSettings().catch(() => {});

    const updatedSettings: LLMSettings = {
      ...settings,
      provider,
      has_active_key: false,
      has_gemini_key: provider === 'gemini' ? false : Boolean(localStorage.getItem('job_search_llm_key_gemini')),
      has_openai_key: provider === 'openai' ? false : Boolean(localStorage.getItem('job_search_llm_key_openai')),
      has_claude_key: provider === 'claude' ? false : Boolean(localStorage.getItem('job_search_llm_key_claude')),
      status_label: 'IA no conectada',
      status_color: 'yellow'
    };

    await setSettings(updatedSettings);
    toast.info(`Clave de ${provider.toUpperCase()} desconectada.`);
  };

  const providerModels = settings.available_models?.[provider] || [];

  return (
    <form onSubmit={handleSaveAI} className="space-y-6">
      <div className="apple-glass apple-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Conexión con Inteligencia Artificial</h2>
              <p className="text-xs text-gray-500">Tus claves se guardan cifradas exclusivamente en tu navegador.</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${settings.has_active_key ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300'}`}>
            {settings.has_active_key ? 'IA conectada' : 'IA no conectada'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['gemini', 'openai', 'claude'] as const).map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition cursor-pointer ${provider === p ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
            >
              {p === 'gemini' ? 'Google Gemini' : p === 'openai' ? 'OpenAI' : 'Anthropic Claude'}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Modelo Oficial</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white"
          >
            {providerModels.map((m: ModelOption) => (
              <option key={m.id} value={m.id}>{m.name} ({m.tag})</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Clave de API ({provider.toUpperCase()})</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Pega aquí tu clave de API de ${provider}...`}
              className="w-full text-xs px-3 py-2 pr-10 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400">Tu clave nunca se guarda en el servidor. Solo viaja por petición cuando usas IA.</p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
          {apiKey ? (
            <button
              type="button"
              onClick={handleClearAIKey}
              className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Desconectar clave
            </button>
          ) : <div />}
          <button
            type="submit"
            disabled={isSavingAI}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            {isSavingAI ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </div>
    </form>
  );
};
