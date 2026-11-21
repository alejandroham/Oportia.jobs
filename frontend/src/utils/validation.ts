/**
 * 1.6.9 (DT-23): validación compartida de los datos de contacto (Mi perfil y formulario de Opinión).
 * Antes Mi perfil guardaba un nombre vacío, "correo-invalido@@x" o "abc123!!" con solo una advertencia amarilla.
 */
export const EMAIL_OK = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;
// Chile (+56 9 1234 5678, 9 1234 5678, fijo +56 2 2345 6789) u otro país con +código.
export const PHONE_OK = /^\+?[\d\s().-]{8,20}$/;

/** Largos máximos de los campos (DT-26). */
export const MAX_LENGTH = { name: 120, headline: 150, email: 254, phone: 20 } as const;

export const isValidEmail = (v?: string | null) => !v?.trim() || EMAIL_OK.test(v.trim());
export const isValidPhone = (v?: string | null) => !v?.trim() || PHONE_OK.test(v.trim());

export interface ContactErrors {
  name?: string;
  email?: string;
  phone?: string;
}

export function contactErrors(data: { name?: string | null; email?: string | null; phone?: string | null }): ContactErrors {
  const errors: ContactErrors = {};
  if (!data.name?.trim()) errors.name = 'Escribe tu nombre: es lo primero que aparece en tu CV.';
  if (!isValidEmail(data.email)) errors.email = 'Revisa el correo: por ejemplo nombre@correo.cl.';
  if (!isValidPhone(data.phone)) errors.phone = 'Revisa el número: por ejemplo +56 9 1234 5678.';
  return errors;
}
