# Plan de Mejoras — Oportia Jobs IA (ex Nexus Job)

> **Para quién es este documento:** para el agente de IA (Gemini) o el desarrollador que continuará el proyecto.
> Léelo completo antes de tocar código. Está ordenado por fases; **ejecuta una fase a la vez, en orden**, y cumple los criterios de aceptación de cada tarea antes de pasar a la siguiente.
>
> **Fecha del análisis:** 12-11-2026 · **Versión analizada:** v1.0.1 (commit `b2dd986`)

---

## 0. Contexto rápido del proyecto

| Aspecto | Estado actual |
| :--- | :--- |
| Nombre | **Oportia Jobs IA** (antes *Nexus Job*). Aún quedan restos del nombre viejo: `nexus_enc_v1` en `backend/app/config.py`, logos `nexusjob-*.png` en `frontend/public/`, extensión de respaldo `.nexusjob`, "Chat Nexus" en el CHANGELOG. |
| Frontend | React 18 + Vite 5 + TypeScript + Tailwind 3 + lucide-react. **Sin router**, sin librería de estado, sin tests. Carpeta `frontend/`. |
| Backend | FastAPI + Pydantic, persistencia en archivos JSON dentro de `data/`. Agentes LLM en `backend/app/agents/`, scrapers en `backend/app/scrapers/`. Servidor MCP en `backend/app/mcp_server.py`. |
| IA | Gemini / OpenAI / Claude vía `backend/app/agents/llm_provider.py`. Sin clave cae a un "modo heurístico" que **devuelve respuestas simuladas**. |
| Despliegue | Vercel (`vercel.json` + `api/index.py`) y Render (`render.yaml`). Local con `start_app.sh` / `.bat` / `.ps1`. |
| Idioma | Todo en español (Chile). **Mantener el español** en UI, comentarios nuevos y commits. |

### Cómo correrlo en local
```bash
# Backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python run.py            # http://localhost:8000

# Frontend (otra terminal)
cd frontend && npm install && npm run dev   # http://localhost:3000 (proxy /api → 8000)
```

### Tamaño de los archivos más problemáticos
| Archivo | Líneas | Problema |
| :--- | ---: | :--- |
| `frontend/src/components/ProfileStudio.tsx` | 3.039 | Editor de perfil + vista previa de CV + versiones + IA, todo junto |
| `frontend/src/components/JobRadar.tsx` | 2.444 | Búsqueda + filtros + 3 banners + drawer de estrategia + 4 modales + Comité |
| `frontend/src/components/PipelineTracker.tsx` | 1.913 | Lista + ficha 360° + documentos + simulador de entrevista + bitácora |
| `frontend/src/components/CoachStudio.tsx` | 1.010 | 5 sub-pestañas |
| `frontend/src/components/PreferencesCenter.tsx` | 978 | Memoria + chat + historias STAR + preferencias de búsqueda |

---

## 1. Diagnóstico: ¿por qué la gente dice que es "complejo de usar"?

Estos son los hallazgos concretos, con la evidencia en el código. Cada uno se resuelve en alguna fase de la sección 4.

### 1.1 Demasiadas puertas de entrada y nombres que no dicen qué hacen
- La barra superior tiene **6 pestañas** (`Navbar.tsx`): *Mi Oportia, Oportia Radar, Mis Postulaciones, Opi Coach, Perfil & CV, Oportia Skills*, más 3 botones a la derecha (pastilla del LLM, "Datos & Salir", tema), más el botón flotante "Opi Copiloto".
- Los nombres son de **marca, no de tarea**. Un usuario nuevo no sabe que "Oportia Skills" es en realidad *memoria de la IA + preferencias de búsqueda + historias STAR*, ni que "Mi Oportia" es el inicio.
- Hay mucho vocabulario técnico expuesto al usuario final: *ATS Dorks, STAR, Soberanía Digital, Dual Score, Comité, Cerebro Cognitivo, ADN Profesional, Calibración, Modo Offline Heurístico*.

### 1.2 No existe un camino guiado ("¿qué hago primero?")
- `WelcomeHub.tsx` (625 líneas) es una **página de marketing**: hero, "¿Qué es Oportia?", 6 tarjetas de módulos, privacidad, footer. No le dice al usuario *su* siguiente paso.
- No hay onboarding: el usuario tiene que descubrir solo que debe (1) subir el CV, (2) configurar qué busca, (3) poner una API key, (4) escanear ofertas.
- Al recargar, `App.tsx` salta directo a `radar` si detecta datos, lo que desorienta.

