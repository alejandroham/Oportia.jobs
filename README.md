# Oportia Jobs IA — Tu talento. Tus decisiones. Tus oportunidades.

<div align="center">

[![CI — Integración Continua](https://github.com/alejandroham/Oportia.jobs/actions/workflows/ci.yml/badge.svg)](https://github.com/alejandroham/Oportia.jobs/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/Versi%C3%B3n-1.5.1-blue.svg?style=for-the-badge)](CHANGELOG.md)
[![Privacy: Ley 21.719](https://img.shields.io/badge/Privacidad-Ley%2021.719%20Chile-emerald.svg?style=for-the-badge)](PRIVACY.md)
[![Security Policy](https://img.shields.io/badge/Seguridad-Security%20Policy-blueviolet.svg?style=for-the-badge)](SECURITY.md)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Falejandroham%2FOportia.jobs)
[![License: Apache 2.0](https://img.shields.io/badge/Licencia-Apache%202.0-blue.svg?style=for-the-badge)](LICENSE)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor%20❤️-alejandroham-ff69b4.svg?style=for-the-badge&logo=github)](https://github.com/sponsors/alejandroham)
[![Instagram](https://img.shields.io/badge/Instagram-@not.kano-E4405F.svg?style=for-the-badge&logo=instagram)](https://www.instagram.com/not.kano/)

<p align="center">
  <strong>Tú manejas tu información. Nosotros te traemos las ofertas.</strong><br>
  Ofertas de empleo de todo Chile cada mañana, compatibilidad con IA, CV y carta a la medida, y el copiloto <strong>Opi</strong>. Tu CV y tus datos viven en tu navegador (arquitectura <strong>Local-First sin estado</strong>, <strong>Ley N° 21.719 de Chile</strong>).
</p>

[**📖 Leer el Manual de Usuario »**](docs/MANUAL_DE_USUARIO.md) · [**🛡️ Política de Privacidad »**](PRIVACY.md) · [**🔒 Política de Seguridad »**](SECURITY.md) · [**📝 Registro de Cambios »**](CHANGELOG.md)

</div>

---

## 🧭 ¿Qué es Oportia Jobs IA?

**Oportia Jobs IA** resuelve la fragmentación, el spam de postulaciones y la falta de privacidad en el mercado laboral contemporáneo:

> **La IA organiza y te orienta. Tú decides tu camino.**

- **Tú manejas tu información; Oportia te trae las ofertas.** Tu CV, tu perfil y tus postulaciones se guardan en tu navegador: sin cuenta y sin base de datos de candidatos. Descargas un respaldo cifrado o lo borras todo cuando quieras.
- **Para todas las áreas, no solo tecnología:** salud, educación, comercio, construcción, logística, administración, sector público y oficios. La búsqueda reconoce sinónimos y equivalentes en inglés (enfermera ↔ TENS ↔ nurse; técnico en construcción ↔ supervisor de obra ↔ capataz).
- **Índice diario de ofertas:**
  - Cada mañana, a las 08:00 de Chile, se reúnen cientos de ofertas, y la búsqueda las consulta al instante.
  - Fuentes: Empleos Públicos, GetOnBoard, **portales de empleo de las empresas** (Greenhouse, Lever, Ashby, SmartRecruiters) y ChileTrabajos. Solo se usan fuentes que permiten este uso.
  - Cada oferta muestra **cuándo vence**: la fecha de cierre o una estimación. Las vencidas se ocultan.
  - Opcionalmente, un correo diario con las ofertas nuevas. Ver [docs/INDICE_DIARIO.md](docs/INDICE_DIARIO.md).
- **Tu CV, analizado con IA:**
  - La IA separa tu experiencia laboral, tus títulos y tus cursos. "Reanalizar con IA" corrige tu perfil sin volver a subir el archivo.
  - En **Qué busco** te propone **cargos afines a tu experiencia**, cada uno con un resumen de por qué calza.
  - En **Mis logros** extrae tus logros en formato STAR, sin inventar cifras.
  - Opi también actualiza tu perfil, lo que buscas y tus logros desde el chat.
- **Compatibilidad automática:**
  - Con la IA activa, cada oferta muestra tu porcentaje sin que lo pidas.
  - Si cambias tu experiencia o lo que Opi sabe de ti, Oportia te avisa para recalcularlo.
  - "Calza con tu perfil" muestra, sin IA, qué palabras tuyas aparecen en la oferta.
- **Postulas con documentos a la medida:** CV y carta adaptados a cada oferta, en PDF, más preparación de entrevista y brechas con cursos de cualquier área (SENCE, ChileValora, Coursera y edX). Tú postulas en el enlace oficial: Oportia no envía postulaciones automáticas.
- **IA gratuita o tu propia clave:** la IA gratuita de Oportia tiene cupo diario y un aviso de privacidad; con tu clave de Gemini, OpenAI o Claude la usas sin límite. Buscar ofertas y armar tu CV funciona también sin IA.
- **Ofertas de otros portales:** botones "Buscar también en" abren tu búsqueda en Indeed, Computrabajo, Laborum, LinkedIn y la Bolsa Nacional de Empleo; si te gusta una oferta, pegas su texto y Oportia la ordena y la guarda en tus postulaciones (solo para ti).
- **Tu opinión cuenta:** "¿Qué te parece Oportia?" recoge opiniones y, solo con tu autorización, un contacto para entrevistas de usuario.

<p align="center"><img src="docs/manual/img/01-portada.jpg" alt="Portada de Oportia Jobs IA" width="820"></p>

---

## 🏗️ Arquitectura Local-First y Backend sin Estado (Opción A)

```mermaid
flowchart TD
    subgraph Navegador ["💻 Tu Dispositivo - Cliente Local-First"]
        UI["⚛️ Interfaz React 18 + Vite + Tailwind<br>Cupertino HIG y Modo Día/Noche"]
        Store["📦 useAppStore - Zustand<br>Reactividad en memoria"]
        IDB[("🗄️ IndexedDB - oportia_jobs_db<br>• Perfil y CV Maestro<br>• Preferencias<br>• Radar y Postulaciones<br>• Memoria de Opi")]
        Crypto["🔐 WebCrypto API<br>AES-GCM 256 bits y PBKDF2<br>Custodia local de claves"]
    end

    subgraph Backend ["⚡ Servidor FastAPI sin Estado"]
        API["🚀 Endpoints Computacionales Efímeros<br>Sin persistencia en disco"]
        Guard["🛡️ Anti-Prompt Injection Guardian<br>y Sanitizador de URLs Anti-SSRF"]
        Limiter["⏱️ Rate Limiter por IP en memoria"]
        Cache["🧠 Caché Volátil de Ofertas - 15 min<br>e índice diario en memoria - 30 min"]
    end

    subgraph Externo ["🌐 Proveedores Externos y Fuentes"]
        LLM["🤖 Proveedores de IA<br>• IA gratuita de Oportia (Gemini, con cupo)<br>• BYOK: Gemini, Claude u OpenAI"]
        Scrapers["🔎 Búsqueda en vivo, tiempo máximo 7s<br>• Empleos Públicos, GetOnBoard, ChileTrabajos<br>• LinkedIn Chile y tableros remotos"]
        Supa[("🗂️ Supabase<br>• Índice diario de ofertas públicas<br>• Opiniones: solo se pueden agregar")]
        GHA["⏰ GitHub Actions 08:00 Chile<br>Arma el índice y envía el correo"]
    end

    UI <--> Store
    Store <--> IDB
    Store <--> Crypto
    UI -->|Petición HTTPS con encabezados X-LLM| API
    API --> Guard
    API --> Limiter
    API --> Cache
    API -->|Llamada efímera con clave en memoria| LLM
    API -->|Búsqueda paralela con tolerancia a fallos| Scrapers
    API -->|Lee el índice / guarda opiniones| Supa
    GHA -->|Publica el índice cada mañana| Supa
```

### Garantías Principales de la Arquitectura
1. **Tus datos viven en tu navegador:** Tu perfil, experiencias, postulaciones y memoria se guardan en `IndexedDB`. La interfaz usa endpoints sin estado que reciben los datos en cada petición y no los guardan.
   > ⚠️ **Transición en curso:** el backend aún conserva endpoints heredados (por ejemplo `PUT /api/profile`, `PUT /api/preferences`, `POST /api/jobs/scrape`) y el servidor MCP, que leen y escriben archivos en `data/`. La interfaz web ya no los usa para el flujo principal; están pensados para la instalación local y se retirarán en una próxima versión.
2. **Custodia de Claves de IA en el Cliente:** Tus claves de API se cifran localmente con `WebCrypto` (AES-GCM de 256 bits). Viajan protegidas en encabezados HTTPS solo al invocar funciones de IA y el backend las descarta de memoria inmediatamente tras recibir la respuesta del proveedor.
3. **Sin base de datos de candidatos:** El backend no tiene base de datos de usuarios. Los CV subidos se procesan en un archivo temporal que se elimina apenas se extrae el texto.

---

## 🌟 Los Módulos del Sistema

| Módulo | Ruta | Icono | Descripción Funcional |
| :--- | :---: | :---: | :--- |
| **Conoce Oportia** | `/conoce-oportia` | ✨ | Portada de presentación (se muestra en la primera visita): qué es Oportia, cómo funciona en 3 pasos, áreas, fuentes, privacidad e IA. |
| **Inicio** | `/` | 🏠 | Panel de control con tarjeta inteligente de *Siguiente paso recomendado*, checklist de avance del candidato y métricas en tiempo real. |
| **Buscar empleo** | `/empleos` | 🛰️ | Índice diario y búsqueda en vivo; "Para ti" con tus palabras clave; compatibilidad con IA automática y aviso si tu perfil cambió; "Calza con tu perfil"; vencimiento de cada oferta; filtros por modalidad, región y fuente (incluye portales de empresas). |
| **Mis postulaciones** | `/postulaciones` | 🎯 | Postulaciones por estado, con su porcentaje y su vencimiento. Cada ficha tiene 3 pestañas: *Documentos* (CV y carta adaptados en PDF), *Preparar entrevista* e *Historial y notas*. |
| **Aprender** | `/aprender` | 🎓 | *Mis brechas*: requisitos de tus ofertas frente a tu CV, con evidencia. *Cursos* de SENCE, ChileValora, Coursera y edX. *Mi ruta* y *Practicar*. |
| **Mi perfil** | `/perfil` | 👤 | *Mi CV*: análisis con IA, "Reanalizar con IA" y edición de experiencia, títulos, cursos, enlaces, idiomas y palabras clave. *Qué busco*: cargos sugeridos con su resumen. *Mis logros* en formato STAR. *Lo que Opi sabe de mí*. |
| **Ajustes** | `/ajustes` | ⚙️ | IA gratuita de Oportia (aviso de privacidad y cupo diario) o clave propia; apariencia clara u oscura; respaldo cifrado `.oportia`; "Borrar todos mis datos" con doble confirmación. |
| **Copiloto Opi** | Flotante | 💬 | Asistente que conversa, te orienta y actualiza tu perfil, lo que buscas y tus logros (siempre con tu confirmación). |
| **Danos tu opinión** | Pie de página | 💬 | Calificación y comentarios, contacto voluntario con autorización y enlace de donación. Aparece una vez tras 30 a 60 minutos de uso. |

---

## 👥 Comité Oportia (5 Evaluadores Colegiados)

Oportia Jobs IA evalúa cada oferta convocando a 5 perspectivas colegiadas con ponderación transparente:

```text
                       ┌────────────────────────────┐
                       │   Director del Comité      │
                       │   (Síntesis y Veredicto)   │
                       └─────────────┬──────────────┘
                                     │
         ┌──────────────┬────────────┴───┬──────────────┬──────────────┐
         ▼              ▼                ▼              ▼              ▼
   ┌───────────┐  ┌───────────┐    ┌───────────┐  ┌───────────┐  ┌───────────┐
   │ Reclutador│  │  Hiring   │    │Especialista│ │Filtro ATS │  │ Estratega │
   │   RRHH    │  │  Manager  │    │  Técnico  │  │(Screening)│  │de Carrera │
   │   (25%)   │  │   (25%)   │    │   (25%)   │  │   (15%)   │  │   (10%)   │
   └───────────┘  └───────────┘    └───────────┘  └───────────┘  └───────────┘
```

- **Dual Score:** Puntaje Actual (lo demostrado hoy) vs Puntaje Potencial (proyección tras capacitarse).
- **Evidencias Citadas:** Citas textuales de tu CV justificando requisitos cumplidos, parciales y no cumplidos.
- **IA Honesta:** Si no tienes clave configurada, no se inventan puntuaciones falsas; el sistema te orienta con transparencia para continuar manualmente o conectar tu proveedor preferido.

---

## 🚀 Inicio Rápido

### Requisitos del Sistema
- **Node.js:** v20.19 o superior (con `npm`)
- **Python:** v3.11 o superior (con `pip` y soporte de `venv`)

### Opción 1: Lanzador Rápido en 1 Clic (Recomendado)

- **macOS / Linux:**
  ```bash
  ./start_app.sh
  ```
- **Windows:**
  Haz doble clic en `start_app.bat` (o ejecuta `./start_app.ps1` en PowerShell).

El lanzador valida dependencias, compila el frontend y levanta la aplicación en `http://localhost:8000` (o `http://localhost:3000` en desarrollo).

### Opción 2: Inicio Manual

1. **Backend (FastAPI):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # En Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   python run.py             # Servidor iniciado en http://localhost:8000
   ```

2. **Frontend (React + Vite + Tailwind — en otra terminal):**
   ```bash
   cd frontend
   npm install
   npm run dev               # Interfaz disponible en http://localhost:3000
   ```

---

## 🧪 Pruebas Automatizadas y Calidad Continua

El proyecto cuenta con una suite integral de pruebas con **100% de ejecución offline** y cero dependencias de red externa:

```bash
# 1. Pruebas de Backend (Pytest — 178 pruebas unitarias y de integración offline)
pytest backend/tests -v

# 2. Pruebas de Frontend (Vitest — 92 pruebas unitarias en entorno happy-dom)
cd frontend && npm test

# 3. Flujo Crítico End-to-End (Playwright — Chromium headless)
cd frontend && npm run test:e2e

# 4. Verificación de Tipos TypeScript y Build de Producción
cd frontend && npm run build

# 5. Regenerar las capturas del manual de usuario (datos de demostración ficticios)
cd frontend && npm run docs:screenshots
```

El pipeline de **GitHub Actions** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) ejecuta automáticamente estas suites en cada commit y pull request en ramas de desarrollo.

---

## ☁️ Despliegue en Producción

- **Vercel (Frontend Estático / Serverless):** Configuración oficial en `vercel.json`. Construye el paquete cliente en `frontend/dist` y enruta llamadas `/api/*` a la función serverless en `api/index.py`. Ver [docs/DESPLIEGUE_VERCEL.md](docs/DESPLIEGUE_VERCEL.md).
- **Render / Railway / Fly.io (Backend Completo):**
  - Render: Configurado mediante `render.yaml`.
  - Docker / Contenedores: Ejecuta `python run.py` escuchando en el puerto `$PORT` asignado por la plataforma.
- **Índice diario y correo (opcional):** GitHub Actions + Supabase Storage + Resend; configuración en [docs/INDICE_DIARIO.md](docs/INDICE_DIARIO.md).
- **IA gratuita de Oportia (opcional):** define `GEMINI_API_KEY` en el servidor con una clave de un proyecto de Google **sin facturación** (plan gratuito). Ajusta el cupo con `SHARED_AI_DAILY_LIMIT_PER_USER`, `SHARED_AI_DAILY_LIMIT_PER_IP` y `SHARED_AI_DAILY_LIMIT_TOTAL` (ver `.env.example`). Sin esa variable, solo funciona la clave propia de cada persona.

---

## 🔌 Servidor Model Context Protocol (MCP)

Oportia Jobs IA incluye un servidor nativo **MCP** para integrar tu radar y postulaciones como herramienta de contexto en clientes como **Claude Desktop**, **Cursor** o **Gemini CLI**.

> ℹ️ El servidor MCP es solo para **instalación local**: lee y guarda en la carpeta `data/` de tu equipo, no en el navegador, por lo que no ve los datos que cargaste en la interfaz web.

```json
{
  "mcpServers": {
    "oportia-jobs": {
      "command": "python",
      "args": ["run_mcp.py"],
      "cwd": "/ruta/a/Oportia.jobs",
      "env": {
        "GEMINI_API_KEY": "tu_clave_de_gemini"
      }
    }
  }
}
```

---

## 🛡️ Privacidad y Seguridad

- Consulta los detalles normativos de la **Ley N° 21.719 de Chile**, el modelo de datos Local-First y los derechos ARCO en [PRIVACY.md](PRIVACY.md).
- Revisa el modelo de amenazas, las defensas anti-prompt injection, mitigaciones SSRF y la política de divulgación responsable en [SECURITY.md](SECURITY.md).

---

## 💖 Comunidad, Autor y Patrocinio

**Oportia Jobs IA** es un proyecto de código abierto creado y mantenido con dedicación por **Alejandro Ham** para devolver el control, la dignidad y la transparencia a las personas que buscan trabajo.

- 📸 **Instagram Oficial:** [https://www.instagram.com/not.kano/](https://www.instagram.com/not.kano/) — Sigue a **`@not.kano`** para novedades, consejos de empleabilidad y contacto directo.
- ❤️ **GitHub Sponsors:** [https://github.com/sponsors/alejandroham](https://github.com/sponsors/alejandroham) — Tu patrocinio financia infraestructura de pruebas y el desarrollo continuo de herramientas libres.
- 🐙 **Repositorio Oficial:** [https://github.com/alejandroham/Oportia.jobs](https://github.com/alejandroham/Oportia.jobs)
- 📖 **Manual de Usuario:** [docs/MANUAL_DE_USUARIO.md](docs/MANUAL_DE_USUARIO.md)

---

## 👥 Créditos

- **Alejandro Ham** — autor, creador y director del proyecto ([github.com/alejandroham](https://github.com/alejandroham)).
- **Gemini** vía Google Antigravity — implementación asistida de parte del código.
- **Claude** vía Claude Code (Anthropic) — diagnóstico, planificación, implementación y revisión asistidas.

Las herramientas de IA asistieron el desarrollo; la autoría y la titularidad del proyecto son de Alejandro Ham. Detalle en [CONTRIBUTORS.md](CONTRIBUTORS.md).

---

## 📄 Licencia

Distribuido bajo la **Licencia Apache 2.0** ([LICENSE](LICENSE)). © 2026 Alejandro Ham.

Puedes usar, modificar y redistribuir Oportia, también con fines comerciales, siempre que:

1. **Conserves** los archivos [`LICENSE`](LICENSE) y [`NOTICE`](NOTICE) y los avisos de autoría.
2. **Indiques** de forma visible qué archivos modificaste.
3. **No uses la marca:** la licencia no da permiso para usar los nombres "Oportia" ni "Opi", ni sus logotipos e ilustraciones (sección 6 de la licencia).
