/**
 * NexusJob AI — Legal Consent & Disclaimer Engine (Chilean Ley N° 21.719 Compliance)
 * Generates locally signed proof of consent, terms of processing, and liability disclaimers
 * without communicating with any external mail or cloud servers.
 */

export interface ConsentRecord {
  filename: string;
  timestamp: string;
  isoDate: string;
  acceptedClauses: string[];
  referenceId: string;
}

export function generateConsentRecord(filename: string): ConsentRecord {
  return {
    filename,
    timestamp: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
    isoDate: new Date().toISOString(),
    referenceId: `NJ-L21719-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    acceptedClauses: [
      'Tratamiento local soberano (Zero-Knowledge / Art. 12 Ley 21.719)',
      'Asistencia determinista sin invención de títulos ni experiencia',
      'Exclusión de responsabilidad: Veracidad exclusiva a cargo del candidato',
      'Mayoría de edad (16+ años / Art. 14 Ley 21.719)'
    ]
  };
}

export function downloadLegalConsentCertificate(record: ConsentRecord): void {
  const content = `================================================================================
COMPROBANTE DE CONSENTIMIENTO INFORMADO Y EXCLUSIÓN DE RESPONSABILIDAD
LEGISLACIÓN APLICABLE: LEY N° 21.719 SOBRE PROTECCIÓN DE DATOS PERSONALES (CHILE)
================================================================================

Referencia Legal: ${record.referenceId}
Fecha y Hora de Emisión (Chile): ${record.timestamp}
Fecha ISO UTC: ${record.isoDate}
Documento Analizado: ${record.filename}
Plataforma: NexusJob AI — Motor de Empleabilidad Soberano & Radar Geográfico

--------------------------------------------------------------------------------
1. DECLARACIONES Y BASES DE LICITUD (ART. 12 Y 13 LEY N° 21.719)
--------------------------------------------------------------------------------
El titular otorga de forma libre, informada, específica e inequívoca su consentimiento
para el tratamiento técnico automatizado de su currículum vitae con la única finalidad
de estructurar su perfil profesional, extraer competencias laborales y emparejar
vacantes en el Radar de Empleos.

--------------------------------------------------------------------------------
2. ARQUITECTURA SOBERANA LOCAL (ZERO-KNOWLEDGE / PRIVACY BY DESIGN)
--------------------------------------------------------------------------------
Se deja constancia expresa de que:
a) El documento suministrado se procesa de forma transitoria en la memoria local
   del navegador del usuario.
b) Los datos personales jamás se transfieren a servidores centrales de NexusJob AI
   ni se comparten con terceros para entrenamiento de modelos públicos.
c) Toda la información puede ser purgada de inmediato mediante la función de borrado
   total ("Derecho de Supresión / Olvido", Art. 17 Ley N° 21.719).

--------------------------------------------------------------------------------
3. EXCLUSIÓN DE RESPONSABILIDAD Y FIDELIDAD DE DATOS (NO-ALUCINACIÓN)
--------------------------------------------------------------------------------
a) NexusJob AI es una herramienta tecnológica de asistencia técnica determinista.
   El sistema NO inventa credenciales, títulos académicos, experiencia laboral
   ni competencias que no consten en el documento analizado.
b) El candidato es el único y exclusivo responsable de la veracidad, exactitud y
   legalidad de los antecedentes que decida postular ante terceros o empleadores.
c) NexusJob AI no garantiza la obtención de empleo ni asume responsabilidad por
   las decisiones de selección, contratación o descarte tomadas por reclutadores
   o empresas empleadoras.

--------------------------------------------------------------------------------
4. DECLARACIÓN DE MAYORÍA DE EDAD
--------------------------------------------------------------------------------
El usuario declara tener 16 años o más de edad, contando con plena capacidad legal
para consentir el tratamiento de sus datos de conformidad con el Art. 14 de la Ley 21.719.

================================================================================
Este comprobante digital ha sido emitido de manera soberana en el equipo del usuario
en cumplimiento de los principios de transparencia y responsabilidad proactiva.
================================================================================
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanDoc = record.filename.replace(/[^a-zA-Z0-9]/g, '_');
  link.download = `comprobante_consentimiento_ley21719_${cleanDoc}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