### 1.3 Funcionalidades duplicadas en distintos lugares
| Funcionalidad | Dónde aparece |
| :--- | :--- |
| Simulador de entrevistas | `CoachStudio.tsx` (sub-pestaña 5) **y** `PipelineTracker.tsx` (pestaña "Tips Entrevista") |
| Vista previa de CV con plantilla / tema de papel / imprimir | `ProfileStudio.tsx` **y** `PipelineTracker.tsx` |
| Preferencias de búsqueda (región, comuna, remoto, roles) | `PreferencesCenter.tsx`, filtros avanzados de `JobRadar.tsx` y sección regional de `ProfileStudio.tsx` |
| Chat con Opi | Botón flotante global (`App.tsx`) **y** sub-pestaña dentro de "Oportia Skills" |
| Respaldo/privacidad | Botón "Datos & Salir", botón del hero de Welcome, y sección de privacidad |

El usuario no sabe cuál es "el lugar correcto" y los cambios en uno no siempre se reflejan en otro.

### 1.4 Sobrecarga visual en cada pantalla
- **Radar** muestra a la vez: hero con 4 botones de acción, 3 banners descartables, barra de búsqueda, pastillas de filtro, filtros avanzados, selector de vista, ordenamiento, paginación, drawer lateral con 2 pestañas, y 4 modales.
- **Texto diminuto**: hay **294 usos de `text-[10px]`/`text-[11px]`** y **432 de `text-xs`** (12px). La mayor parte del contenido se lee en 10–12px → cansa, se ve "denso" y falla accesibilidad.
- **Colores sin sistema**: 32 colores hexadecimales distintos escritos a mano en los componentes; se mezclan el azul de Apple (`blue-600`) y el verde-azulado de marca (`#20A88A`, `#173B50`) como color primario según la pantalla.
- `index.html` usa `user-scalable=no, maximum-scale=1.0` → **impide hacer zoom** en móvil (grave para accesibilidad, más aún con letra de 10px).

### 1.5 Móvil
- La barra inferior tiene 6 íconos con etiquetas de 10px y el botón flotante "Opi Copiloto" se superpone por encima.

### 1.6 El "modo sin IA" engaña
- Sin API key, `llm_provider._heuristic_fallback()` devuelve evaluaciones del Comité, preguntas de entrevista, etc. **inventadas/genéricas** con la misma apariencia que las reales. El usuario cree que la app lo evaluó. Esto daña la confianza.

### 1.7 Código muerto y restos de plantilla
- `ApplicationStudio.tsx`: se renderiza con `activeTab === 'applications'` pero **ninguna pestaña navega ahí** → código muerto.
- `frontend/src/main.ts`, `counter.ts`, `style.css`, `assets/vite.svg`, `assets/typescript.svg`, `assets/hero.png`: restos de la plantilla de Vite.
- `frontend/vercel.json` duplica `vercel.json` de la raíz. `run.py` existe en raíz y en `backend/`.
- La versión `v1.0.1` aparece como pastilla visible en la barra de navegación.

---

## 2. Problemas técnicos críticos (antes que la estética)

> ⚠️ **Estos van primero.** El punto 2.1 es un problema de privacidad real si la app está desplegada públicamente.

### 2.1 🔴 El backend es de un solo usuario pero está desplegado como si fuera multiusuario
- Perfil, ofertas, postulaciones, memoria **y las API keys** se guardan en archivos JSON globales (`data/*.json`) y en variables globales (`settings.GEMINI_API_KEY`).
- Si la app está en Render/Vercel, **todas las personas que la abren comparten el mismo perfil, las mismas postulaciones y la misma API key**. Cualquiera puede:
  - leer el perfil/CV de otra persona con `GET /api/profile`,
  - usar (y gastar) la API key guardada por otro,
  - borrar todo con `POST /api/purge-all`.
- CORS está abierto a `*` (`backend/app/main.py:49`).
- Esto **contradice** lo que promete el README ("100% Local-First", "cero recolección en servidores").

### 2.2 🔴 Las API keys no están cifradas
- `config.py::_mask_key()` solo hace **base64** de `"nexus_enc_v1:" + key`. Eso no es cifrado; cualquiera con el archivo `data/llm_settings.json` recupera la clave. El README dice que "nunca se guardan en texto plano" → es engañoso.

### 2.3 🟠 Dos fuentes de verdad
- El frontend guarda todo en IndexedDB (`utils/storage.ts`) **y** el backend en JSON. `App.tsx` intenta sincronizar a mano (seed desde servidor, `api.updateProfile` al restaurar, etc.). Esto produce datos desincronizados y bugs difíciles de reproducir.
- En Vercel el backend escribe en `/tmp/data` (efímero): los datos del servidor desaparecen entre invocaciones.

### 2.4 🟠 El proyecto no pasa el chequeo de tipos
- `npx tsc --noEmit` falla: falta `"jsx": "react-jsx"` en `frontend/tsconfig.json`, y hay errores de tipos en `utils/crypto.ts` (líneas 111 y 142, `Uint8Array` vs `BufferSource`). Vite compila igual porque no verifica tipos, pero los errores se acumulan sin que nadie se entere.
- No hay ESLint, ni tests de frontend, ni CI.

