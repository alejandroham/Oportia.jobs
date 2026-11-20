# Registro de Cambios (Changelog)

Todas las modificaciones notables de **Oportia Jobs IA** se documentan en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning (SemVer)](https://semver.org/lang/es/).

---

## [1.6.1] - 2026-11-19 — *Honestidad de resultados*

Primera corrección de la auditoría QA del 19-nov-2026: Oportia ya no muestra datos que no calculó y avisa cuando la IA falla.

### 🛠️ Correcciones
- **Puntaje STAR inventado (QA-026):** si la IA fallaba (por ejemplo, 429), el simulador de entrevista mostraba **85 %** y "Respuesta evaluada con éxito". Ahora solo muestra el puntaje que entregó la IA; si no lo entregó, dice **"Sin evaluar"**, y si la IA no está disponible, muestra un aviso con **Reintentar**.
- **Errores del servidor tratados como datos (QA-028):** 28 funciones de `api.ts` hacían `return res.json()` sin revisar si la respuesta era un error. Ahora todas pasan por `handleResponse`, que lanza el error con su código. Una regla de ESLint impide volver a escribir `return res.json()` en `api.ts`.
- **"IA no disponible" sin aviso (QA-004):** cuando la IA está saturada o sin cupo (`ai_resting`, `ai_busy`, 429), estas funciones muestran el mismo aviso, *"La IA está con mucha demanda en este momento. No se descontó de tu cupo…"*, con el botón **Reintentar**: evaluar compatibilidad, ordenar y actualizar porcentajes del Radar (también el orden automático), chat con Opi, importar oferta, crear ruta de aprendizaje, adaptar CV, Tutor IA y simulador de entrevista.
- **Lectura sin IA visible:** la guía de inicio muestra la insignia **"Lectura básica (sin IA)"** junto a los datos detectados (antes solo había un aviso pasajero), e "Importar oferta" avisa siempre cuando la oferta se leyó sin IA.
- **El historial afirmaba envíos que Oportia no hace (QA-045):** al marcar una postulación como enviada, el historial decía "Candidatura enviada formalmente". Ahora dice **"Marcaste esta postulación como enviada"**.

### ♿ Accesibilidad
- Los avisos emergentes se anuncian a lectores de pantalla (`role="status"`, `aria-live="polite"`) y pueden traer un botón de acción.

### 🧪 Pruebas
- `apiErrors.test.ts`: cada función de la API rechaza con `ApiError` ante un 500, un 429 conserva el código `ai_resting` y `api.ts` no contiene `return res.json()`.
- `interviewScore.test.tsx`: simulador con 429 (sin porcentaje y con Reintentar), 200 sin puntaje ("Sin evaluar") y 200 con `score: 62` (62 %), más `isAIBusyError` y el texto del historial.

---

## [1.6.0] - 2026-11-19 — *CV compatible con sistemas ATS*

### 📄 Formato que leen bien los ATS
- **Oportia arma el CV con reglas** (`app/agents/cv_builder.py`): la IA solo propone la redacción (perfil, descripción breve y logros de cada cargo, competencias y palabras clave de la oferta) en formato de datos; los hechos salen del perfil.
- **Cada cargo, una cosa por línea:** "Cargo — Empresa" (copiados tal cual del perfil), "Mes Año – Mes Año | Ciudad", descripción de 1–2 líneas, 3–5 viñetas de logros (verbo + acción + resultado, sin cifras inventadas) y "Tecnologías:" con máximo 10, solo respaldadas por el perfil y priorizando las de la oferta.
- **Fechas uniformes:** mes completo y año, "Actual" para el cargo vigente.
- **Títulos de sección estándar:** Perfil profesional, Competencias, Experiencia laboral, Experiencia anterior, Educación, Certificaciones y cursos, Idiomas (nueva sección).
- **Máximo 2 hojas:** se quita la opción "Completo"; los cargos que terminaron hace más de 10 años van en "Experiencia anterior", una línea cada uno.
- **Ajuste automático a 1 o 2 hojas:** si el CV adaptado se pasa, Oportia achica letra y espacios (hasta 82 %) y, si no basta, lo acorta de lo menos a lo más importante: Experiencia anterior a 4 cargos → 3 logros por cargo → 6 tecnologías por cargo → sin Experiencia anterior → sin la descripción de los cargos más antiguos → 10 competencias. Nunca quita cargos, fechas ni estudios. Un aviso muestra qué se acortó, con "Ver el CV completo" y "Volver a ajustar". El PDF sale igual que lo que se ve.
- **Opción "Incluir Experiencia anterior"** en Largo y experiencias del CV (activada por defecto).
- **Educación sin redundancias:** "Título – Institución (año)" (ya no "Ingeniero en Informática en Ingeniería en informática").
- **Perfil profesional** de 3–4 líneas sin tercera persona, con años de experiencia calculados con las fechas; aviso si quedó en tercera persona.
- El CV base de Mi perfil usa el mismo formato y los mismos títulos.

### 🔤 PDF
- **Sin palabras partidas:** `hyphens: none` en el CV y se quitan los guiones blandos (U+00AD) y U+2010 del texto.
- **Fuente Arial del sistema** (TrueType) en el CV y la carta: las fuentes web variables podían quedar incrustadas como Type 3. Nunca pesos ExtraLight. Verificado con `pypdf`: fuentes ArialMT/Arial-BoldMT CID TrueType, sin Type 3.
- **Título del PDF:** "CV – Nombre Apellido – Cargo de la oferta".

### 🎯 Adaptación a la oferta
- La IA extrae 15–20 palabras clave de la oferta y solo usa las que la persona tiene, con la misma redacción.
- **Revisión para sistemas ATS** en Documentos: % de coincidencia, palabras usadas y faltantes, y lista de chequeo (sin palabras partidas, fuente estándar, fechas en su línea, ≤2 hojas, ≥3 logros en los 3 cargos más recientes, ≤12 tecnologías por cargo, sección Idiomas, nada inventado).
- **Coherencia:** si un mismo cargo aparece dos veces con fechas o títulos distintos, Oportia pregunta cuál usar antes de generar (o si son cargos distintos) y actualiza el perfil.

### 🛠️ Correcciones
- **Subir el CV podía no cargar ningún dato** (guía de inicio y Mi perfil):
  - Las consultas a Gemini no tenían tiempo límite y se probaban hasta 4 modelos seguidos; con la IA gratuita saturada se podía pasar el límite de 60 s de Vercel y la petición se cortaba sin respuesta. Ahora cada petición tiene un **presupuesto de 50 s**, cada consulta un tiempo máximo y, si la IA no alcanza, **se usa la lectura sin IA y los datos se cargan igual**. Al CV se le envían como máximo 30.000 caracteres.
  - La guía decía "máximo 10 MB", pero Vercel rechaza archivos de más de ~4,5 MB: ahora el límite es **4 MB**, se revisa antes de enviar y el mensaje explica qué hacer.
  - La guía aceptaba **.txt**, pero el servidor lo rechazaba: ahora se lee.
  - Mensajes claros si un PDF es una imagen escaneada, si un .doc antiguo no se puede leer o si la conexión se corta por tiempo.
  - Sin IA, el nombre ya no sale pegado al correo cuando están en la misma línea.
- **La lectura del CV mezclaba secciones y dejaba listas como un solo texto:**
  - **Con IA:** si la IA devolvía habilidades, idiomas o cursos como texto ("Python, React, SQL") en vez de lista, la lectura fallaba en silencio y caía a la lectura sin IA; si venían en un solo elemento, quedaban como una sola habilidad. Ahora se separan siempre, los idiomas se convierten en idioma → nivel y la experiencia trae sus herramientas y logros separados.
  - **Sin IA:** se reconocen títulos de sección en la misma línea que el contenido ("HABILIDADES: Python…", "EDUCACIÓN Ingeniero…"), con letras espaciadas ("E D U C A C I Ó N"), combinados ("Educación y certificaciones", "Formación y cursos"), en inglés ("Education", "Certifications") y "Contacto".
  - **Educación línea a línea:** cada título empieza un registro nuevo con su institución y año (antes, sin líneas vacías, toda la sección quedaba como un solo título). Los cursos, certificaciones y bootcamps que estén en Educación pasan a "Certificaciones y cursos".
  - **Cursos:** uno por línea, sin cortar en comas ("Curso de Python, 40 horas" es uno); la institución o el año en la línea siguiente se une al curso. Ordenados del más reciente al más antiguo (también en la app).
  - **Habilidades:** se separan por comas, viñetas, "·", "/", "-" y "|".
  - **Idiomas:** "Inglés intermedio (B1) · Español nativo", "Inglés: B2", listas o diccionarios; si no hay sección, se buscan menciones con nivel.
  - **Palabras clave:** se completan con las habilidades técnicas y las herramientas de la experiencia.
  - **CV de dos columnas:** el nombre y el titular se encuentran aunque la barra lateral (Contacto, Habilidades, Idiomas) salga primero en el texto del PDF.
  - **CV con palabras partidas** (como los que generaba Oportia antes de esta versión): se unen las palabras cortadas con guion al final de línea ("trans-/formación").
  - **Experiencia:** el cargo y la empresa pueden ocupar dos líneas ("…de la Región del" + "Biobío"); la línea de fecha puede traer "| Ciudad, Región, Chile" y el inicio de la descripción; "Herramientas:" dentro de un cargo ya no se confunde con la sección Habilidades y sus términos quedan en las herramientas del cargo; empresas terminadas en "S.A." o "Ltda.".
  - **Experiencia anterior** ("Cargo · Empresa (Mes Año – Mes Año)") se lee como experiencia.
  - **Titular:** se acepta aunque tenga números ("Microsoft 365") y continúe en la línea siguiente, sin arrastrar el correo.
  - **Educación:** sin el título repetido ("Ingeniero en Informática en Ingeniería en informática" → "Ingeniero en Informática") y con todas las instituciones ("Universidad Tecnológica de Chile, INACAP").
- Al adaptar se usa siempre el perfil recién guardado.
- **Control de versiones:** desde esta versión el número se sube en la rama `release/*`, antes de unirla a `main`.

## [1.5.1] - 2026-11-18 — *Número de versión corregido*

### 🛠️ Corrección
- La 1.5.0 se publicó con la unión de la rama `release/1.5.0` (PR #20) antes de actualizar el número de versión: producción tenía todas las funciones nuevas, pero el pie de página, Ajustes y `/api/status` seguían diciendo 1.4.6. Ahora dicen 1.5.1.
- La etiqueta `v1.5.0` marca el commit que se publicó (`95aadc1`).
- **Para las próximas versiones:** el número de versión se sube en la misma rama de la versión, antes de unirla a `main`.

## [1.5.0] - 2026-11-18 — *Privacidad por diseño y CV sin datos inventados*

### 🔐 La IA no recibe tus datos de contacto
- Capa en la conexión con la IA: el nombre, correo, teléfono y enlaces de la persona se reemplazan por marcadores en cada consulta y se reponen en la respuesta; el RUT se oculta siempre (`app/privacy/`).
- CV y carta adaptados y entrevista: la IA recibe el perfil sin contacto ni el texto completo del CV.
- Lectura del CV: correo, teléfono, RUT y enlaces se ocultan antes de la IA y se rellenan con reglas.
- Los registros de error ya no guardan contenido de la IA ni detalles que puedan traer datos del CV.

### ✅ IA gratuita con doble confirmación y comprobante
- Dos casillas obligatorias: que Google procesa lo enviado en su plan gratuito, y que la persona tiene 18 años o más, no incluirá datos sensibles y revisará los resultados.
- Aviso completo con **exclusión y límites de responsabilidad** (borrador sujeto a revisión jurídica), para leer y descargar antes de aceptar.
- **Comprobante descargable** con código, fecha, versión y lo aceptado (sin datos personales).
- Oportia recibe un aviso anónimo de cada aceptación o retiro (`POST /api/event`, lista cerrada de tipos y valores). Versión del aviso `2026-11-18`: se vuelve a pedir a quien aceptó la anterior.

### 📄 CV con datos exactos y nada inventado
- El encabezado del CV adaptado siempre trae nombre, titular, **correo · teléfono · comuna** y enlaces de Mi perfil, también en CV generados antes (se arma al mostrarlo).
- **Verificación de fidelidad** (`app/agents/cv_fidelity.py`): se quitan experiencias, cifras, fechas, estudios, cursos y competencias que no están en el perfil; la IA corrige una vez y lo que quede se elimina. En la carta se quitan las frases con cifras no verificables. Aviso con la lista de lo quitado.
- Instrucciones a la IA más estrictas: prohibido agregar hechos que no estén en el perfil.
- **Mi perfil:** campos **Región** y **Comuna de residencia**; aviso si el correo o el teléfono no parecen válidos; aviso en Documentos si falta correo, teléfono o comuna.

### 📊 Medición anónima
- Se cuentan los CV adaptados, las entrevistas preparadas y evaluadas, los consentimientos y los comprobantes descargados.

### 🛠️ Correcciones
- **Un cambio podía perderse:** cada aviso en pantalla volvía a cargar todos los datos del navegador y podía deshacer un cambio que se estaba guardando (por ejemplo, al agregar dos cargos seguidos). La carga inicial ahora ocurre una sola vez, el sistema de avisos es estable y cada guardado se confirma cuando quedó escrito, en orden.

## [1.4.6] - 2026-11-17 — *Secciones que se activan con tu CV y "Recupera tus datos"*

### 🔒 Secciones que se activan con tu CV
- Sin CV, **Mis postulaciones** y **Aprender** muestran un candado en el menú (escritorio y celular). Al entrar se ve una pantalla con **Subir mi CV**, **Recuperar mis datos** y "busca ofertas sin CV".
- **Mi perfil** y **Buscar empleo** nunca se bloquean. Si ya hay ofertas guardadas o postulaciones (por ejemplo, de antes de subir el CV), Mis postulaciones queda abierta.

### 🔄 Recupera tus datos desde la portada
- Enlace "¿Ya usabas Oportia en otro equipo? **Recupera tus datos**" en la portada. Abre un recuadro que explica cómo traer el respaldo (.oportia) desde el otro equipo y lo restaura, con contraseña si la tiene. Al terminar, se va a Inicio.
- La restauración ahora es un componente compartido (`RestoreBackup`) entre Ajustes y la portada.
- Manual: la sección 2 explica las secciones bloqueadas y cómo recuperar los datos.

## [1.4.5] - 2026-11-17 — *Resumen de la oferta y panel del CV plegable*

### 🗂️ Mis postulaciones
- **Resumen de la oferta** al abrir una postulación (plegable):
  - empresa y fuente;
  - lugar y modalidad, renta, contrato y cierre;
  - primeras frases de la descripción, con "Ver descripción completa";
  - **Contacto y postulación:** los correos que publica la oferta (`mailto:` con el asunto "Postulación: cargo") y el enlace oficial "Postular en…". Se descartan correos de sistema (`noreply`…). Sin IA y sin inventar (`utils/jobContact.ts`).
- **Largo y experiencias del CV plegable:** con un CV ya generado aparece cerrado y muestra un resumen ("1 hoja · Opi eligió: 3 de 6 experiencias"), para ahorrar scroll.

## [1.4.4] - 2026-11-17 — *El PDF del CV se ve igual que la vista previa*

### 🛠️ Corrección
- **Al exportar el CV a PDF cambiaban el formato y las fuentes.** Unos estilos de impresión antiguos de `index.css` reemplazaban la tipografía de la plantilla: títulos azules más grandes con una línea gruesa y tamaños de letra fijos. También fijaban márgenes distintos (12 × 15 mm) a los que usa el medidor de hojas (14 × 16 mm).
  - Se quitaron esas reglas: el PDF conserva la plantilla, las fuentes, los colores y los tamaños de la vista previa.
  - Un solo margen de página (14 × 16 mm), el mismo que mide "Cabe en 1 hoja".
- Prueba nueva (`e2e/print-pdf.spec.ts`): compara la tipografía del documento impreso con la de la vista previa.
- **Dependencias:** Vite 6.4.6 en la app y en el portal, y correcciones de seguridad de herramientas de desarrollo.

## [1.4.3] - 2026-11-17 — *CV en orden cronológico*

### 📅 Experiencia y educación ordenadas por fecha
- **Orden automático:** de lo más reciente a lo más antiguo. Primero el trabajo actual y los estudios en curso; luego por fecha de término y de inicio. Entiende "2021", "03/2021", "2021-03", "Marzo de 2021", rangos ("2019 – 2021") y "Actual" (`utils/cvOrder.ts`).
  - Se aplica al analizar el CV, al guardar, al importar un respaldo y al abrir la app: los perfiles guardados en desorden aparecen ordenados.
  - Las fechas que no se entienden quedan al final, en su orden original.
- **Orden manual:** flechas ↑ ↓ en Experiencia (ya existían) y ahora también en Educación. Al usarlas, el perfil queda en `cv_order: 'manual'` y no se reordena solo. **Ordenar por fecha** vuelve al orden automático.
- Aviso en el editor cuando hay fechas fuera de orden.
- **CV adaptado:** la IA debe presentar la experiencia y la educación en el mismo orden del perfil, sin reordenarlas por relevancia.
- Mover experiencias no marca los porcentajes de compatibilidad como desactualizados (la huella del perfil usa un orden canónico por fecha).

## [1.4.2] - 2026-11-17 — *CV a la medida de la hoja y opiniones de un toque*

### 📄 CV adaptado más corto y justificado
- **Largo y experiencias del CV** en Mis postulaciones → Documentos:
  - largo **1 hoja**, **2 hojas** o **Completo** (con más de 5 experiencias se sugiere 1 hoja);
  - **Que Opi elija:** la IA elige las experiencias más relevantes para la oferta y explica en una frase por qué (sin IA, por coincidencia de palabras y experiencia reciente);
  - **Elegir yo:** casillas por experiencia; la elección se guarda en cada postulación.
- **Experiencia anterior:** las experiencias no desarrolladas quedan en una línea por cargo (cargo · empresa · años). La escribe el servidor con los datos del perfil, no la IA; si la IA escribe su propia versión, se reemplaza.
- La IA recibe solo las experiencias elegidas, con viñetas recortadas según el largo, y reglas de extensión por hoja (`app/agents/cv_selection.py`).
- **Texto justificado** al ancho de la hoja, con división de palabras (CV base, CV adaptado y carta).
- **Medidor de hojas A4** sobre la vista previa ("Cabe en 1 hoja", "2 hojas al imprimir"), medido con los mismos márgenes del PDF.
- **Ajustar a la hoja:** reduce letra y espacios hasta un mínimo legible (82 %) para que el CV quepa; avisa si ni así cabe.
- **Corrección:** las plantillas Minimalista y Ejecutiva y el encabezado centrado no se aplicaban; ahora funcionan también en el CV adaptado y en el PDF.

### 💬 Opiniones sin interrumpir
- Antes la invitación era una ventana a los 30–60 minutos de uso y casi nadie llegaba a verla: en las últimas 24 horas antes de este cambio hubo 59 navegadores distintos y 0 opiniones.
- **👍/👎 de un toque** dentro de la página: al buscar ofertas, en la compatibilidad y tras generar un CV adaptado. Anónimo, una sola vez por lugar, con "Escribir (opcional)".
- **Tarjeta pequeña en la esquina** tras 4–8 minutos de uso, con cinco caras; se cierra con × y aparece como máximo dos veces. Reemplaza a la ventana.
- **Botón "Opinión"** fijo en el menú superior.
- Supabase: columna `moment` en `feedback` (dónde se opinó, sin contenido) y nuevos tipos `rapida` y `tarjeta`.
- **Portal de administración:** tabla 👍/👎 por momento, tasa de respuesta de los últimos 7 días y filtro "Solo con comentarios".
- **Privacidad 1.4.2:** la sección 9 describe las tres formas de opinar y el dato "dónde".

### 🛠️ Correcciones
- **Compatibilidad con IA:** cuando Google respondía "alta demanda" (503), la app mostraba un error. Ahora el servidor responde con un aviso tranquilo, la app reintenta sola a los 3 minutos y el portal lo registra como "IA con alta demanda" en vez de "error del servidor".

## [1.4.1] - 2026-11-16 — *Portal de administración: ofertas en tabla y estado corregido*

### 🛡️ Portal de administración: ofertas en tabla
- **Corrección:** las secciones Ofertas y Estado del portal quedaban vacías. El portal pedía los datos a la API de Oportia desde otro dominio y la API lo bloqueaba (CORS).
  - **Ofertas:** ahora el índice se lee directo desde Supabase Storage.
  - **Estado:** usa el nuevo resumen público `GET /api/status` (versión, índice e IA gratuita, sin datos personales), que se puede leer desde cualquier origen.
- **Ofertas vigentes en una tabla:**
  - búsqueda por cargo, empresa o lugar;
  - filtros por fuente (con conteo), área, región, modalidad y vencimiento (nuevas hoy, vencen hoy, en 7 días, fecha real o estimada);
  - orden por columna y páginas de 50;
  - **descarga en CSV** de lo filtrado.
- **Pestaña "Sacadas del índice":** ofertas vencidas o que ya no publica su fuente.

## [1.4.0] - 2026-11-16 — *Portal interno de administración y medición anónima*

### 🛡️ Portal interno de administración (primera versión)
- **App separada (`admin/`):** sin enlaces desde Oportia y con `noindex`. Se despliega como otro proyecto de Vercel. Secciones:
  - **Uso:** usuarios activos por día, promedio de 7 días, búsquedas y funciones usadas.
  - **Opiniones:** promedio, filtro por contacto autorizado y código para pedir el borrado.
  - **Seguridad:** eventos por tipo, orígenes más activos con huella diaria y sin IP.
  - **Ofertas:** vigentes por fuente y área, historial diario, y ofertas sacadas por vencimiento o porque la fuente las quitó.
  - **Estado:** versión en producción, índice, IA gratuita y GitHub Actions.
- **Doble verificación:**
  - contraseña de Supabase Auth más un código TOTP de una app de autenticación;
  - la base de datos solo entrega datos a sesiones `aal2` de usuarios en `admin_users` (`private.is_admin()`, fuera de la API pública);
  - la sesión dura solo mientras la pestaña está abierta y se cierra tras 30 minutos sin actividad.
- **Registro anónimo de uso y seguridad** (`app/telemetry.py`, tabla `app_events`):
  - se registra el tipo de acción, nunca el contenido;
  - la huella diaria del navegador y de la red (IP recortada) no permite seguir a nadie entre días;
  - tope de 20.000 eventos al día y borrado a los 90 días.
- **Índice diario:** ahora publica `index-history.json` (resumen de cada día) y `jobs-removed.json.gz` (ofertas sacadas en los últimos 30 días, con su motivo).
- **Privacidad 1.4.0:** nueva sección 10, "Medición anónima de uso y seguridad".
- **CI:** nuevo trabajo para el portal (pruebas, tipos y compilación).
- **Configuración:** en `admin/README.md`.

## [1.3.8] - 2026-11-16 — *Pegar ofertas de otros portales y "Buscar también en"*

### 📋 Ofertas de otros portales: pegar el texto y "Buscar también en"
- **Importar una oferta pegando su texto** (uso personal): `POST /api/jobs/from-text`, sin estado.
  - La IA ordena cargo, empresa, ubicación, modalidad, renta, tipo de contrato, fecha de cierre y requisitos, sin inventar. Sin IA, usa reglas.
  - El texto pasa por el filtro anti-*prompt injection*.
- **Las ofertas importadas ahora se guardan en Mis postulaciones.** Antes "Importar oferta por URL" las procesaba, pero la app no las guardaba en ningún lado. Las pegadas llevan la fuente "Pegada por ti" y su enlace original.
- **"Buscar también en":** después de buscar, botones que abren la misma búsqueda **en el sitio de** Indeed, Computrabajo, Laborum, LinkedIn y la Bolsa Nacional de Empleo. Oportia no lee ni copia esos sitios.
- **Importar por enlace no lee Indeed, Computrabajo ni Laborum,** porque sus condiciones lo prohíben. Se pide pegar el texto, y el enlace se guarda igual.
- **Ventana "Importar una oferta"** con dos pestañas: Pegar texto y Enlace.
- **Pruebas:** `test_job_from_text.py` y el e2e `import-offer.spec.ts`. **Manual:** nueva sección "Ofertas de otros portales".

## [1.3.7] - 2026-11-16 — *README y manual al día, memoria interna fuera del repositorio*

### 📘 Documentación
- **README renovado:**
  - mensaje "Tú manejas tu información. Nosotros te traemos las ofertas.";
  - novedades de la 1.3: índice diario con vencimiento, análisis del CV con IA, cargos sugeridos y logros, compatibilidad automática y opiniones;
  - diagrama de arquitectura actualizado: fuentes reales, Supabase y GitHub Actions;
  - tabla de módulos al día;
  - Node.js 20.19 o superior.
- **Manual de usuario 1.3.7:** nuevo recuadro "Novedades de la versión 1.3" y explicación de "Borrar todos mis datos" con doble confirmación.

### 🔒 Memoria interna fuera del repositorio público
- `docs/PLAN_DE_MEJORAS.md`, `docs/MANUAL_MAESTRO_OPTIMIZACION_UI_UX.md` y `docs/ESPECIFICACIONES_DISENO_VISUAL_UI_UX.md` dejan de publicarse. Se conservan en el equipo del autor y quedan en `.gitignore`, junto con la carpeta `docs/interno/` para futuros documentos internos.

## [1.3.6] - 2026-11-16 — *Qué busco y Mis logros con IA, también desde Opi*

### 🎯 "Qué busco" y "Mis logros" con IA, también desde Opi
- **Cargos afines con su resumen:** `POST /api/profile/career-insights` hace **una sola consulta a la IA** que entrega dos cosas.
  - **Cargos** en tres tipos: experiencia directa, siguiente paso y habilidades transferibles. Cada uno trae un **resumen** de por qué calza y la evidencia del CV, nunca por debajo del nivel de la persona.
  - **Logros en formato STAR**, solo con hechos del CV y sin inventar cifras.
- **Después de analizar el CV con IA,** en Mi perfil y en la guía de inicio:
  - se agregan solos hasta 3 cargos de experiencia directa a "Qué busco";
  - todas las sugerencias quedan visibles, con su resumen;
  - los logros se agregan a "Mis logros", sin duplicar.
- **"Qué busco":** nuevo panel "Cargos sugeridos según tu experiencia", con Agregar o quitar ("Lo busco") y "Actualizar con IA".
- **"Mis logros":** botón "Extraer logros de mi CV con IA". Cada logro muestra su origen: CV, Opi o manual.
- **Opi actualiza "Qué busco" y "Mis logros"** desde el chat, siempre con confirmación: "busco trabajo de…", "agrega … a lo que busco", "ya no busco…" y "agrega un logro: …".
- **Sin IA:** las sugerencias parten de los cargos que ya ejerciste ("Ejerciste este cargo en…") y los logros, de las viñetas de tu experiencia.
- **Pruebas:** `test_career_insights.py`, `careerInsights.test.ts` y el e2e `career-insights.spec.ts`. **Manual** actualizado (secciones 4, 5 y 9).

## [1.3.5] - 2026-11-16 — *Análisis del CV con IA, experiencia editable y la IA antes del CV*

### 📄 Análisis del CV corregido (feedback: experiencia, títulos y cursos mal clasificados)
- **Causa principal:** al subir el CV la app **no enviaba tu clave ni la aceptación de la IA gratuita**, así que el servidor nunca usaba IA y siempre caía en el lector por reglas. Ahora `uploadCV` envía las credenciales.
- **Nuevo `analyze_cv`:** informa a la app si el CV se analizó **con IA** (`method: "ia"`) o **sin IA** (`"reglas"`), con un aviso (`note`).
- **Instrucciones a la IA más claras:**
  - todas las experiencias, una por cargo y de la más reciente a la más antigua;
  - **Educación y títulos:** carreras, títulos, postítulos y diplomados;
  - **Certificaciones y cursos:** cursos, capacitaciones y licencias con su nombre completo, nunca palabras sueltas.
- **Limpieza posterior:**
  - cursos que la IA dejó como títulos pasan a Certificaciones y cursos;
  - las habilidades sueltas salen de Certificaciones y cursos;
  - el nombre se valida sin depender de tildes ni mayúsculas.
- **Lector por reglas reescrito por secciones.** Antes buscaba la palabra "experiencia" en cualquier parte del texto; si el resumen decía "8 años de experiencia", empezaba a leer ahí y mezclaba todo. Ahora reconoce los títulos de sección y separa cada experiencia por su rango de fechas. Con un CV de prueba lee 4 experiencias, 2 títulos, 3 cursos, habilidades e idiomas.
- **"Reanalizar con IA"** en Mi perfil (`POST /api/profile/reanalyze`, sin estado): vuelve a leer el CV ya cargado, sin subirlo otra vez, y conserva tus palabras clave y enlaces.
- **La IA va antes del CV:**
  - **Guía de inicio** en el orden Conecta la IA → Tu currículum → Qué buscas;
  - **Mi perfil:** si la IA no está activa al subir el CV, se pide activarla (o seguir sin IA con lectura básica);
  - al terminar, un aviso indica el método usado.
- **Experiencia laboral editable:** antes solo se podía borrar y "Agregar" creaba una entrada fija. Ahora se editan cargo, empresa, fechas ("trabajo aquí actualmente"), ubicación, modalidad, funciones, logros y herramientas, y se puede reordenar.
- **Pruebas nuevas:** `backend/tests/test_cv_analysis.py`, con un CV ficticio de técnico en construcción, y `frontend/e2e/cv-analysis.spec.ts`.
- **Manual:** guía de inicio en el nuevo orden, "Reanalizar con IA" y edición de experiencia, con capturas nuevas.

## [1.3.4] - 2026-11-16 — *Ofertas de construcción, ChileTrabajos reparado y borrado completo de datos*

### 🏗️ Construcción: ofertas para técnicos y supervisión (feedback de un técnico en construcción)
- **ChileTrabajos volvió a funcionar.** El portal cambió su búsqueda a `/encuentra-un-empleo` y Oportia leía 0 ofertas.
  - Ahora trae cargo, empresa, ciudad, descripción y **fecha de publicación**, que se usa para el vencimiento.
  - Ejemplos: "supervisor de obra" da 19 ofertas, "técnico en construcción" 19 y "capataz" 14.
- **Índice diario:** nuevas consultas de construcción de nivel técnico y de supervisión: técnico en construcción, supervisor de obra, jefe de obra, jefe de terreno, capataz, ITO, administrador de obra, oficina técnica, cubicador, presupuestista, constructor civil y BIM.
- **Sinónimos:** "construcción" ahora también reconoce edificación, obras civiles, capataz, jefe de obra o de terreno, supervisor de obra, ITO y oficina técnica. Hay sinónimos nuevos para cubicación, presupuesto de obra, BIM/Revit y Lean Construction.
- **Palabras clave sugeridas y brechas de construcción:**
  - Supervisión de obra, coordinación de cuadrillas, cubicaciones y presupuesto de obra.
  - MS Project, BIM, Revit y Lean Construction.
  - ITO, informes técnicos y construcción sostenible.

### 🗑️ "Borrar todos mis datos": confirmación clara y vuelta a la portada
- **Nuevo diálogo** con dos casillas: "entiendo que no se puede deshacer" y "confirmo que no quiero descargar un respaldo". También permite **descargar el respaldo ahí mismo**.
- **Al borrar, la app se recarga en la página principal**:
  - la guía de inicio parte de cero, incluido "Conecta la IA (opcional)";
  - aparece el aviso "Tus datos fueron borrados".
- **El borrado ahora es completo.** Antes quedaban en el navegador la guía completada, la aceptación de la IA gratuita, los modelos de IA, el tiempo de uso y la invitación a opinar. Solo se conserva el tema claro u oscuro.
- Nuevo test de extremo a extremo: `frontend/e2e/purge-data.spec.ts`.

## [1.3.3] - 2026-11-16 — *Corrección de seguridad (SSRF) y protección contra spam*

### 🔒 Seguridad
- **Corrección de SSRF en "Importar oferta por URL".** El servidor descargaba cualquier dirección, incluidas `localhost`, redes internas y los metadatos de la nube; la protección que describía `SECURITY.md` no existía en el código.
  - Ahora valida protocolo y puerto, exige que todas las IP del host sean públicas y revisa cada redirección (máximo 5).
  - Limita el tamaño de la página a 3 MB.
  - Pruebas en `test_ssrf.py`.
- **Opiniones contra el spam:**
  - tope global en la base de datos de 30 opiniones cada 10 minutos y 300 por día, que también aplica a quien inserte directamente con la clave publicable;
  - la fecha de cada opinión la fija la base de datos;
  - campo trampa para bots;
  - respuesta 429 con un mensaje claro.
- **`SECURITY.md` reescrito:**
  - versiones con soporte, reporte privado de vulnerabilidades y controles reales;
  - se quitaron rutas locales del equipo del autor (`file:///Users/...`);
  - nueva sección de configuración recomendada del repositorio.
- **`.github/dependabot.yml`:** actualizaciones mensuales agrupadas de npm, pip (backend y raíz) y GitHub Actions.

## [1.3.2] - 2026-11-16 — *Compatibilidad automática, portada renovada y opiniones*

### 🎯 Compatibilidad con IA automática y aviso cuando cambia tu perfil
- **El porcentaje de compatibilidad se calcula solo.** Con la IA activa, Buscar empleo calcula el porcentaje de las ofertas visibles apenas aparecen (una consulta cada 15 ofertas) y las ordena por compatibilidad, sin pulsar "Ordenar ofertas con IA".
  - **Con la IA gratuita** (cupo diario), solo la primera página de cada búsqueda; el resto, desde el menú.
  - **Con clave propia**, cada página que se ve.
  - Mientras calcula, la tarjeta muestra "Calculando…".
- **Aviso "Tu perfil cambió".** Cada porcentaje guarda una huella de lo que se usó para calcularlo: experiencia, estudios, habilidades, palabras clave, lo que buscas y lo que Opi aprendió de ti.
  - Si algo de eso cambia, Buscar empleo y Mis postulaciones muestran el aviso con **Actualizar porcentajes**, y las tarjetas dicen "Desactualizado".
  - Cambiar el correo, el teléfono o los enlaces no genera el aviso.
- **Mis postulaciones** muestra el porcentaje de compatibilidad en la lista y en el detalle.
- **La IA ahora considera lo que Opi aprendió de ti** (`auto_learned_insights`) al calcular la compatibilidad.
- Nuevo test de extremo a extremo: `frontend/e2e/fit-auto-rank.spec.ts`.

### 🏠 Portada: "Tú manejas tu información. Nosotros te traemos las ofertas."
- **Nuevo mensaje principal** y sección **"Un trato claro"**:
  - **Tú controlas tu información:** el CV queda en tu navegador, sin cuenta, con respaldo y borrado cuando quieras.
  - **Oportia te trae las ofertas:** índice diario, compatibilidad con IA, vencimiento, CV y carta a la medida.
- **Fuentes actualizadas:** ya no menciona Computrabajo ni Laborum. Nueva tarjeta de "Compatibilidad automática".

### 💬 "¿Qué te parece Oportia?": opiniones, contacto voluntario y donación
- **Formulario** con calificación de 1 a 5, "qué te sirvió" y "qué mejorarías". Correo y teléfono **opcionales**:
  - solo se envían si se marca la autorización de contacto para mejoras o entrevistas;
  - el servidor y la base de datos también lo exigen.
- **Al enviar**, Oportia muestra un código para pedir el borrado y el enlace para **apoyar con una donación** (GitHub Sponsors).
- **Invitación automática** tras 30 a 60 minutos de uso real, con la pestaña visible:
  - "Ahora no" vuelve a preguntar 60 minutos después, máximo 3 veces;
  - si la persona ya respondió, no vuelve a preguntar;
  - no interrumpe la guía, la portada ni el chat.
- **Accesos:** "Danos tu opinión" en el pie de página y una sección en la portada.
- **`POST /api/opinion`:** guarda en la tabla `feedback` de Supabase con la clave publicable.
  - La tabla solo admite agregar filas; leerlas exige la clave secreta.
  - No se guarda la IP.
  - Límite de 5 envíos por minuto.
- **Borrado a los 12 meses:** la tarea diaria elimina las opiniones con más de 12 meses.
- **Privacidad 1.3.2:** nueva sección 9 sobre opiniones y contacto voluntario (Ley N° 21.719, transferencia internacional a Supabase en EE. UU.).
- Nueva variable de Vercel: `SUPABASE_PUBLISHABLE_KEY`.

## [1.3.1] - 2026-11-16 — *Fecha de vencimiento de las ofertas y manual actualizado*

### 📅 Vencimiento de las ofertas
- **Cada oferta tiene fecha de vencimiento.** Se muestra en la tarjeta de Buscar empleo y en Mis postulaciones, tanto en la lista como en el detalle:
  - **Fecha de cierre publicada:** "Cierra el 25 nov 2026".
  - **Solo fecha de publicación:** publicación + 30 días, "Vence aprox. el … (estimado)".
  - **Sin ninguna fecha** (por ejemplo, ChileTrabajos): **45 días desde que Oportia la indexó**, "(estimado)".
  - **Portales de empresas:** el plazo se renueva mientras la empresa siga publicando la oferta.
  - La etiqueta se pone ámbar cuando quedan 3 días o menos.
- **Las ofertas vencidas salen del índice diario, del correo y de Buscar empleo.** Las que guardaste siguen en Mis postulaciones con "Vencida el …".
- El índice diario incluye `expires_at` y `expires_estimated` en cada oferta.

### 🐞 Correcciones
- "Hace NaN sem" en la fecha de publicación de Empleos Públicos: su hora venía como "T0:00:00", que el navegador no reconoce. Ahora se normaliza en el servidor y se lee bien en la app.

### 📘 Manual de usuario 1.3.1
- Nuevas secciones y capturas:
  - Índice de hoy, "Buscar también en vivo" y "Para ti".
  - "Calza con tu perfil" y vencimiento de las ofertas.
  - Brechas con evidencia y cursos de todas las áreas.
  - Palabras clave, enlaces e idiomas en Mi perfil, y cambios al perfil desde el chat con Opi.
  - Índice diario y correo, para quien mantiene Oportia.
- Preguntas frecuentes nuevas: ofertas que desaparecen, qué significa "(estimado)" y por qué no aparecen Computrabajo ni Laborum.

## [1.3.0] - 2026-11-16 — *Índice diario de ofertas, correo de avisos y perfil completo*

### 🏢 Ofertas directas de empresas y fuentes que lo permiten (Etapa E de la versión 1.3)
- **Portales de empleo de empresas:** el índice diario suma las ofertas en Chile, o remotas para Latinoamérica, que las empresas publican en Greenhouse, Lever, Ashby y SmartRecruiters.
  - Hoy son unas 100 ofertas de Accor, Bosch, Toku, BTG Pactual Chile, Cabify, PedidosYa, Xepelin, Experian, Fintual, Clara y Acid Labs.
  - Siguen vigentes mientras estén publicadas.
- **Fuente "Portales de empresas"** en los filtros de Buscar empleo.
- **Fuera Computrabajo y Laborum**, tanto del índice como de la búsqueda en vivo: sus condiciones de uso prohíben el acceso automatizado y la reproducción de sus avisos.
- Google descartado como fuente: su API de búsqueda programable no acepta clientes nuevos.

### 🎯 Palabras clave por perfil (Etapa D de la versión 1.3)
- **"Para ti" sin escribir nada:** al buscar con el campo vacío, Oportia trae del índice diario las ofertas que calzan con tus palabras clave, profesiones y habilidades. Primero aparecen las que calzan con más términos.
- **"Calza con tu perfil"** en cada tarjeta muestra qué palabras tuyas aparecen en la oferta.
  - "Mayor compatibilidad" usa esa afinidad cuando la oferta aún no tiene evaluación con IA.
  - Se calcula en tu equipo, sin IA.
- **Al subir el CV** se agregan solas las palabras clave de tu área que aparecen en tu CV (máximo 12). El resto queda como sugerencia.
- **"Copiar para el aviso por correo"** en Mi perfil copia tus palabras clave para pegarlas en el secreto `NOTIFY_KEYWORDS` del correo diario.
- **Corrección:** en el filtro de la app, "TI" ya no calza con "**Ti**enda".

### ✉️ Correo diario con las ofertas nuevas (Etapa C de la versión 1.3)
- **Después de armar el índice de las 08:00, un correo con solo las ofertas que aparecieron hoy** (enviado con Resend).
  - Agrupadas por área, o por tus búsquedas (`NOTIFY_KEYWORDS`).
  - Máximo 2 por empresa y 80 en total, cada una con enlace a la fuente original.
  - Si no hay ofertas nuevas, no se envía nada.
- **Correo privado:** la dirección es un secreto de GitHub (`NOTIFY_EMAIL`). Nunca se imprime, y se oculta si un error de Resend la incluye.
- Vista previa sin enviar: `--preview-email`. Configuración en `docs/INDICE_DIARIO.md`.
- **El índice se publica con las claves nuevas de Supabase** (`sb_secret_…`) y con las antiguas. Los errores y el resumen quedan visibles en GitHub Actions sin iniciar sesión.

### ⚡ Índice diario de ofertas (Etapa B de la versión 1.3)
- **Búsqueda al instante.** Todas las mañanas, a las 08:00 de Chile, una tarea de GitHub Actions junta **más de 1.500 ofertas de Chile de todas las áreas** y publica un índice comprimido de unos 160 KB en Supabase Storage.
  - Fuentes: Empleos Públicos, GetOnBoard, Computrabajo y ChileTrabajos. LinkedIn no se usa.
  - La búsqueda responde con ese índice en menos de un segundo, con el aviso **"Resultados del índice de hoy"** y el botón **"Buscar también en vivo"**. Si el índice tiene pocas coincidencias, busca en vivo automáticamente.
- **Limpieza:** quita duplicados por URL y por cargo + empresa + ciudad, descarta ofertas vencidas o de más de 30 días y **clasifica por área** sin IA (17 áreas).
- **Fecha en que apareció cada oferta,** para avisar solo las nuevas (Etapa C).
- `GET /api/jobs/index/status`: fecha, total, nuevas de hoy, áreas y fuentes.
- **Privacidad:** el índice solo tiene ofertas públicas y el servidor lo guarda en memoria, no en disco.
  - Para publicarlo se usa una clave que solo está en los secretos de GitHub.
  - Configuración en `docs/INDICE_DIARIO.md`.
- **Computrabajo volvió a funcionar:** el portal cambió sus direcciones de búsqueda y su HTML, y la búsqueda en vivo devolvía 0 ofertas.
- **Relevancia más precisa:**
  - "TI" ya no calza con "**Ti**enda".
  - La palabra buscada en el cargo pesa más que un sinónimo: "Guardia de Seguridad" queda antes que "Unidad de Seguridad del Paciente".

### 🎓 Brechas reales y cursos de todas las áreas (Etapa A3 de la versión 1.3)
- **"Mis brechas" compara de verdad** los requisitos de tus ofertas guardadas o evaluadas (hasta 8) con tu CV: ✅ **cumples** (con la evidencia del CV: habilidad, título, certificación o cargo), 🟡 **en parte o transferible**, ❌ **brecha**, con las ofertas que lo piden. Antes solo listaba tus propias habilidades (`POST /api/coach/gaps`, sin estado).
  - **Tu profesión y el titular del CV cuentan como evidencia:** un TENS ya no ve "TENS" como brecha.
  - **Con IA:** una sola consulta, que cita evidencia textual del CV y nunca inventa experiencia.
  - **Sin IA, o si la IA está descansando:** reglas con un diccionario de requisitos de todas las áreas (salud, educación, comercio, logística, administración, construcción, informática, sector público…), comparando cada palabra por raíz. Las licencias se comparan por su clase exacta.
- **Cursos para cualquier área:** el catálogo verificado devolvía sus 4 primeros cursos (Microsoft, AWS…) cuando no encontraba coincidencias, así que a una TENS le aparecía Microsoft Entra ID para "curaciones". Ahora se ofrecen búsquedas reales en **SENCE/OTEC, ChileValora, Coursera y edX**, sin inventar cursos ni precios. La pestaña Cursos parte con tu profesión.
- **"Ya lo terminé":** el curso pasa a tus certificaciones y el requisito queda como cumplido.

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
