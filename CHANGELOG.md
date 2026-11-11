# Registro de Cambios (Changelog)

Todas las modificaciones notables de **NexusJob AI** se documentan en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning (SemVer)](https://semver.org/lang/es/).

---

## [1.0.0] - 2026-11-10 — *Lanzamiento Soberano Oficial ("Sovereign Genesis")*

### 🚀 Añadido (Added)
- **Comité de Evaluación Colegiado IA (5 Evaluadores Especializados + Director):**
  - Reclutador de RRHH (25%): ajuste cultural, trayectoria, estabilidad y expectativas salariales.
  - Hiring Manager / Líder del Área (25%): impacto de negocio, resolución de problemas y experiencia en desafíos clave.
  - Especialista Técnico (25%): stack técnico exacto, metodologías ágiles y estándares de arquitectura.
  - Filtro ATS / Screening Inicial (15%): densidad de palabras clave, legibilidad estructural y correspondencia semántica.
  - Estratega de Carrera (10%): potencial de crecimiento, adaptabilidad y proyección a largo plazo.
  - Director de Selección: síntesis ejecutiva y recomendación categórica (*Postular Inmediatamente*, *Con Ajustes*, *Brecha Crítica* o *Descartar*).
  - Dual Score ponderado: **Fit Score Actual (0-100%)** y **Potential Fit Score Proyectado (0-100%)**.
  - Matriz comparativa Requisitos vs CV con citas textuales de evidencia clasificadas en *Cumplido*, *Parcial* o *No Cumplido*.
  - Sincronización en 1 clic de brechas formativas con el botón *"Transferir al Coach IA"*.
- **Módulo Coach IA & Centro de Superación Profesional (`CoachStudio.tsx`):**
  - Diagnóstico interactivo de competencias con impacto proyectado en puntos sobre el Fit Score.
  - Buscador de cursos verificados y gratuitos con enlaces oficiales libres de enlaces caídos (Microsoft Learn, AWS Skill Builder, Cisco Networking Academy, Google Cloud Skills Boost, SENCE Chile y Coursera).
  - Generador de Rutas de Aprendizaje por hitos semanales estructurados con proyectos prácticos de validación.
  - Tutor interactivo de casos prácticos de la industria con evaluación inmediata por rúbrica.
  - Simulador de entrevistas por rol (RRHH, Líder Técnico, Hiring Manager y Director) con evaluación bajo la metodología STAR (/100).
- **Página Principal (Welcome Hub) & Monitor de 6 Módulos:**
  - Panel interactivo con acceso a los 6 módulos del ecosistema.
  - Sección explicativa del Copiloto de Empleabilidad Soberano: la IA asume el 95% del esfuerzo técnico y el candidato mantiene el 100% del control soberano en 1 clic oficial sin bots para evitar baneos y permitir ClaveÚnica.
  - Cumplimiento de la **Ley N° 21.719 y 19.628 de Chile** (Privacy by Design, almacenamiento local y Derecho al Olvido).
  - Tarjetas de comunidad y patrocinio con enlaces oficiales a [GitHub Sponsors](https://github.com/sponsors/alejandroham) e [Instagram](https://www.instagram.com/not.kano/) (`@not.kano`).
- **Footer Global Apple Cupertino HIG (`Footer.tsx`):**
  - Pie de página translúcido con navegación a todos los módulos, insignia de versión `v1.0.0`, enlace a Instagram `@not.kano` y botón interactivo para apoyar el desarrollo en GitHub Sponsors.
- **Manual Maestro de Usuario (`docs/MANUAL_DE_USUARIO.md`):**
  - 11 capítulos exhaustivos detallando cada módulo, su funcionamiento y espacios estandarizados para capturas de pantalla (`docs/screenshots/`).
- **Servidor Model Context Protocol (MCP) Estándar:**
  - Exposición de herramientas JSON-RPC para Claude Desktop, Cursor y Gemini CLI.

### 🛡️ Seguridad & Gobernanza (Security)
- **Guardrail Estricto de Seguridad en Asistente Nexus:**
  - Bloqueo y denegación explícita de cualquier intento de generación de código (Python, Shell, JavaScript, etc.), scripts de automatización no autorizados o fragmentos ejecutables.
  - Prohibición estricta de edición, modificación o alteración del código fuente de NexusJob AI o sus funciones predeterminadas.
  - Bloqueo preventivo de alusiones a hackeos, inyecciones de código, exploits o evasiones de seguridad.
  - Delimitación estricta del Asistente Nexus al ámbito de empleabilidad, preparación para entrevistas y análisis del Radar.
- **Actualización Segura de la Propuesta de Valor Sintetizada (ADN Profesional):**
  - Soporte nativo para que el Asistente Nexus analice los antecedentes del candidato y actualice directamente su "Propuesta de Valor Sintetizada" (`profile_dna.summary`) en el almacenamiento soberano sin ofrecer scripts externos ni código Python.
- **Sanitización de Datos Personales en Historial de Git:**
  - Purga exhaustiva de archivos temporales de prueba, números telefónicos, direcciones de correo y textos privados del historial de commits en GitHub.
- **Cifrado Militar AES-256 en Respaldos:**
  - Respaldos exportables `.nexusjob` protegidos con cifrado **AES-GCM de 256 bits** y derivación de clave **PBKDF2** bajo contraseña del usuario.

### 🔄 Cambiado (Changed)
- Paginación del Radar de Empleo mejorada con selector dinámico segmentado `[ 6 | 12 | 24 ]` y orden descendente estricto por Fit Score.
- Tipografía y renderizado formal de documentos en Mis Postulaciones con maquetación `.formal-justify` y selector de papel de contraste (Hoja Blanca / Hoja Noche).
- Navegación móvil optimizada mediante barra inferior flotante iOS (`iOS Floating Tab Bar`) con áreas táctiles mínimas de 44px.