### 2.5 🟡 Otros
- **Sin router**: la navegación es un `useState('welcome')`. No hay URLs por pantalla, el botón "Atrás" del navegador/celular saca de la app, no se puede compartir un enlace a una postulación.
- **Prop drilling**: `App.tsx` guarda todo el estado y lo pasa por props a componentes gigantes.
- **Modelos por defecto desactualizados**: `claude-3-5-sonnet-20241022` (`config.py`, `App.tsx`) ya está retirado; `gpt-4o` y `gemini-3.5-flash` deben verificarse contra la documentación oficial vigente de cada proveedor. Centralizar los IDs de modelo en un solo lugar.
- **Scraping de LinkedIn** (`scrapers/linkedin_guest.py`): frágil y con riesgo frente a los términos de uso del sitio. Aislarlo, poner timeouts y que su falla nunca bloquee la búsqueda.
- **Afirmaciones de marketing** a moderar: "Cifrado Militar", "bitácora inviolable", "sin alucinaciones". Son promesas que el código no puede garantizar.

---

## 3. Propuesta de nueva arquitectura de información (la base de la usabilidad)

### 3.1 Principios
1. **Un lugar para cada cosa.** Ninguna funcionalidad vive en dos pantallas.
2. **Nombres de tarea, no de marca.** La marca va en el logo y en "Opi"; las secciones dicen lo que hacen.
3. **Siempre un "siguiente paso" visible.** El usuario nunca debe preguntarse qué hacer.
4. **Divulgación progresiva.** Lo avanzado (ATS Dorks, directorio de empresas, plantillas de papel) queda detrás de "Opciones avanzadas".
5. **Honestidad con la IA.** Si no hay IA conectada, se dice claramente y no se muestran resultados simulados como si fueran reales.

### 3.2 Nuevo mapa de navegación (de 6 + extras → 5 secciones)

| Nuevo nombre (UI) | Ruta | Reemplaza a | Contenido |
| :--- | :--- | :--- | :--- |
| **Inicio** | `/` | Mi Oportia (WelcomeHub) | Checklist de progreso + "Tu siguiente paso" + resumen (ofertas nuevas, postulaciones activas, próxima entrevista). La parte de marketing se va a una página "Acerca de". |
| **Buscar empleo** | `/empleos` | Oportia Radar | Buscador + resultados. Filtros simples visibles; avanzados en un panel. Evaluación del Comité al abrir una oferta. |
| **Mis postulaciones** | `/postulaciones` y `/postulaciones/:id` | Mis Postulaciones | Lista + ficha de cada postulación. **Aquí vive** el CV adaptado, la carta y la preparación de entrevista *para esa oferta*. |
| **Aprender** | `/aprender` | Opi Coach | Brechas, cursos, rutas y casos prácticos. El simulador de entrevistas **general** (no ligado a una oferta) vive solo aquí. |
| **Mi perfil** | `/perfil` | Perfil & CV + Oportia Skills | Sub-secciones: *Mi CV* · *Qué busco* (todas las preferencias en un solo lugar) · *Mis logros (historias STAR)* · *Lo que Opi sabe de mí* (memoria). |
| **Ajustes** (menú del ícono ⚙️, no pestaña) | `/ajustes` | SettingsModal + SessionPrivacyModal + toggle de tema | *Conexión de IA* · *Mis datos y privacidad* (respaldar, restaurar, borrar todo) · *Apariencia*. |
| **Opi** (botón flotante) | — | Opi Copiloto + chat en Skills | Un único chat global. Se elimina la sub-pestaña de chat en "Oportia Skills". |

En móvil: barra inferior de **5 ítems** (Inicio, Empleos, Postulaciones, Aprender, Perfil). Opi pasa a ser un botón dentro de la barra superior o un FAB ubicado **por encima** de la barra sin taparla.

### 3.3 Glosario de renombres (aplicar en toda la UI)
| Antes | Después |
| :--- | :--- |
| Mi Oportia | Inicio |
| Oportia Radar | Buscar empleo |
| Oportia Skills | (se divide en "Mi perfil → Qué busco / Mis logros / Lo que Opi sabe de mí") |
| Opi Coach & Oportia Aprende | Aprender |
| Comité Oportia / Comité de Evaluación IA | Evaluación de compatibilidad (con el detalle "5 perspectivas" dentro) |
| Compatibilidad Oportia / Dual Score | Compatibilidad hoy · Compatibilidad potencial |
| ATS Dorks | Búsqueda en portales de empresas (avanzado) |
| Historias STAR | Mis logros (con un tooltip que explica el método STAR) |
| ADN Profesional / Cerebro Cognitivo / Calibración | Lo que Opi sabe de ti |
| Datos & Salir | Ajustes → Mis datos |
| Modo Offline Heurístico | IA no conectada |
| Transferir al Coach IA | Ver cómo cerrar estas brechas |

---

## 4. Plan de implementación por fases

