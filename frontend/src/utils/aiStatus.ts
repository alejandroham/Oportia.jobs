import type { LLMSettings } from '../types';

/**
 * Estado de la IA tal como se muestra en Inicio, la barra superior y el chat.
 * Un solo lugar para que todas las pantallas digan lo mismo.
 */
export type AIStatusKind = 'own_key' | 'shared_active' | 'shared_available' | 'none';

export interface AIStatus {
  kind: AIStatusKind;
  /** Texto corto (barra superior). */
  short: string;
  /** Título (tarjeta de Inicio). */
  title: string;
  /** Detalle en una línea. */
  detail: string;
  /** Hay IA lista para usar ahora mismo. */
  ready: boolean;
}

export function getAIStatus(settings?: LLMSettings | null): AIStatus {
  const shared = settings?.shared_ai;
  if (settings?.has_own_key) {
    const provider = settings.provider.charAt(0).toUpperCase() + settings.provider.slice(1);
    return { kind: 'own_key', short: 'IA conectada', title: `Tu clave de ${provider}`, detail: 'Sin límite diario', ready: true };
  }
  if (shared?.active) {
    return {
      kind: 'shared_active',
      short: 'IA gratuita',
      title: 'IA gratuita de Oportia',
      detail: `Te quedan ${shared.remaining} de ${shared.daily_limit} consultas hoy`,
      ready: shared.remaining > 0
    };
  }
  if (shared?.available) {
    return {
      kind: 'shared_available',
      short: 'Activar IA',
      title: 'IA gratuita disponible',
      detail: 'Actívala en un paso, sin configurar nada',
      ready: false
    };
  }
  return { kind: 'none', short: 'IA no conectada', title: 'Sin IA conectada', detail: 'Conecta tu clave en Ajustes', ready: false };
}
