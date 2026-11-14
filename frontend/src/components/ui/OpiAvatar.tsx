import React from 'react';

/**
 * Expresiones de Opi, el copiloto de Oportia.
 * - saludando: bienvenida, avatar por defecto del chat
 * - curioso: estados vacíos, preguntas, preferencias
 * - pensando: cargando / la IA está trabajando
 * - celebrando: logros (perfil completo, buena compatibilidad)
 * - advertencia: brechas o compatibilidad baja (tono amable)
 * - durmiendo: IA no conectada
 */
export type OpiExpression =
  | 'saludando'
  | 'curioso'
  | 'pensando'
  | 'celebrando'
  | 'advertencia'
  | 'durmiendo';

const ALT_TEXT: Record<OpiExpression, string> = {
  saludando: 'Opi saludando',
  curioso: 'Opi con curiosidad',
  pensando: 'Opi pensando',
  celebrando: 'Opi celebrando',
  advertencia: 'Opi con un aviso',
  durmiendo: 'Opi en reposo, IA no conectada'
};

export interface OpiAvatarProps {
  expression?: OpiExpression;
  /** Tamaño en píxeles (ancho y alto). */
  size?: number;
  className?: string;
  /** Si es decorativo (hay texto al lado que ya explica), se oculta a lectores de pantalla. */
  decorative?: boolean;
}

export const OpiAvatar: React.FC<OpiAvatarProps> = ({
  expression = 'saludando',
  size = 40,
  className = '',
  decorative = false
}) => {
  // Versión liviana de 128 px para avatares pequeños; 512 px para ilustraciones grandes.
  const src = size <= 64 ? `/opi/opi-${expression}-128.webp` : `/opi/opi-${expression}.webp`;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={decorative ? '' : ALT_TEXT[expression]}
      aria-hidden={decorative || undefined}
      draggable={false}
      loading="lazy"
      decoding="async"
      className={`object-contain select-none shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
};