> **Reglas para cada fase:** una rama y un PR por fase (o por tarea grande). Al terminar cada fase: `cd frontend && npm run build` y `npx tsc --noEmit` deben pasar, y `python test_e2e.py` no debe empeorar. No cambies el formato de los respaldos cifrados sin mantener compatibilidad de lectura con archivos antiguos (`.oportia` y `.nexusjob`).

---

### FASE 0 — Limpieza y salud del build *(rápida, sin riesgo)*

**Objetivo:** dejar una base limpia y verificable antes de refactorizar.

| # | Tarea | Archivos | Criterio de aceptación |
| :-- | :-- | :-- | :-- |
| 0.1 | Agregar `"jsx": "react-jsx"` al `tsconfig.json` y corregir los errores de `utils/crypto.ts` (usar `new Uint8Array(buffer)` tipado como `Uint8Array<ArrayBuffer>` o castear a `BufferSource`). | `frontend/tsconfig.json`, `frontend/src/utils/crypto.ts` | `npx tsc --noEmit` termina sin errores. |
| 0.2 | Agregar script `"typecheck": "tsc --noEmit"` y que `build` lo ejecute antes (`tsc --noEmit && vite build`). | `frontend/package.json` | Un error de tipos rompe el build. |
| 0.3 | Eliminar restos de plantilla Vite: `main.ts`, `counter.ts`, `style.css`, `assets/vite.svg`, `assets/typescript.svg`, `assets/hero.png` (verificar con grep que nadie los importe). | `frontend/src/` | Build OK, sin imports rotos. |
| 0.4 | Eliminar `ApplicationStudio.tsx` y su bloque en `App.tsx` (no es alcanzable). Si tiene algo útil, moverlo a la ficha de postulación. | `App.tsx`, `components/ApplicationStudio.tsx` | Nada en la UI cambia. |
| 0.5 | Unificar despliegue: dejar un solo `vercel.json` (raíz) y un solo `run.py`. Documentar en el README cuál es la forma oficial de desplegar. | raíz, `frontend/vercel.json`, `backend/run.py` | Un solo camino documentado. |
| 0.6 | Agregar ESLint + Prettier (config mínima: `eslint-plugin-react-hooks`, `jsx-a11y`). Corregir solo errores, no reformatear todo en el mismo PR. | `frontend/` | `npm run lint` existe y pasa. |
| 0.7 | Centralizar IDs de modelos LLM en un solo archivo (`backend/app/agents/models.py`) y exponerlos vía `GET /api/settings`. Quitar los IDs hardcodeados en `App.tsx`. Verificar los IDs vigentes en la documentación oficial de cada proveedor (el de Claude por defecto está retirado). | `config.py`, `llm_provider.py`, `App.tsx`, `SettingsModal.tsx` | Cambiar un modelo = editar un solo archivo. |
| 0.8 | Quitar `maximum-scale=1.0, user-scalable=no` del viewport. | `frontend/index.html` | Se puede hacer zoom en iPhone. |
| 0.9 | Quitar la pastilla `v1.0.1` de la barra; mostrar la versión en Ajustes → Acerca de. | `Navbar.tsx` | — |

---

### FASE 1 — Decisión de arquitectura y privacidad *(crítica)*

**Objetivo:** que la promesa "tus datos son tuyos" sea verdad también cuando la app está desplegada.

> ✅ **DECISIÓN TOMADA (12-11-2026): el dueño del proyecto eligió la Opción A — backend sin estado.** Implementa solo la Opción A. La Opción B queda descartada y se deja abajo solo como referencia; **no la implementes**.

**Opción A (ELEGIDA) — Backend sin estado + datos solo en el navegador**
- IndexedDB del navegador es la **única fuente de verdad** de perfil, preferencias, ofertas guardadas, postulaciones, memoria y datos del Coach.
- El backend pasa a ser un **servicio de cómputo sin estado**: recibe en cada request lo que necesita (p. ej. `{ profile, job }` para evaluar) y devuelve el resultado. No guarda nada del usuario.
- La API key del usuario se guarda **solo en el navegador** (cifrada con WebCrypto, ya existe `utils/crypto.ts`) y viaja por request en un header (`X-LLM-Provider`, `X-LLM-Key`, `X-LLM-Model`). El backend la usa para esa llamada y la descarta. Nunca se escribe a disco ni se loguea.
- Alternativa local: si el usuario corre la app en su propia máquina, puede seguir usando `.env` con su clave (modo "instalación personal").

**Opción B — Cuentas de usuario** *(DESCARTADA — no implementar)*
- Login (p. ej. Supabase/Auth0), base de datos por usuario, claves cifradas en servidor con KMS. Más trabajo y cambia la promesa de privacidad. Solo si se quiere sincronizar entre dispositivos.

**Tareas (Opción A):**

