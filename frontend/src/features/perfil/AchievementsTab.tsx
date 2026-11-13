import React, { useState } from 'react';
import type { UserPreferences, LearnedStarStory } from '../../types';
import { Award, Plus, Trash2, HelpCircle, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { useToast } from '../../components/Toast';

interface AchievementsTabProps {
  preferences: UserPreferences;
  onPreferencesUpdated: (updated: UserPreferences) => void;
}

export const AchievementsTab: React.FC<AchievementsTabProps> = ({
  preferences,
  onPreferencesUpdated
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [situation, setSituation] = useState('');
  const [task, setTask] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [skills, setSkills] = useState('');
  const toast = useToast();

  const stories = preferences.learned_star_stories || [];

  const handleSaveStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !action.trim() || !result.trim()) {
      toast.info('Por favor completa al menos el título, la acción tomada y el resultado obtenido.');
      return;
    }

    const newStory: LearnedStarStory = {
      id: 'star_' + Date.now(),
      title: title.trim(),
      situation_and_task: `${situation.trim() ? `Situación: ${situation.trim()} ` : ''}${task.trim() ? `Tarea: ${task.trim()}` : ''}`.trim(),
      action: action.trim(),
      result_and_metrics: result.trim(),
      key_skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
      source: 'manual',
      created_at: new Date().toISOString()
    };

    const updated = {
      ...preferences,
      learned_star_stories: [newStory, ...stories]
    };

    onPreferencesUpdated(updated);
    toast.success('Logro STAR guardado en tu perfil');
    setIsAdding(false);
    setTitle('');
    setSituation('');
    setTask('');
    setAction('');
    setResult('');
    setSkills('');
  };

  const handleDeleteStory = (id: string) => {
    const next = stories.filter((s) => s.id !== id);
    onPreferencesUpdated({ ...preferences, learned_star_stories: next });
    toast.info('Logro eliminado');
  };

  return (
    <div className="space-y-6">
      {/* Cabecera y botón Nuevo logro */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#20A88A]" />
            Mis Logros (Método STAR)
          </h2>
          <p className="text-xs text-gray-500">
            Historias estructuradas para responder con impacto en entrevistas: Situación, Tarea, Acción y Resultado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20A88A] hover:bg-[#18856d] text-white text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? 'Cancelar' : 'Agregar nuevo logro'}</span>
        </button>
      </div>

      {/* Formulario guiado STAR */}
      {isAdding && (
        <form onSubmit={handleSaveStory} className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-md space-y-4 animate-fade-in text-xs">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#20A88A]" />
            Nuevo Logro Profesional Guiado
          </h3>

          <div>
            <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
              Título del logro o proyecto
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Rediseño de arquitectura cloud para reducir costos operativos"
              className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Situación */}
            <div>
              <label className="block text-blue-700 dark:text-blue-400 font-bold mb-1">
                S — Situación (Contexto y desafío inicial)
              </label>
              <textarea
                rows={2}
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="La plataforma enfrentaba caídas por sobrecarga de tráfico durante promociones..."
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
              />
            </div>

            {/* Tarea */}
            <div>
              <label className="block text-indigo-700 dark:text-indigo-400 font-bold mb-1">
                T — Tarea (Tu rol y responsabilidad)
              </label>
              <textarea
                rows={2}
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Fui asignado como líder técnico para rediseñar la infraestructura en 2 meses..."
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Acción */}
            <div>
              <label className="block text-teal-700 dark:text-teal-400 font-bold mb-1">
                A — Acción (Decisiones e iniciativas técnicas)
              </label>
              <textarea
                rows={2}
                required
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Migré servicios monolíticos a contenedores, implementé auto-scaling y caché distribuida..."
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
              />
            </div>

            {/* Resultado */}
            <div>
              <label className="block text-emerald-700 dark:text-emerald-400 font-bold mb-1">
                R — Resultado (Impacto y métricas comprobables)
              </label>
              <textarea
                rows={2}
                required
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="Disponibilidad subió al 99.98% y redujimos el gasto de servidores en un 32%..."
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
              Habilidades clave asociadas (separadas por coma)
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="AWS, Docker, Resiliencia, Liderazgo técnico..."
              className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#20A88A] hover:bg-[#18856d] text-white font-semibold shadow-xs"
            >
              Guardar Logro STAR
            </button>
          </div>
        </form>
      )}

      {/* Lista de historias guardadas */}
      <div className="space-y-3">
        {stories.length > 0 ? (
          stories.map((story) => (
            <div
              key={story.id}
              className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {story.title}
                  </h4>
                  {story.created_at && (
                    <span className="text-xs text-gray-400">
                      Registrada el {new Date(story.created_at).toLocaleDateString('es-CL')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteStory(story.id)}
                  className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                  title="Eliminar historia"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {story.situation_and_task && (
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  <strong>Contexto:</strong> {story.situation_and_task}
                </p>
              )}

              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                <strong>Acción:</strong> {story.action}
              </p>

              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                <strong>Impacto (R):</strong> {story.result_and_metrics}
              </div>

              {story.key_skills && story.key_skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {story.key_skills.map((sk, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 text-xs text-gray-400">
            Aún no has registrado logros STAR. Haz clic en "Agregar nuevo logro" para preparar tus mejores respuestas.
          </div>
        )}
      </div>
    </div>
  );
};
