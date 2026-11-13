# Registro de Cambios (Changelog)

Todas las modificaciones notables de **Oportia Jobs IA** se documentan en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning (SemVer)](https://semver.org/lang/es/).

---

## [1.1.0] - 2026-11-13 — *Consolidación de Arquitectura Local-First, Calidad, Accesibilidad y CI*

### 🔒 Arquitectura Local-First & Privacidad Soberana (Opción A)
- **Persistencia 100% en el Navegador (`IndexedDB`):**
  - Implementación de `useAppStore` con Zustand y `idb-keyval` para alojar perfiles, preferencias, empleos descubiertos, postulaciones y memoria del copiloto exclusivamente en el equipo del candidato.
  - Transformación del backend FastAPI a un servicio puramente sin estado (Stateless): eliminación de persistencia en disco de postulaciones y CVs (`db.save_jobs` no es llamado en búsquedas).
  - Custodia de claves de API en el cliente mediante **WebCrypto API**: cifrado AES-GCM de 256 bits y derivación de clave PBKDF2 (100.000 iteraciones).
  - Transmisión efímera de credenciales en memoria a través de encabezados HTTPS (`X-LLM-Key`, `X-LLM-Provider`) con destrucción inmediata tras cada inferencia.
  - Rate limiting por IP en memoria para proteger endpoints de IA (10 req/min) y búsqueda de empleos (20 req/min).
  - Restricción de CORS a orígenes autorizados (`ALLOWED_ORIGINS`).
  - Creación de [PRIVACY.md](PRIVACY.md) y [SECURITY.md](SECURITY.md) detallando el marco normativo de la Ley N° 21.719 de Chile y el modelo de amenazas.

### 🧭 Navegación, Usabilidad & Experiencia Móvil
- **Enrutamiento Declarativo SPA (`react-router-dom`):**
  - 5 secciones primarias unificadas: `/` (Inicio), `/empleos` (Buscar empleo), `/postulaciones` (Mis postulaciones), `/aprender` (Aprender), `/perfil` (Mi perfil) y `/ajustes` (Ajustes).
  - Barra de navegación inferior móvil fija (`md:hidden`) con accesos táctiles $\ge 44$ px y soporte de zona segura (`env(safe-area-inset-bottom)`).
  - Copiloto conversacional **Opi** centralizado en panel flotante global accesible en cualquier vista con biblioteca de comandos rápidos.
  - Estandarización de UX Writing en español de Chile, verbos de acción en tiempo presente y segunda persona singular ("tú").

### 🚀 Asistente de Bienvenida (Onboarding) & Panel de Control
- **Asistente Inicial en 3 Pasos (`OnboardingWizard.tsx`):**
  - Paso 1: Objetivo y cargo buscado con modalidades preferidas y región.
  - Paso 2: Carga o creación de currículum con extracción de habilidades.
  - Paso 3: Conexión opcional de proveedor de IA (Gemini, Claude, OpenAI) o modo sin IA.
- **Panel de Inicio Útil (`WelcomeHub.tsx`):**
  - Tarjeta dinámica de "Siguiente paso recomendado" calculada por lógica pura determinista (`nextStep.ts`).
  - Lista de verificación interactiva de progreso del candidato.
  - Métricas de postulaciones activas y accesos directos de un clic.

### 🧩 Modularización de Pantallas (Límite $\le 300$ líneas)
- Descomposición de monolitos en componentes enfocados y mantenibles:
  - **Mi Perfil (`ProfileView.tsx`):** Editor de CV por bloques plegables (Datos, Resumen, Experiencias, Educación, Habilidades, Idiomas) y preferencias unificadas.
  - **Mis Postulaciones (`ApplicationsPage.tsx`):** Embudo estructurado en 3 pestañas (En proceso, Finalizadas, Todas) con selector de estado en 1 clic y modal de documentos adaptados.
  - **Aprender (`LearningPage.tsx`):** 4 pestañas especializadas (Cursos gratuitos verificados, Diagnóstico de brechas, Rutas de aprendizaje por hitos y Simulador STAR).
  - **Buscar Empleo (`JobSearchPage.tsx`):** Barra de búsqueda reactiva, filtros rápidos y avanzados, feed paginado y modal de detalle.

### 🎨 Sistema de Diseño & Accesibilidad (Cupertino HIG & WCAG AA)
- Definición de tokens semánticos `brand` (`#20A88A`), `ink` (`#173B50`) y superficies traslúcidas Glassmorphism.
- Biblioteca de componentes base accesibles: `Button`, `Badge`, `Card`, `Dialog`, `EmptyState`, `AINotConnectedBanner`, `FitScoreBadge`, `FailedSourcesBanner`.
- Erradicación de elementos no accesibles (`div onClick`), adición de roles semánticos y atributos `aria-label`.
- Escala tipográfica estandarizada a mínimo 12px (eliminando tamaños ilegibles de 10px y 11px).
- Soporte automático de modo claro y oscuro respetando `prefers-color-scheme`.

### 🛡️ IA Honesta & Transparencia en Evaluaciones
- Erradicación absoluta de simulaciones de compatibilidad engañosas (`_heuristic_fallback`). Si no hay clave configurada, la aplicación devuelve `AINotConnectedError` con orientación explícita.
- Banners no intrusivos de estado de IA que permiten al usuario continuar trabajando manualmente o conectar su clave en Ajustes.
- Evaluación de compatibilidad con citas textuales verificables extraídas del currículum del candidato para requisitos cumplidos, parciales y no cumplidos.

### 🧪 Calidad, Pruebas Automatizadas & CI
- **Suite de Backend (Pytest):** 22 pruebas unitarias y de integración offline con fixtures de base de datos aislada en directorio temporal y mock LLM determinista.
- **Suite de Frontend (Vitest):** 32 pruebas unitarias en entorno `happy-dom` validando WebCrypto, IndexedDB, cálculo de siguiente paso y componentes de interfaz.
- **Flujo Crítico End-to-End (Playwright):** Prueba automatizada en Chromium que recorre onboarding, búsqueda de empleo, guardado en seguimiento y verificación en postulaciones.
- **Integración Continua con GitHub Actions:** Pipeline automatizado en `.github/workflows/ci.yml` ejecutando validaciones de frontend y backend en paralelo.
- **Scrapers Robustos & Paralelizados:** Ejecución concurrente con `ThreadPoolExecutor`, timeout estricto de 5.0s por portal y componente `FailedSourcesBanner` en UI para alertar sobre fuentes caídas o lentas sin interrumpir la experiencia.

---

## [1.0.1] - 2026-11-10 — *Actualización y Rebranding Oficial a Oportia Jobs IA*

### 🎨 Rebranding & Identidad de Marca
- **Evolución de NexusJob AI a Oportia Jobs IA**:
  - Nuevo lema y manifiesto: *"Tu talento. Tus decisiones. Tus oportunidades."*.
  - Renombramiento del copiloto conversacional inteligente a **Opi** (anteriormente Asistente Nexus).
  - Repositorio oficial migrado a: [`https://github.com/alejandroham/Oportia.jobs`](https://github.com/alejandroham/Oportia.jobs).
  - Nueva identidad visual de diseño inspirada en Apple Human Interface Guidelines (HIG): paleta principal Aqua Oportia (`#20A88A`), Navy Profundo (`#173B50`), Azul Hielo (`#8AD9C4`) y fondos traslúcidos Glassmorphism.
  - Nuevos activos vectoriales SVG de alta definición: `oportia-icon.svg`, `oportia-logo.svg`, `oportia-logo-dark.svg` y `opi-avatar.svg`.
  - Formato de respaldo soberano actualizado a archivos `.oportia` con cifrado **AES-GCM de 256 bits**.

### ⚡ Correcciones Críticas de Despliegue (Vercel & SPA)
- **Solución al Pantallazo Blanco en Vercel:**
  - Inclusión de la directiva `"handle": "filesystem"` previa a la regla de reescritura general `/(.*) -> index.html` en `vercel.json` y `frontend/vercel.json`, garantizando que los chunks JavaScript y hojas CSS empaquetadas por Vite se sirvan con sus MIME types correctos en lugar de ser absorbidas por el fallback HTML.
  - Creación de la utilidad cliente `safeFetchJson` en `frontend/src/api.ts` con validación estricta de `Content-Type: application/json` para prevenir errores de análisis (`Uncaught SyntaxError: Unexpected token '<'`).
  - Implementación de `<ErrorBoundary>` de nivel superior en `frontend/src/App.tsx` para atrapar excepciones en tiempo de renderizado y presentar un botón de recuperación con diagnóstico asistido.
  - Temporizador de seguridad de 2.5 segundos para desbloquear el estado inicial de carga ante caídas de red o demoras en la respuesta del backend.
  - Verificación nula segura (*safe optional chaining*) en la barra de navegación para configuraciones de LLM.

### 📚 Documentación Actualizada
- Actualización integral del [Manual de Usuario](docs/MANUAL_DE_USUARIO.md) adaptado a Oportia Jobs IA y el copiloto Opi.
- Nueva [Guía de Despliegue en Vercel](docs/DESPLIEGUE_VERCEL.md) con arquitectura desacoplada paso a paso.
- Actualización de todos los enlaces de la comunidad y del proyecto hacia el repositorio oficial `https://github.com/alejandroham/Oportia.jobs`.

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