| # | Tarea | Criterio de aceptación |
| :-- | :-- | :-- |
| 1.1 | Crear `frontend/src/state/` con un store único (Zustand o `useReducer` + Context) que lea/escriba IndexedDB. Reemplazar los `useEffect` de autosync de `App.tsx`. | `App.tsx` ya no tiene lógica de carga/sincronización. |
| 1.2 | Mover la API key al navegador: `SettingsModal` la cifra y guarda localmente; `api.ts` agrega los headers en cada llamada a endpoints de IA. | `data/llm_settings.json` ya no se crea. `GET /api/settings` no revela si "alguien" tiene clave. |
| 1.3 | Refactorizar endpoints para que sean puros: `POST /api/jobs/evaluate` recibe `{profile, job, preferences}`; `POST /api/applications/draft` recibe `{profile, job}`; etc. Mantener los viejos durante la transición marcados como deprecados. | Ningún endpoint lee `data/profile.json` ni `data/jobs.json`. |
| 1.4 | Búsqueda de ofertas: `POST /api/jobs/search` recibe filtros y devuelve resultados; el frontend los guarda en IndexedDB. Agregar caché en memoria con TTL corto en el backend (por consulta, no por usuario). | Dos navegadores distintos no ven los datos del otro. |
| 1.5 | Eliminar o proteger `POST /api/purge-all` y `POST /api/settings/purge` (ya no hay nada que purgar en el servidor). "Borrar todo" pasa a ser `clearClientStore()`. | — |
| 1.6 | Restringir CORS a los orígenes reales (variable de entorno `ALLOWED_ORIGINS`). | `allow_origins=["*"]` desaparece. |
| 1.7 | Rate limiting básico por IP en endpoints de scraping e IA (p. ej. `slowapi`). | — |
| 1.8 | Migración: al primer arranque con la nueva versión, si el navegador no tiene datos pero el backend local sí (`data/*.json`), ofrecer "Importar mis datos anteriores" una sola vez. | Usuarios existentes no pierden información. |
| 1.9 | Actualizar README y textos de privacidad para que digan exactamente lo que el sistema hace. Quitar "cifrado militar", "inviolable", "sin alucinaciones". | Las afirmaciones del README son verificables en el código. |

---

### FASE 2 — Navegación nueva y router

**Objetivo:** implementar el mapa de la sección 3.2.

| # | Tarea | Criterio de aceptación |
| :-- | :-- | :-- |
| 2.1 | Instalar `react-router-dom` y crear las rutas de la tabla 3.2. Configurar Vercel para SPA (ya existe el fallback a `index.html`). | Cada sección tiene URL; el botón Atrás funciona; recargar mantiene la pantalla. |
| 2.2 | Nuevo `Navbar`: 5 ítems con nombres nuevos + ícono ⚙️ (menú Ajustes) + indicador de IA simplificado (punto verde "IA conectada" / gris "IA no conectada", clic → Ajustes). Quitar "Datos & Salir" y el toggle de tema de la barra (van a Ajustes). | Barra superior con máx. 5 pestañas + 2 íconos. |
| 2.3 | Barra inferior móvil con 5 ítems, etiquetas ≥ 11px, `padding-bottom: env(safe-area-inset-bottom)`. Reubicar el botón de Opi para que no tape la barra. | Probado en 375×812 sin solapes. |
| 2.4 | Página `/ajustes` (o panel) que unifica `SettingsModal` + `SessionPrivacyModal` + tema, en 3 secciones: *Conexión de IA*, *Mis datos y privacidad*, *Apariencia*, *Acerca de*. | Los modales viejos se eliminan. |
| 2.5 | Unificar Opi: un único `MemoryChat` en el panel flotante. Eliminar la sub-pestaña de chat de `PreferencesCenter`. | Solo hay un chat en toda la app. |
| 2.6 | Aplicar el glosario 3.3 en todos los textos visibles. | `grep -r "Oportia Skills\|ATS Dorks\|Modo Offline Heurístico" frontend/src` → sin resultados en texto de UI. |

---

### FASE 3 — Onboarding guiado e Inicio útil

**Objetivo:** que un usuario nuevo llegue a ver ofertas compatibles en menos de 3 minutos sin leer un manual.

**3.1 Asistente de bienvenida (solo la primera vez)** — pantalla completa, 3 pasos con barra de progreso, cada paso se puede saltar:
1. **"Sube tu CV"** (PDF o Word, arrastrar o elegir). Mostrar lo extraído en un resumen editable corto (nombre, cargo, años, 5 habilidades). Botón "Se ve bien" / "Corregir después".
2. **"¿Qué estás buscando?"** — 3 preguntas: cargo(s) (con sugerencias desde el CV usando `role_recommender`), región/comuna o "Remoto", jornada/modalidad. Guarda en `preferences`.
3. **"Conecta la IA (opcional)"** — explicación en 2 líneas de para qué sirve + enlace a cómo obtener una clave gratuita de Gemini + campo para pegarla. Botón "Lo haré después" bien visible.
→ Al terminar: lanzar la primera búsqueda automáticamente y llevar a `/empleos`.

