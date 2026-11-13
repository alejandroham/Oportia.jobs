import React, { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, MoreVertical, Link2, Sparkles, Building2, Trash2, Loader2 } from 'lucide-react';

interface JobSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onScan: () => void;
  isScanning: boolean;
  modalityFilter: string;
  onModalityChange: (val: string) => void;
  regionFilter: string;
  onRegionChange: (val: string) => void;
  sortBy: string;
  onSortChange: (val: string) => void;
  isAdvancedOpen: boolean;
  onToggleAdvanced: () => void;
  onOpenImportUrl: () => void;
  onBatchRank: () => void;
  onOpenCompanyPortals: () => void;
  onClearRadar: () => void;
  isBatchRanking?: boolean;
}

export const JobSearchBar: React.FC<JobSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  onScan,
  isScanning,
  modalityFilter,
  onModalityChange,
  regionFilter,
  onRegionChange,
  sortBy,
  onSortChange,
  isAdvancedOpen,
  onToggleAdvanced,
  onOpenImportUrl,
  onBatchRank,
  onOpenCompanyPortals,
  onClearRadar,
  isBatchRanking = false
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onScan();
  };

  return (
    <div className="space-y-3">
      {/* Fila principal: Buscador + Botón Buscar + Menú ••• */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por cargo, palabra clave o empresa (ej. Frontend, Python, FinTech)..."
            aria-label="Buscar por cargo, palabra clave o empresa"
            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-sm text-ink dark:text-gray-100 placeholder-ink-muted focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none shadow-xs"
          />
        </div>

        <button
          type="submit"
          disabled={isScanning}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand hover:bg-brand-600 text-white text-sm font-semibold shadow-xs transition disabled:opacity-50 shrink-0 min-h-[44px] cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Buscando...</span>
            </>
          ) : (
            <span>Buscar</span>
          )}
        </button>

        {/* Menú de acciones secundarias (•••) */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-ink-muted hover:text-ink dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
            title="Más acciones"
            aria-label="Más opciones"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xl py-1.5 z-20 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenImportUrl();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 flex items-center gap-2.5"
              >
                <Link2 className="w-4 h-4 text-gray-400" />
                <span>Importar oferta por URL</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onBatchRank();
                }}
                disabled={isBatchRanking}
                className="w-full px-3.5 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 flex items-center gap-2.5 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-brand" />
                <span>Ordenar ofertas con IA</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenCompanyPortals();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 flex items-center gap-2.5"
              >
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>Explorar portales de empresas</span>
              </button>

              <div className="border-t border-gray-100 dark:border-zinc-800 my-1" />

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onClearRadar();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Vaciar ofertas del radar</span>
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Fila de 3 filtros visibles + botón Más filtros */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Modalidad */}
          <select
            value={modalityFilter}
            onChange={(e) => onModalityChange(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300 font-medium focus:outline-none shadow-xs"
          >
            <option value="all">Todas las modalidades</option>
            <option value="Remoto">Solo Remoto</option>
            <option value="Híbrido">Híbrido</option>
            <option value="Presencial">Presencial</option>
          </select>

          {/* 2. Ubicación rápida */}
          <select
            value={regionFilter}
            onChange={(e) => onRegionChange(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300 font-medium focus:outline-none shadow-xs"
          >
            <option value="all">Todo Chile</option>
            <option value="user_region">En mi región</option>
          </select>

          {/* 3. Ordenar por */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300 font-medium focus:outline-none shadow-xs"
          >
            <option value="fit_desc">Mayor compatibilidad</option>
            <option value="recent">Más recientes</option>
            <option value="salary">Mejor salario estimado</option>
          </select>
        </div>

        {/* Botón toggle Más filtros */}
        <button
          type="button"
          onClick={onToggleAdvanced}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl border text-xs font-semibold transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none ${
            isAdvancedOpen
              ? 'bg-brand-50 dark:bg-brand-950/50 border-brand text-brand-700 dark:text-brand-300'
              : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-ink-muted hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{isAdvancedOpen ? 'Ocultar filtros' : 'Más filtros'}</span>
        </button>
      </div>
    </div>
  );
};
