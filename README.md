# Oportia Jobs IA — Tu talento. Tus decisiones. Tus oportunidades.

<div align="center">

[![CI — Integración Continua](https://github.com/alejandroham/Oportia.jobs/actions/workflows/ci.yml/badge.svg)](https://github.com/alejandroham/Oportia.jobs/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/Versi%C3%B3n-1.1.0%20Official-blue.svg?style=for-the-badge)](CHANGELOG.md)
[![Privacy: Ley 21.719](https://img.shields.io/badge/Privacidad-Ley%2021.719%20Chile-emerald.svg?style=for-the-badge)](PRIVACY.md)
[![Security Policy](https://img.shields.io/badge/Seguridad-Security%20Policy-blueviolet.svg?style=for-the-badge)](SECURITY.md)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Falejandroham%2FOportia.jobs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor%20❤️-alejandroham-ff69b4.svg?style=for-the-badge&logo=github)](https://github.com/sponsors/alejandroham)
[![Instagram](https://img.shields.io/badge/Instagram-@not.kano-E4405F.svg?style=for-the-badge&logo=instagram)](https://www.instagram.com/not.kano/)

<p align="center">
  <strong>El ecosistema inteligente que automatiza tu búsqueda laboral, protege tu información y te acompaña en tu desarrollo profesional.</strong><br>
  Equipado con el copiloto <strong>Opi</strong>, <strong>Comité Oportia (5 Evaluadores)</strong>, <strong>Opi Coach y Oportia Aprende</strong>, <strong>Oportia Radar</strong>, arquitectura <strong>Local-First sin estado</strong>, cumplimiento estricto con la <strong>Ley N° 21.719 de Chile</strong> y servidor nativo <strong>Model Context Protocol (MCP)</strong>.
</p>

[**📖 Leer el Manual de Usuario »**](docs/MANUAL_DE_USUARIO.md) · [**🛡️ Política de Privacidad »**](PRIVACY.md) · [**🔒 Política de Seguridad »**](SECURITY.md) · [**📝 Registro de Cambios »**](CHANGELOG.md)

</div>

---

## 🧭 ¿Qué es Oportia Jobs IA?

**Oportia Jobs IA** resuelve la fragmentación, el spam de postulaciones y la falta de privacidad en el mercado laboral contemporáneo:

> **La IA organiza y te orienta. Tú decides tu camino.**

- **Automatización asistida con autonomía humana:** Rastrea vacantes en las 16 regiones de Chile y remotas globales, convoca al **Comité Oportia**, calcula la **Compatibilidad Oportia** con citas textuales verificables de tu currículum, redacta CVs y cartas adaptadas con logros STAR y te conecta con cursos gratuitos certificados.
- **Soberanía y control absoluto:** No usamos bots que arriesguen tus cuentas. Tus datos solo salen de tu navegador hacia el proveedor de IA que tú eliges (Gemini, OpenAI o Claude) cuando usas una función de IA. Postulas siempre en **1 clic en el enlace oficial de la empresa o portal estatal con ClaveÚnica**.

---

## 🏗️ Arquitectura Local-First y Backend sin Estado (Opción A)

```mermaid
flowchart TD
    subgraph Navegador ["💻 Tu Dispositivo (Cliente Local-First)"]
        UI["⚛️ Interfaz React 18 + Vite + Tailwind\n(Cupertino HIG / Modo Día y Noche)"]
        Store["📦 useAppStore (Zustand)\n(Reactividad en memoria)"]
        IDB[("🗄️ IndexedDB (oportia_jobs_db)\n• Perfil y CV Maestro\n• Preferencias\n• Radar y Postulaciones\n• Memoria de Opi")]
        Crypto["🔐 WebCrypto API\n(AES-GCM 256 bits + PBKDF2)\nCustodia local de API Keys"]
    end

    subgraph Backend ["⚡ Servidor FastAPI sin Estado (Stateless)"]
        API["🚀 Endpoints Computacionales Efímeros\n(Sin guardar tus datos en el flujo principal)"]
        Guard["🛡️ Anti-Prompt Injection Guardian\n& Sanitizador de URLs (Anti-SSRF)"]
        Limiter["⏱️ Rate Limiter por IP\n(Memoria volátil)"]
        Cache["🧠 Caché Volátil de Ofertas (15 min)"]
    end

    subgraph Externo ["🌐 Proveedores Externos & Fuentes"]
        LLM["🤖 Proveedores de IA (BYOK)\n• Google Gemini\n• Anthropic Claude\n• OpenAI GPT"]
        Scrapers["🔎 Radar Concurrente (fuentes en paralelo)\n• Arbeitnow, Remotive, RemoteOK\n• Portales Chile (Get on Board, CompuTrabajo,\nChileTrabajos, Laborum, Empleos Públicos, LinkedIn)\n• Portales ATS (Greenhouse, Lever, Ashby)"]
    end

    UI <--> Store
    Store <--> IDB
    Store <--> Crypto
    UI -->|Petición HTTPS + Encabezados X-LLM efímeros| API
    API --> Guard
    API --> Limiter
    API --> Cache
    API -->|Llamada con clave en memoria (descartada post-respuesta)| LLM
    API -->|Búsqueda paralela con fallback| Scrapers
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
| **Inicio** | `/` | 🏠 | Panel de control con tarjeta inteligente de *Siguiente paso recomendado*, checklist de avance del candidato y métricas en tiempo real. |
| **Buscar empleo** | `/empleos` | 🛰️ | Radar de empleo en Chile (16 regiones) y remoto global, filtros por modalidad y región, orden por compatibilidad y alerta de resiliencia ante caídas de fuentes. |
| **Mis postulaciones** | `/postulaciones` | 🎯 | Lista filtrable por estado y ficha de cada postulación con 3 pestañas (*Documentos*, *Preparar entrevista*, *Historial y notas*), cambio de estado en 1 clic y generador de CV adaptado y carta formal. |
| **Aprender** | `/aprender` | 🎓 | 4 pestañas especializadas: Cursos gratuitos oficiales (Microsoft, AWS, Google, Cisco, SENCE), diagnóstico de brechas, rutas de aprendizaje y simulador de entrevistas STAR. |
| **Mi perfil** | `/perfil` | 👤 | Editor de currículum modular por bloques plegables, extractor automático multiformato (PDF/Word) y preferencias laborales unificadas. |
| **Ajustes** | `/ajustes` | ⚙️ | Configuración de proveedores de IA (BYOK), selector de apariencia (Claro/Oscuro/Sistema), respaldos cifrados `.oportia` y botón de purga total inmediata. |
| **Copiloto Opi** | Flotante | 💬 | Asistente conversacional inteligente disponible en todo momento con biblioteca de sugerencias rápidas contextuales. |

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
- **Node.js:** v20.0.0 o superior (con `npm`)
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
# 1. Pruebas de Backend (Pytest — 22 pruebas unitarias y de integración offline)
pytest backend/tests -v

# 2. Pruebas de Frontend (Vitest — 32 pruebas unitarias en entorno happy-dom)
cd frontend && npm test

# 3. Flujo Crítico End-to-End (Playwright — Chromium headless)
cd frontend && npm run test:e2e

# 4. Verificación de Tipos TypeScript y Build de Producción
cd frontend && npm run build
```

El pipeline de **GitHub Actions** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) ejecuta automáticamente estas suites en cada commit y pull request en ramas de desarrollo.

---

## ☁️ Despliegue en Producción

- **Vercel (Frontend Estático / Serverless):** Configuración oficial en `vercel.json`. Construye el paquete cliente en `frontend/dist` y enruta llamadas `/api/*` a la función serverless en `api/index.py`. Ver [docs/DESPLIEGUE_VERCEL.md](docs/DESPLIEGUE_VERCEL.md).
- **Render / Railway / Fly.io (Backend Completo):**
  - Render: Configurado mediante `render.yaml`.
  - Docker / Contenedores: Ejecuta `python run.py` escuchando en el puerto `$PORT` asignado por la plataforma.

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

## 📄 Licencia

Distribuido bajo los términos de la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.