**3.2 Inicio nuevo** (reemplaza `WelcomeHub.tsx`):
- **Tarjeta "Tu siguiente paso"** — una sola acción, calculada según el estado:
  - sin CV → "Sube tu CV"
  - sin preferencias → "Cuéntanos qué buscas"
  - sin búsquedas → "Busca tus primeras ofertas"
  - ofertas sin evaluar → "Revisa las 5 ofertas más compatibles"
  - postulación con entrevista próxima → "Prepara tu entrevista con X"
- **Checklist de progreso** (CV · Preferencias · IA conectada · Primera postulación) con porcentaje.
- **Resumen**: ofertas nuevas desde la última visita, postulaciones por estado, próximos eventos.
- El contenido de marketing actual (qué es Oportia, módulos, privacidad) se mueve a **Ajustes → Acerca de** o a una landing aparte.

**3.3 Estados vacíos** en cada sección: ilustración/ícono + 1 frase + 1 botón. Ej. Postulaciones vacías: "Aún no postulas a ninguna oferta. → Buscar empleo".

**Criterio de aceptación de la fase:** prueba con 3–5 personas que nunca usaron la app: deben subir su CV, ver ofertas y guardar una en seguimiento **sin ayuda**. Anotar dónde se traban.

---

### FASE 4 — Simplificar cada pantalla (y partir los componentes gigantes)

**Regla general de refactor:** ningún componente nuevo debe superar **~300 líneas**. Estructura sugerida por feature:
```
frontend/src/features/
  empleos/      (JobSearchPage, JobFilters, JobCard, JobDetail, FitEvaluationPanel, ImportUrlDialog)
  postulaciones/(ApplicationsPage, ApplicationList, ApplicationDetail, DocumentsTab, InterviewTab, TimelineTab)
  aprender/     (LearnPage, GapsTab, CoursesTab, PathsTab, PracticeTab, InterviewSimulator)
  perfil/       (ProfilePage, CvEditor, CvPreview, SearchPreferences, Achievements, OpiMemory)
  inicio/       (HomePage, NextStepCard, ProgressChecklist, Onboarding/)
  ajustes/      (SettingsPage, AiConnection, DataPrivacy, Appearance, About)
frontend/src/components/ui/   (componentes compartidos, ver Fase 5)
```

#### 4.1 Buscar empleo (`JobRadar.tsx` → `features/empleos/`)
- **Arriba, solo:** campo de búsqueda + botón "Buscar" + 3 filtros visibles (Ubicación, Modalidad, Ordenar por).
- **"Más filtros"** abre un panel con: región/comuna detallada, alcance geográfico, salario, etc.
- **Eliminar los 3 banners** descartables. Su información útil pasa a: un tooltip ⓘ junto al título, el onboarding, o Ajustes → Acerca de.
- **Acciones secundarias** (Importar por URL, Ordenar con IA, Vaciar resultados, Búsqueda en portales de empresas, Directorio de empresas) → un solo menú "•••" junto al buscador.
- **Tarjeta de oferta**: título (16px), empresa · ubicación · modalidad (14px), compatibilidad como pastilla grande con color + texto ("85% · Alta"), salario si existe. **Acciones: "Ver detalle"** (primaria) y **"Guardar"** (secundaria). Nada más en la tarjeta.
- **Detalle de oferta** (panel lateral en desktop, pantalla completa en móvil): descripción, evaluación de compatibilidad resumida (veredicto + 3 fortalezas + 3 brechas) con "Ver evaluación completa" que despliega las 5 perspectivas. Botones: "Postular con CV adaptado" y "Abrir oferta original".
- Paginación simple o "Cargar más"; eliminar el selector 6/12/24.

#### 4.2 Mis postulaciones (`PipelineTracker.tsx` → `features/postulaciones/`)
- Vista de lista con filtros por estado (Guardada · Postulada · Entrevista · Oferta · Cerrada). Opcional: vista Kanban en desktop.
- Ficha de postulación con 3 pestañas claras: **Documentos** (CV adaptado + carta, con un solo botón "Descargar PDF" y "Opciones de formato" plegado), **Preparar entrevista** (usa el componente compartido `InterviewSimulator` con el contexto de esa oferta), **Historial** (bitácora).
- Cambiar estado con un selector simple en la cabecera; al pasar a "Cerrada" preguntar el resultado (alimenta `outcome_agent`).
- Eliminar el código duplicado de vista previa de CV: usar el componente compartido `CvPreview`.

