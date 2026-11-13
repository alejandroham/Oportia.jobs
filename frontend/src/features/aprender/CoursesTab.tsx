import React, { useState } from 'react';
import type { LearningCourseResource } from '../../types';
import { Search, ExternalLink, Award, Clock, DollarSign, BookOpen } from 'lucide-react';

interface CoursesTabProps {
  courses: LearningCourseResource[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  costFilter: string;
  onCostFilterChange: (val: string) => void;
  onSearch: () => void;
}

export const CoursesTab: React.FC<CoursesTabProps> = ({
  courses,
  isLoading,
  searchQuery,
  onSearchChange,
  costFilter,
  onCostFilterChange,
  onSearch
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros de cursos */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#20A88A]" />
            Cursos Gratuitos y Verificados
          </h2>
          <span className="text-xs text-gray-500">
            {courses.length} recursos disponibles (Sence, Coursera, Platzi, edX)
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por tecnología o habilidad (ej. SQL, Python, Scrum)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none"
            />
          </div>

          <select
            value={costFilter}
            onChange={(e) => onCostFilterChange(e.target.value)}
            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 focus:outline-none font-medium"
          >
            <option value="all">Todos los precios</option>
            <option value="Gratis">100% Gratuitos / Sence</option>
            <option value="De pago">Con certificación de pago</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#20A88A] hover:bg-[#18856d] text-white font-semibold shadow-xs transition"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Grid de cursos */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-gray-400">
          Buscando cursos en plataformas verificadas...
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <div
              key={course.id || course.title}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between gap-3 text-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#20A88A] uppercase tracking-wider text-[10px]">
                    {course.platform}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    course.cost?.toLowerCase().includes('gratis') ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {course.cost || 'Gratis'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">
                  {course.title}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                  {course.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-gray-500 text-[11px] pt-1">
                  {course.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{course.duration}</span>
                    </span>
                  )}
                  {course.has_certificate && (
                    <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                      <Award className="w-3 h-3" />
                      <span>Certificado</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
                <a
                  href={course.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300 font-semibold border border-gray-200 dark:border-zinc-700 transition"
                >
                  <span>Ir al curso</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 text-xs text-gray-400">
          No se encontraron cursos con los filtros seleccionados.
        </div>
      )}
    </div>
  );
};
