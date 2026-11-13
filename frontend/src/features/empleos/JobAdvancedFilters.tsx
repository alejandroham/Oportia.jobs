import React from 'react';
import { CHILE_REGIONS } from '../../utils/chileRegions';
import { RotateCcw, MapPin, DollarSign, Globe } from 'lucide-react';

interface JobAdvancedFiltersProps {
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  selectedCommune: string;
  onCommuneChange: (commune: string) => void;
  minSalary: number | undefined;
  onMinSalaryChange: (val: number | undefined) => void;
  selectedSource: string;
  onSourceChange: (source: string) => void;
  onResetFilters: () => void;
  className?: string;
}

export const JobAdvancedFilters: React.FC<JobAdvancedFiltersProps> = ({
  selectedRegion,
  onRegionChange,
  selectedCommune,
  onCommuneChange,
  minSalary,
  onMinSalaryChange,
  selectedSource,
  onSourceChange,
  onResetFilters,
  className = ''
}) => {
  const currentRegionObj = CHILE_REGIONS.find((r) => r.name === selectedRegion);
  const communes = currentRegionObj ? currentRegionObj.communes : [];

  return (
    <div className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/90 dark:border-zinc-800 shadow-sm space-y-4 animate-fade-in ${className}`}>
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Filtros de Búsqueda Avanzada
        </h4>
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restablecer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Región */}
        <div className="space-y-1">
          <label className="block text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#20A88A]" />
            Región de Chile
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => {
              const reg = e.target.value;
              onRegionChange(reg);
              onCommuneChange('');
            }}
            className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none"
          >
            <option value="">Todas las regiones</option>
            {CHILE_REGIONS.map((r) => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Comuna */}
        <div className="space-y-1">
          <label className="block text-gray-600 dark:text-gray-400 font-medium">
            Comuna
          </label>
          <select
            value={selectedCommune}
            disabled={!selectedRegion}
            onChange={(e) => onCommuneChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 focus:outline-none"
          >
            <option value="">Todas las comunas</option>
            {communes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Salario mínimo aproximado */}
        <div className="space-y-1">
          <label className="block text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-[#20A88A]" />
            Salario mín. (CLP)
          </label>
          <input
            type="number"
            step="100000"
            min="0"
            value={minSalary || ''}
            onChange={(e) => onMinSalaryChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Ej. 1.000.000"
            className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none"
          />
        </div>

        {/* Fuente / Portal */}
        <div className="space-y-1">
          <label className="block text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
            <Globe className="w-3 h-3 text-[#20A88A]" />
            Portal de origen
          </label>
          <select
            value={selectedSource}
            onChange={(e) => onSourceChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none"
          >
            <option value="all">Todas las fuentes</option>
            <option value="getonbrd">Get on Board</option>
            <option value="computrabajo">CompuTrabajo</option>
            <option value="linkedin">LinkedIn</option>
            <option value="chiletrabajos">ChileTrabajos</option>
            <option value="manual">Importadas manualmente</option>
          </select>
        </div>
      </div>
    </div>
  );
};