#### 4.3 Mi perfil (`ProfileStudio.tsx` + `PreferencesCenter.tsx` → `features/perfil/`)
- Sub-navegación con 4 secciones: **Mi CV**, **Qué busco**, **Mis logros**, **Lo que Opi sabe de mí**.
- **Mi CV**: editor por bloques (Datos, Resumen, Experiencia, Educación, Habilidades, Idiomas, Certificaciones), cada uno colapsable con indicador "completo/incompleto". Vista previa en un botón "Ver mi CV" (componente `CvPreview` compartido). Las "versiones de CV" se gestionan en un menú simple.
- **Qué busco**: el **único** lugar con preferencias (cargos, región/comuna, remoto, salario, condiciones que descartas). Los filtros de búsqueda de empleo se inicializan desde aquí.
- **Mis logros**: biblioteca de historias STAR con un formulario guiado (Situación → Tarea → Acción → Resultado) con ejemplos.
- **Lo que Opi sabe de mí**: lista legible de lo aprendido + botón "Olvidar esto" por ítem + "Reiniciar memoria".

#### 4.4 Aprender (`CoachStudio.tsx` → `features/aprender/`)
- Reducir de 5 a 4 pestañas: **Mis brechas**, **Cursos**, **Mi ruta**, **Practicar** (casos prácticos + simulador de entrevista general, ambos usando componentes compartidos).
- En "Mis brechas", cada brecha muestra de qué ofertas viene y un botón "Buscar curso".

#### 4.5 Componentes compartidos a extraer (eliminan la duplicación de 1.3)
- `CvPreview` (plantilla, tema de papel, alineación, imprimir/PDF) — usado en Perfil y Postulaciones.
- `InterviewSimulator` (pregunta → respuesta → feedback STAR) — usado en Aprender y Postulaciones.
- `SearchPreferencesForm` — usado en Onboarding y Perfil.
- `FitScoreBadge`, `FitEvaluationSummary`.

---

### FASE 5 — Sistema de diseño y accesibilidad

| # | Tarea | Criterio de aceptación |
| :-- | :-- | :-- |
| 5.1 | **Tokens de color** en `tailwind.config.js`: `brand` (primario = `#20A88A` / variantes), `ink` (`#173B50`), `surface`, `muted`, `success`, `warning`, `danger`. Reemplazar los 32 hex sueltos y el `blue-600` usado como primario. | `grep -rE "#[0-9A-Fa-f]{6}" frontend/src/components` → solo casos justificados. Un único color primario. |
| 5.2 | **Escala tipográfica**: cuerpo 14–16px, mínimo absoluto 12px (solo para metadatos). Eliminar `text-[10px]` y `text-[11px]`. Títulos de página 24px, de sección 18px. | 0 usos de `text-[10px]`/`text-[11px]`. |
| 5.3 | **Componentes UI base** en `components/ui/`: `Button` (primary/secondary/ghost/danger, tamaños), `Card`, `Dialog` (con foco atrapado y cierre con Esc), `Tabs`, `Badge`, `EmptyState`, `Field` (label + input + error), `Menu`, `Tooltip`. | Las features nuevas solo usan estos componentes. |
| 5.4 | **Accesibilidad**: contraste AA (4.5:1), todos los botones de ícono con `aria-label`, navegación con teclado, foco visible, objetivos táctiles ≥ 44px, `<button>` en lugar de `<div onClick>` (hay varios en `WelcomeHub.tsx`). | Lighthouse Accessibility ≥ 90 en cada sección. |
| 5.5 | **Estados de carga y error** consistentes: skeletons en listas, mensajes de error con acción ("Reintentar"). Mensaje claro para el *cold start* de Render. | — |
| 5.6 | Respetar `prefers-color-scheme` como tema inicial (hoy fuerza modo día). | — |

---

### FASE 6 — IA honesta y mejores textos

| # | Tarea | Criterio de aceptación |
| :-- | :-- | :-- |
| 6.1 | **Eliminar resultados simulados** de `_heuristic_fallback()` para evaluación de compatibilidad, entrevistas, tutor y coach. Sin IA: devolver un error tipado (`{"error": "ai_not_connected"}`) y que la UI muestre "Conecta la IA para obtener esta evaluación → Conectar". Mantener solo lo que es determinista y real (parseo de CV, filtros, catálogo de cursos). | Sin API key nunca se muestra una "evaluación" inventada. |
| 6.2 | Si se conserva algún cálculo sin IA (p. ej. coincidencia de palabras clave), etiquetarlo visiblemente: "Estimación básica (sin IA)". | — |
| 6.3 | Revisar todos los textos con criterios de UX writing: frases cortas, segunda persona, verbos de acción en botones ("Subir CV", "Guardar oferta"), sin jerga. Lenguaje inclusivo y neutral. | — |
| 6.4 | Manejar errores del proveedor LLM (clave inválida, cuota agotada, timeout) con mensajes específicos y accionables. | — |
| 6.5 | Mostrar en la evaluación de compatibilidad **por qué** (evidencias citadas del CV) y un aviso breve: "Es una orientación, no una decisión". | — |

---

### FASE 7 — Calidad, pruebas y CI

