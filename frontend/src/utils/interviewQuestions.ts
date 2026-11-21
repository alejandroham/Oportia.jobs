import type { JobPosting } from '../types';
import { KEYWORD_AREAS } from './profileKeywords';
import { normalizeText } from './searchText';

/**
 * 1.6.12 (DT-36): preguntas tipo de entrevista según el área de la oferta, sin IA.
 * Antes eran 3 preguntas fijas que hablaban de "habilidades técnicas" para cualquier cargo
 * (TENS, vendedor, operador…) y se presentaban como "Preguntas probables".
 */
const BY_AREA: Record<string, string[]> = {
  'Informática y soporte TI': [
    'Cuéntame de una falla difícil que resolviste: ¿cómo encontraste la causa?',
    '¿Cómo priorizas cuando llegan varias solicitudes urgentes al mismo tiempo?',
    '¿Cómo explicas un problema técnico a alguien que no es del área?'
  ],
  Salud: [
    '¿Cómo actúas si un paciente se descompensa durante tu turno?',
    'Cuéntame de una vez en que detectaste un error en una indicación o en un registro clínico.',
    '¿Cómo manejas a un paciente o familiar molesto?'
  ],
  'Educación': [
    '¿Cómo adaptas una clase cuando un grupo no está entendiendo?',
    'Cuéntame de una situación de convivencia escolar difícil y cómo la manejaste.',
    '¿Cómo trabajas con las familias de tus estudiantes?'
  ],
  'Comercio, ventas y atención': [
    'Cuéntame de una venta difícil que lograste cerrar.',
    '¿Qué haces cuando un cliente está muy molesto?',
    '¿Cómo te organizas para cumplir una meta mensual?'
  ],
  'Logística y bodega': [
    '¿Cómo te aseguras de que un despacho salga sin errores?',
    'Cuéntame de una vez en que detectaste una diferencia de inventario.',
    '¿Qué medidas de seguridad sigues al mover carga?'
  ],
  'Administración y finanzas': [
    'Cuéntame de un error que detectaste en una cuadratura o un pago.',
    '¿Cómo organizas tus cierres de mes o fechas de pago?',
    '¿Qué planillas o sistemas usas a diario y para qué?'
  ],
  'Construcción y mantención': [
    '¿Cómo coordinas a una cuadrilla cuando la obra va atrasada?',
    'Cuéntame de un problema de calidad que encontraste en terreno y cómo lo resolviste.',
    '¿Cómo aplicas las medidas de prevención de riesgos en tu trabajo diario?'
  ],
  'Gastronomía y turismo': [
    '¿Cómo te organizas en un turno con mucha demanda?',
    '¿Qué haces si un cliente reclama por su pedido?',
    '¿Qué cuidados de higiene y manipulación de alimentos aplicas?'
  ],
  'Sector público y social': [
    'Cuéntame de un caso de atención difícil y cómo lo resolviste.',
    '¿Cómo trabajas con otras instituciones o redes de apoyo?',
    '¿Qué sabes de la institución y de su función?'
  ]
};

const GENERAL = [
  'Cuéntame de un logro de tu último trabajo del que te sientas orgulloso u orgullosa.',
  '¿Cómo reaccionas cuando algo no sale como esperabas en el trabajo?'
];

export function detectJobArea(job: Pick<JobPosting, 'title' | 'description'>): string | null {
  const text = normalizeText(`${job.title} ${job.title} ${(job.description || '').slice(0, 1500)}`);
  let best: { name: string; hits: number } | null = null;
  for (const area of KEYWORD_AREAS) {
    const hits = (text.match(new RegExp(area.detect.source, 'g')) || []).length;
    if (hits && (!best || hits > best.hits)) best = { name: area.name, hits };
  }
  return best?.name ?? null;
}

/** Preguntas tipo: 1 de motivación con el cargo, 3 del área (si se reconoce) y 2 generales. */
export function typicalInterviewQuestions(job: Pick<JobPosting, 'title' | 'company' | 'description'>): { area: string | null; questions: string[] } {
  const area = detectJobArea(job);
  const company = job.company?.trim() && !/no indicada|confidencial/i.test(job.company) ? ` en ${job.company}` : '';
  return {
    area,
    questions: [`¿Por qué te interesa el cargo de ${job.title}${company}?`, ...(area ? BY_AREA[area] || [] : []), ...GENERAL]
  };
}
