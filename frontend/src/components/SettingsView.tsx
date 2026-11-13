import React, { useState } from 'react';
import { Cpu, Shield, Sun, Moon, Info } from 'lucide-react';
import { useAppStore } from '../state/useAppStore';
import { SettingsAIPanel } from './settings/SettingsAIPanel';
import { SettingsPrivacyPanel } from './settings/SettingsPrivacyPanel';

export const SettingsView: React.FC = () => {
  const { darkMode, setDarkMode } = useAppStore();
  const [activeSubTab, setActiveSubTab] = useState<'ai' | 'privacy' | 'appearance' | 'about'>('ai');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in text-xs">
      {/* Top Header & Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-black/8 dark:border-white/8 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Ajustes</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configura tu motor de IA, privacidad, apariencia y respaldos locales.
          </p>
        </div>
        <nav
          aria-label="Pestañas de ajustes"
          className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 overflow-x-auto no-scrollbar"
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('ai')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'ai'
                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Motor de IA
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('privacy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'privacy'
                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Privacidad & Datos
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('appearance')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'appearance'
                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Apariencia
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('about')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === 'about'
                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Acerca de
          </button>
        </nav>
      </div>

      {/* Subtab Content Panels */}
      <div className="pt-2">
        {activeSubTab === 'ai' && <SettingsAIPanel />}

        {activeSubTab === 'privacy' && <SettingsPrivacyPanel />}

        {activeSubTab === 'appearance' && (
          <div className="apple-glass apple-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Apariencia y Tema Visual</h2>
                <p className="text-xs text-gray-500">Elige la estética visual que te resulte más cómoda.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => setDarkMode(false)}
                className={`p-4 min-h-[44px] rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
                  !darkMode
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-ink dark:text-brand-200 font-bold shadow-xs'
                    : 'border-black/8 dark:border-white/8 hover:bg-gray-50 dark:hover:bg-zinc-800 text-ink-muted'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-xs font-bold">Modo Claro</p>
                  <p className="text-xs text-ink-muted">Fondo limpio y tipografía de alto contraste.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDarkMode(true)}
                className={`p-4 min-h-[44px] rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
                  darkMode
                    ? 'border-brand-500 bg-zinc-800 text-white font-bold shadow-xs'
                    : 'border-black/8 dark:border-white/8 hover:bg-gray-50 dark:hover:bg-zinc-800 text-ink-muted'
                }`}
              >
                <Moon className="w-5 h-5 text-teal-400" />
                <div>
                  <p className="text-xs font-bold">Modo Oscuro</p>
                  <p className="text-xs text-ink-muted">Reduce la fatiga visual en entornos con poca luz.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {activeSubTab === 'about' && (
          <div className="apple-glass apple-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-ink dark:text-white">Acerca de Oportia Jobs IA</h2>
                <p className="text-xs text-ink-muted">Versión 1.1.0 — Ecosistema inteligente de empleabilidad y desarrollo profesional.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 space-y-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              <p>
                <strong className="text-gray-900 dark:text-white">Arquitectura sin Estado (Opción A):</strong> Tus datos, postulaciones y claves se custodian únicamente en tu navegador (IndexedDB). El backend procesa cómputos en memoria y no guarda información en disco.
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white">Aviso de Responsabilidad:</strong> La Inteligencia Artificial puede cometer errores o alucinar datos. Revisa y aprueba siempre tus antecedentes y cartas de presentación antes de postular.
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white">Stack Oficial:</strong> React 18, Vite, TypeScript, Tailwind CSS, FastAPI, Pydantic.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