| # | Tarea | Criterio de aceptación |
| :-- | :-- | :-- |
| 7.1 | Backend: convertir `test_e2e.py` y `backend/test_universal_radar.py` a **pytest**, con fixtures que usen un directorio temporal y un LLM falso (mock). Los tests de scrapers no deben llamar a internet (usar HTML guardado). | `pytest` pasa offline. |
| 7.2 | Frontend: **Vitest + Testing Library** para lógica (`storage`, `crypto`, cálculo del "siguiente paso") y componentes UI base. | `npm test` pasa. |
| 7.3 | E2E con **Playwright** para el flujo crítico: onboarding → buscar → guardar → postular → ver documentos. | Corre en CI. |
| 7.4 | GitHub Actions: lint + typecheck + tests + build en cada PR. | Badge verde en el README. |
| 7.5 | Scrapers robustos: timeout por fuente, ejecución en paralelo, una fuente caída no rompe la búsqueda, y la UI indica "X fuentes no respondieron". | — |

---

### FASE 8 — Pulido final

- Rendimiento: carga diferida (`React.lazy`) por ruta; revisar el tamaño del bundle.
- PWA: el `manifest.json` ya existe; agregar service worker solo si se quiere uso offline real.
- Limpiar restos de "Nexus": renombrar logos `nexusjob-*` (o borrarlos si no se usan), cambiar el prefijo `nexus_enc_v1` **manteniendo lectura** de respaldos antiguos.
- Analítica **respetuosa y opcional** (opt-in, sin datos personales) para medir: % que completa el onboarding, tiempo hasta la primera oferta guardada, secciones menos usadas.
- Actualizar `docs/MANUAL_DE_USUARIO.md`, `README.md` y `CHANGELOG.md` con la nueva estructura. Reducir el README a: qué es, captura, cómo instalar, cómo desplegar, privacidad (honesta).

---

## 5. Orden recomendado y prioridades

| Prioridad | Fase | Por qué |
| :-- | :-- | :-- |
| 🔴 1 | Fase 0 — Limpieza | Rápida y habilita todo lo demás. |
| 🔴 2 | Fase 1 — Arquitectura/privacidad | Riesgo real de exponer datos de usuarios si está desplegada. |
| 🟠 3 | Fase 2 — Navegación | Es el cambio que más reduce la sensación de "complejo". |
| 🟠 4 | Fase 3 — Onboarding + Inicio | Resuelve "no sé por dónde empezar". |
| 🟡 5 | Fase 4 — Simplificar pantallas | El refactor grande; hacerlo feature por feature. |
| 🟡 6 | Fase 5 — Diseño y accesibilidad | Se puede hacer en paralelo con la Fase 4 (los componentes UI primero). |
| 🟢 7 | Fase 6 — IA honesta | Confianza del usuario. |
| 🟢 8 | Fases 7 y 8 | Sostenibilidad del proyecto. |

## 6. Cómo medir si mejoró la usabilidad

Hacer una prueba rápida con **5 personas** antes de empezar (línea base) y después de la Fase 4. Tareas:
1. "Sube tu CV y revisa que tus datos estén bien."
2. "Encuentra una oferta en tu región que te interese y guárdala."
3. "Prepara tu postulación a esa oferta y descarga el CV adaptado."
4. "Borra todos tus datos de la app."

Medir: ¿la completó sin ayuda?, tiempo, número de clics, y una pregunta final: *"Del 1 al 10, ¿qué tan fácil fue?"*. Meta: 4 de 5 personas completan las 4 tareas sin ayuda y la nota promedio ≥ 8.

---

## 7. Reglas de trabajo para el agente (Gemini)

1. **Lee antes de editar.** Los componentes son grandes; ubica la sección exacta (usa los comentarios `{/* ... */}` como índice).
2. **Una fase a la vez.** No mezcles refactor estructural con cambios visuales en el mismo commit.
3. **No borres funcionalidad sin reubicarla.** Si algo se elimina de una pantalla, debe existir en su nuevo lugar (ver tabla 3.2) o estar justificado.
4. **No inventes datos ni resultados de IA** en la interfaz.
5. **Compatibilidad de respaldos:** cualquier cambio en `utils/crypto.ts` o en el formato de exportación debe seguir leyendo archivos `.oportia` y `.nexusjob` antiguos.
6. **Nunca registres, imprimas ni guardes en disco una API key** del usuario.
7. **Verifica al final de cada tarea:** `npx tsc --noEmit`, `npm run build`, y que la app abra en `localhost:3000` en desktop y en 375px de ancho.
8. **Commits en español** con formato convencional: `feat(empleos): ...`, `fix(perfil): ...`, `refactor(ui): ...`.
9. Ante una decisión de producto no cubierta aquí, **pregunta al dueño del proyecto** en lugar de decidir. (La arquitectura ya está decidida: Opción A, backend sin estado. No agregues bases de datos, login ni almacenamiento de datos de usuario en el servidor.)
