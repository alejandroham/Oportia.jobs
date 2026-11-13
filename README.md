# Oportia Jobs IA — Tu talento. Tus decisiones. Tus oportunidades.

<div align="center">

[![CI — Integración Continua](https://github.com/alejandroham/Oportia.jobs/actions/workflows/ci.yml/badge.svg)](https://github.com/alejandroham/Oportia.jobs/actions/workflows/ci.yml)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Falejandroham%2FOportia.jobs)
[![Guía Vercel](https://img.shields.io/badge/Deploy%20en%20Vercel-Gu%C3%ADa%20Paso%20a%20Paso-black.svg?style=for-the-badge&logo=vercel)](docs/DESPLIEGUE_VERCEL.md)
[![Version](https://img.shields.io/badge/Versi%C3%B3n-1.0.1%20Official-blue.svg?style=for-the-badge)](CHANGELOG.md)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor%20❤️-alejandroham-ff69b4.svg?style=for-the-badge&logo=github)](https://github.com/sponsors/alejandroham)
[![Instagram](https://img.shields.io/badge/Instagram-@not.kano-E4405F.svg?style=for-the-badge&logo=instagram)](https://www.instagram.com/not.kano/)
[![Manual de Usuario](https://img.shields.io/badge/📖%20Manual%20de%20Usuario-Ver%20Guía-blue.svg?style=for-the-badge)](docs/MANUAL_DE_USUARIO.md)
[![Changelog](https://img.shields.io/badge/Changelog-Ver%20Cambios-indigo.svg?style=for-the-badge)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Local First](https://img.shields.io/badge/Privacy-100%25%20Local--First-emerald.svg?style=for-the-badge)](docs/MANUAL_DE_USUARIO.md#9-privacidad-respaldos-cifrados-aes-256--ley-n-21719)

<p align="center">
  <strong>El ecosistema inteligente que automatiza tu búsqueda laboral, protege tu información y te acompaña en tu desarrollo profesional.</strong><br>
  Equipado con el copiloto <strong>Opi</strong>, <strong>Comité Oportia (5 Evaluadores)</strong>, <strong>Opi Coach y Oportia Aprende</strong>, <strong>Oportia Radar</strong>, diseño con <strong>Modo Día predeterminado y Modo Noche</strong>, cumplimiento con la <strong>Ley N° 21.719 de Chile</strong> y servidor nativo <strong>Model Context Protocol (MCP)</strong>.
</p>

[**📖 Leer el Manual de Usuario Completo »**](docs/MANUAL_DE_USUARIO.md)

</div>

---

## 🧭 ¿Qué es Oportia Jobs IA?

**Oportia Jobs IA** resuelve la fragmentación y falta de transparencia del mercado laboral moderno. La idea fundamental es:
> **La IA organiza y te orienta. Tú decides tu camino.**

- **Automatización con autonomía humana:** Rastrea ofertas en Chile y el mundo, convoca al **Comité Oportia**, estima la **Compatibilidad Oportia**, adapta tu CV y carta a la medida con logros STAR reales y te conecta con recursos de **Oportia Aprende**.
- **Tú mantienes el 100% del control sobre tus decisiones:** No usamos bots a ciegas que arriesguen tu cuenta. Tú validas tus antecedentes bajo la Ley N° 21.719 y postulas en **1 clic en el enlace oficial de la empresa**, incluso en portales estatales que exigen ClaveÚnica.

---

## 🏗️ Arquitectura General del Ecosistema

```mermaid
flowchart TD
    subgraph Fuentes ["1. Fuentes & Búsqueda Soberana"]
        Chile["🇨🇱 Cobertura Chile (16 Regiones)\n(Get on Board, CompuTrabajo,\nChileTrabajos, Laborum)"]
        Global["🌍 Remoto Global\n(RemoteOK, Arbeitnow,\nRemotive, LinkedIn)"]
        Dorks["🔎 Motor ATS Dorks Limpio\n(Greenhouse, Lever, Ashby,\nWorkday, SmartRecruiters, Taleo)"]
        URL["🔗 Importador Seguro URL\n(Sanitización anti-inyecciones)"]
    end

    subgraph Inteligencia ["2. Agentes Cognitivos & Comité Colegiado"]
        Profile["📄 Perfil Universal & CV Maestro\n(Extracción multiformato verificable)"]
        Committee["👥 Comité de Evaluación IA\n• 1. Reclutador RRHH (25%)\n• 2. Hiring Manager (25%)\n• 3. Experto Técnico (25%)\n• 4. Filtro ATS (15%)\n• 5. Estratega Carrera (10%)\n• Director de Selección (Síntesis)\n• Dual Score (Actual vs Potencial)"]
        CoachIA["🎓 Coach IA & Tutor Práctico\n• Diagnóstico de Brechas Formativas\n• Catálogo Verificado (Microsoft, AWS, Google, Cisco, SENCE)\n• Rutas de Aprendizaje por Hitos\n• Tutor de Casos Prácticos de Industria\n• Simulador de Entrevistas STAR por Rol"]
        Drafter["📝 Drafter-Reviewer Formal\n(CV adaptado .formal-justify y Carta Persuasiva)"]
        MemoryEngine["🧠 Cerebro Cognitivo Continuo\n(ADN Profesional, Historias STAR y Calibración)"]
    end

    subgraph Presentacion ["3. Interfaz de Usuario (Apple Cupertino HIG)"]
        WelcomeUI["🏠 Welcome Hub\n(Control de mando, estado y 6 módulos)"]
        RadarUI["🛰️ Radar de Empleo\n(Paginación [6|12|24], orden por Fit Score)"]
        TrackerUI["🎯 Mis Postulaciones (360°)\n(Master-Detail, Documentos, Bitácora)"]
        CoachUI["🎓 Coach Studio\n(Diagnóstico, Cursos, Rutas, Tutor, Simulador)"]
        ProfileUI["👤 Perfil Studio\n(Editor, trayectoria, habilidades universales)"]
        MemoryUI["💡 Memoria Cognitiva\n(ADN profesional, calibración, reinicio seguro)"]
        FooterUI["🦶 Footer Global\n(Instagram @not.kano y GitHub Sponsors)"]
    end

    Fuentes --> RadarUI
    Profile --> Committee
    RadarUI --> Committee
    Committee -->|Brechas Sincronizadas| CoachIA
    Committee --> TrackerUI
    TrackerUI --> Drafter
    CoachIA --> MemoryEngine
    TrackerUI --> MemoryEngine
    MemoryEngine --> Drafter
    MemoryEngine --> MemoryUI
```

---

## 🌟 Los Módulos del Sistema

| Módulo | Icono | Descripción Funcional |
| :--- | :---: | :--- |
| **Mi Oportia (Welcome Hub)** | 🏠 | Monitor de estado del sistema, acceso rápido a los módulos, acciones en 1 clic y garantías de privacidad. |
| **Perfil & CV Studio** | 👤 | Carga inteligente de currículum (PDF/Word), extracción verificable y taxonomía universal de profesiones. |
| **Oportia Radar** | 🛰️ | Exploración en las 16 regiones de Chile y remotas globales, orden descendente por Compatibilidad Oportia. |
| **Comité Oportia** | 👥 | Evaluación asistida con 5 evaluadores, veredicto del Director y matriz de fortalezas y brechas. |
| **Opi Coach & Oportia Aprende** | 🎓 | Diagnóstico de brechas, catálogo de cursos gratuitos certificados, rutas por hitos, tutor de casos y simulador STAR. |
| **Mis postulaciones** | 🎯 | Flujo 360° con CV adaptado `.formal-justify`, carta de presentación, selector de papel formal y bitácora transparente. |
| **Oportia Skills & Memoria** | 🧠 | Cerebro que acumula tu ADN profesional, biblioteca de logros STAR validados y copiloto conversacional Opi. |

👉 Para conocer a fondo cada pantalla con recomendaciones visuales, consulta el **[Manual de Usuario](docs/MANUAL_DE_USUARIO.md)**.

---

## 👥 Comité Oportia (5 Evaluadores + Director)

A diferencia de los analizadores tradicionales con puntuaciones ciegas, Oportia Jobs IA reúne al **Comité Oportia**:

```
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

- **Dual Score de Compatibilidad Oportia:**
  - **Compatibilidad Actual (0-100%):** Lo que demuestras hoy en tu currículum frente a la vacante.
  - **Compatibilidad Potencial (0-100%):** Tu proyección alcanzable al completar las capacitaciones recomendadas por Opi Coach.
- **Matriz de Requisitos vs CV:** Evidencias textuales categorizadas en *Cumplido*, *Parcial* o *No Cumplido*.
- **Veredicto del Director:** Dictamen ejecutivo (*Postular Inmediatamente*, *Con Ajustes*, *Brecha Crítica* o *Descartar*).
- **Acción Inmediata:** Botón **"Transferir al Coach IA"** que envía las brechas detectadas al plan de capacitación con 1 clic.

---

## 🎓 Opi Coach & Centro de Superación Profesional

El módulo de **Opi Coach** acompaña al candidato durante todo su desarrollo profesional:

1. **Diagnóstico de Competencias:** Mapeo de brechas con indicadores de nivel actual vs requerido e impacto proyectado en puntos.
2. **Catálogo de Cursos Verificados (Oportia Aprende):** Enlaces oficiales y gratuitos sin enlaces rotos:
   - **Microsoft Learn** (Azure, DevOps, IA, C#).
   - **AWS Skill Builder** (Cloud, Arquitectura, Serverless).
   - **Cisco Networking Academy** (Ciberseguridad, Redes, Linux).
   - **Google Cloud Skills Boost** (Cloud Computing, Big Data, Gemini).
   - **SENCE Chile / Talento Digital** (Capacitación gratuita para Chile con código SENCE).
   - **Coursera & edX** (Especializaciones universitarias).
3. **Rutas de Aprendizaje por Hitos:** Planes estructurados paso a paso con objetivos, horas sugeridas y proyectos prácticos.
4. **Tutor de Casos Prácticos:** Resuelve desafíos reales de la industria y recibe una evaluación instantánea con nota `/100` y la solución recomendada.
5. **Simulador de Entrevistas por Rol:** Entrena con preguntas conductuales y técnicas frente al Reclutador de RRHH, el Líder Técnico, el Hiring Manager o el Director con retroalimentación **STAR**.

---

## 🛡️ Privacidad, Arquitectura sin Estado & Ley N° 21.719 de Chile

Oportia Jobs IA implementa una arquitectura **Backend sin Estado (Stateless)** y los más altos estándares de **Privacy by Design**:
- **Tus datos viven exclusivamente en tu navegador (IndexedDB):** Tu perfil, preferencias, postulaciones y memoria residen solo en tu equipo. El backend no tiene base de datos, cuentas de usuario ni persistencia en disco.
- **Custodia de Claves de IA en el Cliente:** Tu clave de API se guarda cifrada en tu navegador (WebCrypto) y viaja en headers HTTP únicamente cuando ejecutas una función con IA. El backend la usa para esa petición y la descarta de inmediato en memoria.
- **Respaldos Cifrados (`.oportia`):** Exporta e importa tus datos protegidos con **AES-GCM de 256 bits y derivación PBKDF2** bajo tu propia contraseña (compatible también con respaldos legacy `.nexusjob`).
- **Derecho al Olvido y Purga Total (Art. 17 Ley 21.719):** Un botón de purga total elimina permanentemente el 100% de tus datos con un solo clic.
- **Transparencia en IA:** La IA puede cometer errores; revisa siempre los antecedentes y sugerencias antes de postular.

---

## 🚀 Inicio Rápido

### Opción A: Lanzador en 1 Clic (Recomendado)

- **macOS / Linux:**
  ```bash
  ./start_app.sh
  ```
- **Windows:**
  Haz doble clic en `start_app.bat` (o ejecuta `./start_app.ps1` en PowerShell).

El instalador configura el entorno virtual, compila la interfaz y abre el sistema automáticamente en `http://localhost:8000`.

### Opción B: Ejecución Manual

```bash
# 1. Backend (FastAPI)
python -m venv venv
source venv/bin/activate  # En Windows: .\venv\Scripts\activate
pip install -r requirements.txt
python run.py             # Servidor iniciado en http://localhost:8000

# 2. Frontend (React + Vite + TailwindCSS - en otra terminal)
cd frontend
npm install
npm run dev               # Interfaz disponible en http://localhost:3000
```

### Despliegue Oficial en la Nube

- **Vercel:** Configuración oficial centralizada en `/vercel.json` en la raíz. Construye el cliente web (`frontend/dist`) y rutea llamadas API a la función serverless en `api/index.py`. Ver guía detallada en [docs/DESPLIEGUE_VERCEL.md](docs/DESPLIEGUE_VERCEL.md).
- **Render:** Configuración oficial mediante `/render.yaml`. Levanta el servicio web ejecutando Uvicorn en el puerto asignado.

Abre **http://localhost:3000** en tu navegador.

---

## 🔌 Servidor Model Context Protocol (MCP)

Conecta Oportia Jobs IA como backend de datos de empleo para **Claude Desktop**, **Cursor** o **Gemini CLI**:

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

## 💖 Comunidad, Autor y Patrocinio (GitHub Sponsors)

Oportia Jobs IA es desarrollado con dedicación por **Alejandro Ham** como una herramienta de código abierto para devolver el control y la transparencia laboral a las personas.

- 📸 **Instagram Oficial:** [https://www.instagram.com/not.kano/](https://www.instagram.com/not.kano/) — Sigue a **`@not.kano`** para novedades de desarrollo, tips de empleabilidad y retroalimentación directa.
- ❤️ **Conviértete en Sponsor:** [https://github.com/sponsors/alejandroham](https://github.com/sponsors/alejandroham) — Tu patrocinio financia servidores de prueba, conectores de empleo actualizados y nuevas capacidades de IA libres para todos.
- 🐙 **Repositorio GitHub Oficial:** [https://github.com/alejandroham/Oportia.jobs](https://github.com/alejandroham/Oportia.jobs)
- 📖 **Manual de Usuario:** [docs/MANUAL_DE_USUARIO.md](docs/MANUAL_DE_USUARIO.md)

---

## 📄 Licencia

Distribuido bajo la Licencia **MIT**. Consulta [LICENSE](LICENSE) para más detalles.
