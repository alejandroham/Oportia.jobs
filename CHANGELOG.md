# Registro de Cambios (Changelog)

Todas las modificaciones notables de **Oportia Jobs IA** se documentan en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning (SemVer)](https://semver.org/lang/es/).

---

## [Sin publicar]

### 👤 Perfil completo y editable (Etapa A2 de la versión 1.3)
- **Editor del CV con 6 secciones:** datos, contacto y **enlaces**; profesión, titular, resumen y **otras profesiones u oficios**; experiencia; **educación y títulos** (uno o más); **certificaciones y cursos**; habilidades, **idiomas** y **tecnologías y palabras clave**. Antes no había dónde editar educación, certificaciones, idiomas ni otros enlaces.
- **Enlaces con nombre** (LinkedIn, Portafolio, GitHub, Sitio web, Behance, Registro de Prestadores de Salud…) en lugar de un único campo de LinkedIn. Al subir el CV se detectan todos los enlaces, aunque estén escritos sin "https://". El LinkedIn de perfiles antiguos se conserva.
- **Habilidades como etiquetas:** el campo "separado por coma" borraba la coma al escribir y no permitía agregar una segunda habilidad. Ahora se escribe y se presiona Enter o coma.
- **Palabras clave sugeridas por área:** informática, salud, educación, comercio, logística, administración, construcción, gastronomía y sector público, según la profesión, los cargos y los títulos del CV.
- **Actualizar el perfil desde el chat con Opi:** frases como "agrega SAP a mis habilidades", "tengo un diplomado en gestión", "hablo inglés intermedio", "mi linkedin es …" o "también soy técnico en administración". Opi muestra el cambio y lo guarda solo si pulsas **"Sí, guardar en mi perfil"**. No usa la IA ni descuenta cupo, y el editor se actualiza al instante.
- **Vista previa y PDF del CV** con todos los enlaces, certificaciones y otras profesiones.
- La evaluación y el ordenamiento con IA consideran también las otras profesiones, las palabras clave y las certificaciones.

### 🎯 Búsqueda precisa, postular en un clic y fuente visible (Etapa A de la versión 1.3)
- **Búsqueda precisa** (`relevance_score` en `backend/app/utils/keywords.py`): las palabras del **área** ("informática", "enfermería", "bodega") deben aparecer siempre; las palabras de cargo genéricas ("encargado", "jefe", "analista") solo suman puntos; el cargo pesa más que la descripción y los resultados se ordenan por relevancia. "encargado informática" ya no trae "Encargado de Aseo", psicólogos ni TENS.
- **Empleos Públicos:** se quitó la regla que aceptaba cualquier convocatoria con la palabra "datos" (los bancos de talento empiezan con "(Base de datos)"). "TI" solo cuenta en frases como "soporte TI", porque suelto chocaba con "para ti".
- **"Postular con CV adaptado" en un clic:** la oferta queda al instante en Mis postulaciones, ya seleccionada, con Opi generando el CV y la carta a la vista; al terminar pasa a "Documentos listos para enviar". Si la IA falla, la oferta queda guardada y se puede reintentar. Ya no se marca como "Postulada" antes de enviarla.
- **Fuente en cada tarjeta** ("Fuente: Empleos Públicos", "LinkedIn Chile"…) y enlace **"Ver oferta original"**. Solo se abren enlaces http(s).
- **Registrar resultado de una postulación:** nunca funcionó (el campo `upskill_recommendations` estaba por error en otro modelo y el endpoint buscaba la oferta en el disco del servidor). Nuevo `POST /api/jobs/outcome` sin estado: el plan de mejora y lo que Opi aprende se guardan en tu navegador.

### 🔒 Respaldo y privacidad (Etapa 0 de la versión 1.3)
- **Respaldo con contraseña que no cifraba y guardaba la contraseña:** la pantalla de Privacidad pasaba los datos en otro orden del que esperaba la función. La contraseña quedaba escrita en el archivo como "datos de Aprender", el archivo salía **sin cifrar** (`.json`) aunque el aviso decía "AES-256" y Aprender no se respaldaba. Ahora el archivo `.oportia` se cifra con tu contraseña y no la contiene; se agregó un campo de pista opcional.
- **Respaldo completo (formato 1.2):** CV y perfil (con todos los títulos), qué buscas, logros STAR, lo que Opi sabe de ti, ofertas, postulaciones, Aprender (brechas y rutas) y la conversación con Opi. Las claves de IA no se incluyen, a propósito. Se siguen leyendo los respaldos antiguos.
- **Restaurar respaldos cifrados:** antes fallaban siempre; ahora se pide la contraseña (con la pista) y se avisa si es incorrecta. Aprender y el chat también se restauran (antes `coach_data` se perdía).
- **Modo sin estado en el servidor** (`STATELESS`, automático en Vercel): el chat con Opi leía y guardaba "lo que Opi sabe de ti" en el disco compartido del servidor, y podía devolver datos de otra persona. Lo mismo ocurría con "Mis brechas", las rutas de aprendizaje, la práctica de entrevista y las ofertas importadas por URL. La migración de datos antiguos queda desactivada en Vercel. Ahora el chat, Aprender y las rutas usan tu perfil desde el navegador, y las rutas se guardan en el navegador (entran en el respaldo).
- Tests nuevos: ida y vuelta del respaldo, contraseña ausente del archivo, respaldos antiguos y 5 pruebas que verifican que los datos de otra persona en el disco del servidor nunca se entregan ni se modifican.

### ☁️ Despliegue
- **Tiempo máximo de 60 s para el backend en Vercel** (`vercel.json` → `functions.api/index.py.maxDuration`). La evaluación del Comité tarda unos 34 s y adaptar CV y carta hace hasta 4 llamadas a la IA; antes dependía del valor por defecto de la cuenta.

### 🐛 Evaluar y ordenar ofertas con IA
- **"Error al evaluar: Error del servidor (500)":** la pantalla no enviaba las preferencias y el evaluador fallaba al leerlas. Ahora se envían y, si faltan, se usan valores vacíos.
- **"Error al clasificar: … Carga tu CV primero":** "Ordenar ofertas con IA" usaba `/api/jobs/batch-rank`, que busca el CV y las ofertas en el disco del servidor (vacío en Vercel). El nuevo `POST /api/jobs/rank` recibe el perfil y hasta 15 ofertas desde el navegador y las puntúa en **una sola consulta** a la IA (descuenta 1 del cupo gratuito, no 20). Si no hay CV, avisa "primero sube tu CV en Mi perfil".
- **Privacidad:** la evaluación sin estado ya no guarda la oferta ni la evaluación (que cita evidencia del CV) en el disco del servidor, que en Vercel puede compartirse entre personas.

### 📱 Instalar en el celular
- **Botón "Instalar en tu celular"** en la portada, en Inicio y en el pie de página (`frontend/src/components/InstallApp.tsx`). En Android y en Chrome o Edge de computador abre el aviso nativo de instalación; en iPhone y iPad muestra los pasos (Compartir → Agregar a pantalla de inicio), porque Apple no permite instalar desde un botón. Elige sola la pestaña según el dispositivo y se oculta si la app ya está instalada.
- **Service worker mínimo** (`public/sw.js`): permite la instalación en Android sin guardar la app en caché (nunca se ve una versión vieja). Solo si no hay conexión al abrir, muestra `offline.html`.
- `manifest.json` con íconos `any` y `maskable` (Android recorta sin cortar el dibujo); Chrome no reporta errores de instalación.

### 🐛 Favicon e íconos
- **Los íconos PNG seguían siendo el logo antiguo de NexusJob** (la "N" azul): el favicon de 32 px, `favicon.ico`, el ícono de iPhone (`apple-touch-icon`) y los de Android (192 y 512 px). Se regeneraron todos desde `favicon.svg`, el ícono oficial de Oportia. `favicon.ico` ahora es un ICO real con tamaños de 16, 32 y 48 px; antes era un PNG renombrado.
- Se eliminaron los archivos que ya no se usaban: `nexusjob-icon.png`, `nexusjob-logo.png`, `nexusjob-logo-dark.png` y `opi-avatar.svg`.

### 🤖 IA gratuita más clara
- **Inicio, la barra superior y el chat ya no dicen "Modo sin IA" cuando el servidor tiene IA gratuita.** Ahora muestran "IA gratuita disponible · Actívala en un paso" (barra: "Activar IA"), luego "IA gratuita de Oportia · Te quedan N de M consultas hoy", o "Tu clave de Gemini" si la persona conectó la suya (`frontend/src/utils/aiStatus.ts`).
- **El chat de Opi se activa ahí mismo:** si hay IA gratuita, el chat muestra el aviso de privacidad con la casilla y el botón "Activar IA gratuita"; al aceptar, el chat se abre sin pasar por Ajustes. La etiqueta "Clave Requerida" pasó a "IA sin activar".
- **"Tus datos se quedan en tu equipo"** en Inicio: explica que el CV, el perfil y las postulaciones se guardan en el navegador, con accesos a "Descargar respaldo" y "Borrar mis datos" (abren Ajustes → Privacidad & Datos, ahora enlazable con `/ajustes?tab=privacidad`).

## [1.2.0] - 2026-11-14 — *Oportia para todas las áreas: portada, búsqueda, IA gratuita y modo oscuro legible*

### 🤖 Opi con personalidad: 6 expresiones
- **Nuevas ilustraciones de Opi** en `frontend/public/opi/` (WebP con fondo transparente, versiones de 512 px y 128 px): `saludando`, `curioso`, `pensando`, `celebrando`, `advertencia` y `durmiendo`.
- **Nuevo componente `OpiAvatar`** (`frontend/src/components/ui/OpiAvatar.tsx`) con la propiedad `expression`. Elige automáticamente la versión liviana para avatares pequeños e incluye texto alternativo accesible.
- **Opi expresa el estado de la app:**
  - *Saludando:* botón flotante "Opi Copiloto", encabezado del chat, tarjeta "Tu siguiente paso" en Inicio y paso 1 de la guía de inicio.
  - *Curioso:* estados vacíos de Buscar empleo y Mis postulaciones, y paso 2 de la guía de inicio.
  - *Pensando:* mientras Opi responde en el chat y en el paso 3 de la guía de inicio.
  - *Celebrando:* Inicio con el progreso al 100% y evaluaciones con compatibilidad de 75% o más.
  - *Advertencia:* evaluaciones con compatibilidad menor a 50%.
  - *Durmiendo:* chat y avisos cuando la IA no está conectada.
- `EmptyState` acepta la nueva propiedad opcional `opiExpression` para mostrar a Opi en lugar de un ícono.
- El avatar anterior `opi-avatar.svg` ya no se usa en la interfaz.

### 🤖 IA gratuita de Oportia (con cupo y aviso de privacidad)
- **Sin configurar nada:** quien no tiene clave propia puede activar en Ajustes (o en el paso 3 de la guía de inicio) la IA gratuita de Oportia, que usa la clave de Gemini del servidor (`GEMINI_API_KEY`) con un cupo diario: 15 consultas por persona, 45 por IP y 500 en total, configurables con `SHARED_AI_DAILY_LIMIT_PER_USER`, `_PER_IP` y `_TOTAL` (`backend/app/agents/shared_ai.py`).
- **Consentimiento obligatorio:** usa el plan gratuito de la API de Gemini, en el que Google puede usar el contenido para mejorar sus productos. La tarjeta explica esto, pide no incluir datos sensibles y solo se activa marcando la casilla; sin consentimiento el servidor responde `shared_ai_consent_required` (403). Detallado en `PRIVACY.md` §4.1.
- **"El servicio de IA está descansando un momento, intenta de nuevo en unos minutos":** cuando se agota el cupo o Google responde sin cuota (`ai_resting`, 429). En el chat, Opi lo dice como respuesta; en el resto, como aviso. Si la falla es de Google, la consulta no se descuenta.
- **La clave propia siempre manda:** si la persona conectó su clave, se usa esa sin límite. Ajustes muestra "Te quedan N de M consultas hoy" y la barra indica "IA gratuita" o "IA conectada".
- Cada petición descuenta 1 consulta aunque internamente haga varias llamadas a la IA. El cupo se cuenta con un identificador anónimo del navegador; el servidor guarda solo hashes en memoria.

### 🔒 Seguridad
- `POST /api/settings/purge` y `POST /api/purge-all` (sin autenticación) borraban la clave del servidor y dejaban la IA sin funcionar para todas las personas. Ya no la tocan; la clave del servidor solo se configura por variable de entorno.
- `POST /api/settings` cambiaba el proveedor y el modelo **globales** del servidor desde cualquier navegador. Ahora no modifica nada: cada navegador envía su proveedor y modelo en cada petición.
- Sin clave propia ya no se usan `OPENAI_API_KEY` ni `ANTHROPIC_API_KEY` del servidor sin límite: la única IA compartida es la gratuita de Gemini, con cupo.
- El chat de Opi y la adaptación de CV/carta ya no responden con un texto genérico cuando falta consentimiento o la IA está descansando: se informa a la persona.

### 🏠 Portada de Oportia
- **Nueva portada para quien llega por primera vez** (`frontend/src/components/landing/LandingPage.tsx`): presenta Oportia con Opi, explica cómo funciona en 3 pasos, muestra que sirve para todas las áreas, de qué portales vienen las ofertas, cómo se protegen los datos y que la IA es opcional. "Comenzar" abre la guía de inicio; antes se abría sola la ventana "Carga tu CV" sin explicar qué es la app.
- Quien ya completó la guía sigue viendo su panel "Tu siguiente paso". La portada queda disponible en `/conoce-oportia` y en el enlace "Conoce Oportia" del pie de página.
- La guía de inicio ahora se cierra con la tecla Escape.

### 🌙 Modo oscuro unificado y contraste AA
- **Una sola paleta oscura petróleo** (`ink.dark`, `ink.surface`, `ink.raised`, `ink.hover`, `ink.border`, `ink.line`, `ink.200`, `ink.300` en `tailwind.config.js`). Se reemplazaron 446 clases `zinc`/`gray`/`black` y el fondo negro puro (`#000000`) que se mezclaban con el petróleo.
- **Botones principales legibles:** el texto blanco sobre el verde `#20A88A` tenía contraste 3:1; ahora usan `brand-600`/`brand-700` (≥ 4,5:1) en 33 botones.
- **Textos verdes y grises legibles:** 74 textos en verde de marca pasan a `brand-700` (claro) / `brand-300` (oscuro); los grises atenuados sin variante oscura se aclaran automáticamente en modo oscuro (sin afectar la hoja del CV), y `ink.muted` se oscurece levemente para cumplir AA en fondos grises.
- **Bordes que no existían:** clases como `border-white/8` usaban opacidades fuera de la escala de Tailwind y quedaban como un borde gris claro brillante (por ejemplo, sobre el pie de página en modo oscuro).
- Verificado con una auditoría automática de contraste WCAG AA en 12 pantallas, en modo claro y oscuro.

### 🎨 Logos y Opi
- **Logo para modo oscuro:** el ícono ya no se funde con la barra de navegación, y la etiqueta "Jobs IA" es más grande y legible en ambos logos (antes medía unos 6 px en pantalla).
- **Opi más presente:** más grande en "Tu siguiente paso"; aparece pensando mientras se buscan ofertas y mientras se adaptan el CV y la carta, y curioso cuando aún no hay carta. En la portada el botón flotante "Opi Copiloto" se oculta para no tapar los botones en celular.

### 🌎 Búsqueda para todas las áreas, no solo TI
- Se eliminó la palabra clave por defecto "Tecnología" en LinkedIn y Computrabajo; sin palabra clave se buscan ofertas de todas las áreas.
- Se eliminó el filtro de solo-TI (`IT_PATTERNS`) que no se usaba en el scraper de Empleos Públicos.
- Los ejemplos de los campos (cargo, habilidades, cursos, búsqueda) ahora muestran oficios y profesiones de distintas áreas.
- "Búsqueda en portales" agrega Empleos Públicos y Trabajando.cl / Laborum / Computrabajo.
- Las instrucciones a la IA para redactar CV y carta ya no asumen un perfil técnico ni de software.

### 🔎 Búsqueda que sí muestra ofertas
- **Las ofertas encontradas ya no se esconden.** Después de buscar, la pantalla volvía a filtrar por el texto exacto escrito; "enfermera" ocultaba "Técnico en Enfermería" o "Registered Nurse". Ahora las ofertas recién traídas no se vuelven a filtrar, y el filtro local ignora tildes y mayúsculas y compara cada palabra por su raíz (`frontend/src/utils/searchText.ts`).
- **Búsqueda por equivalentes en todas las áreas** (`backend/app/utils/keywords.py`): cada palabra de la búsqueda puede coincidir con sinónimos y su equivalente en inglés (enfermera ↔ TENS ↔ nurse, vendedor ↔ sales, jefe de bodega ↔ warehouse manager…). Se exige que coincidan todas las palabras: "analista contable" ya no trae "Analista de Datos".
- **Más rápida:** los portales chilenos se consultaban uno tras otro con pausas (10–11 s por búsqueda). Ahora se consultan en paralelo con un tiempo máximo total de ~7 s (2–4 s en las pruebas); las fuentes que no alcanzan a responder se informan en pantalla y el resultado incompleto no se guarda en caché.
- **Sin ofertas de Estados Unidos ni de Alemania por defecto:** LinkedIn sin ubicación solo se consulta para trabajo remoto, y los tableros remotos (Arbeitnow, Remotive, RemoteOK) solo aportan ofertas remotas que coincidan en título o etiquetas.
- **Filtro "Solo mi región":** enviaba un alcance (`regional`) que el servidor no reconocía, y solo se consultaba el ATS corporativo. Ahora busca en los portales de Chile.
- **GetOnBoard volvió a funcionar:** su API cambió el formato de etiquetas, empresa y fecha de publicación, y fallaba en todas las búsquedas.

### 🐛 Correcciones
- **Postular con CV adaptado:** `api.applyJob` ahora envía la oferta, el perfil y las preferencias completos a `POST /api/applications/draft` (sin estado). Antes enviaba solo el ID a `/api/jobs/{id}/apply`, que busca la oferta en el disco del servidor y respondía "Empleo no encontrado" en el despliegue. Si la persona no ha subido su CV, se le avisa y se le lleva a Mi perfil.
- **Carta de presentación que no se generaba:** si la IA no devuelve un JSON válido con ambos documentos, el CV y la carta se generan por separado; si la auditoría ATS falla, igual se entregan los documentos. El endpoint sin estado ya no escribe en el disco del servidor y usa las preferencias enviadas en la petición.
- **PDF en blanco:** "Imprimir / Guardar PDF" ahora imprime solo el documento en una vista aislada, siempre en tema claro, con todas sus páginas y un nombre de archivo sugerido. El CV adaptado se muestra formateado (títulos, viñetas, negritas) en lugar de Markdown sin procesar, y la carta de presentación también se puede guardar como PDF.
- **Modo oscuro:** se definieron los colores `ink.surface` (`#1E3B50`) e `ink.border` (`#2C4A60`) en `tailwind.config.js`. Se usaban en 17 lugares sin estar definidos, por lo que tarjetas como los estados vacíos se veían blancas y con el título invisible en modo oscuro.
- **Modo oscuro (contraste en la guía de inicio):** se agregó el tono `brand-950`, usado en 30 clases sin estar definido. Por eso botones y avisos como "Repetir guía de inicio" y "Tu siguiente paso" mostraban texto verde sobre fondo verde claro.

- **Logo e imágenes de Opi rotos al usar la app desde el backend** (`start_app.sh`, puerto 8000): el middleware que agrega el prefijo `/api` reescribía también `/oportia-logo.svg` y `/opi/*.webp`, y el servidor respondía con la página HTML. Ahora solo se reescriben las rutas reales de la API; los archivos del frontend compilado y las rutas de la app se sirven tal cual, y se bloquean rutas fuera de `frontend/dist`. Tests nuevos que no dependen de tener el frontend compilado.
- **CV adaptado con `\n` visibles:** si el texto llega con saltos de línea escapados, ahora se muestran como saltos de línea reales.

### ⚖️ Licencia y créditos
- **Cambio de MIT a Apache 2.0** (`LICENSE` con el texto oficial). El nuevo archivo `NOTICE` acredita la autoría de Alejandro Ham y aclara que la licencia no permite usar los nombres "Oportia" ni "Opi" ni sus logotipos e ilustraciones (sección 6). `license` y `author` en ambos `package.json`; el pie de página enlaza a la licencia.
- **Créditos:** `CONTRIBUTORS.md` y sección "Créditos" del README: Alejandro Ham como autor; Gemini (Google Antigravity) y Claude (Claude Code) como asistentes de desarrollo.

### 📝 Documentación
- **Manual de usuario reescrito** (`docs/MANUAL_DE_USUARIO.md`): guía paso a paso en segunda persona, con 18 capturas de una persona de demostración ficticia de un área no TI (Técnico en Enfermería), preguntas frecuentes (cómo guardar en PDF, "IA descansando", búsquedas sin resultados) y privacidad.
- **Capturas automáticas:** `npm run docs:screenshots` (`frontend/e2e/manual-screenshots.spec.ts`) regenera las imágenes de `docs/manual/img/` con datos y respuestas simuladas, sin Internet ni clave de IA.
- **README:** versión 1.2.0, licencia Apache 2.0, portada, áreas laborales, IA gratuita y su configuración en el despliegue, pestañas reales de Aprender, conteo de pruebas actualizado y créditos.
- **README:** se corrigieron afirmaciones que no coincidían con el código. Ahora indica que los datos se envían al proveedor de IA elegido, advierte sobre los endpoints heredados que aún usan `data/`, lista los portales de empleo realmente implementados, nombra las pestañas reales de cada postulación y aclara que el servidor MCP es solo para instalación local.

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
  - **Mis Postulaciones (`ApplicationsPage.tsx`):** Lista filtrable por estado (En proceso, Finalizadas, Todas) y ficha de cada postulación con 3 pestañas: Documentos, Preparar entrevista e Historial y notas.
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
