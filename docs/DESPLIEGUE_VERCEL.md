# 🚀 Guía de Publicación y Despliegue en Vercel

Esta guía detalla cómo publicar **Oportia Jobs IA** en [Vercel](https://vercel.com) de manera rápida, segura y optimizada.

---

## 📌 Resumen de Arquitectura en Vercel

El repositorio ya está preconfigurado de fábrica con los archivos necesarios para Vercel:
- `vercel.json`: Orquesta la compilación del frontend en Vite, preserva el servicio de archivos estáticos (`"handle": "filesystem"`) y enruta la API.
- `frontend/vercel.json`: Reglas específicas para el despliegue con Root Directory `frontend`.
- `api/index.py`: Punto de entrada Serverless ASGI para FastAPI.
- `requirements.txt`: Dependencias del backend instaladas automáticamente por el runtime de Vercel.

---

## 🏗️ Las 2 Modalidades de Despliegue

```
┌────────────────────────────────────────────────────────────────────────┐
│                   OPCIONES DE DESPLIEGUE DISPONIBLES                   │
├──────────────────────────────────┬─────────────────────────────────────┤
│ Opción 1: Full-Stack en Vercel   │ 100% en Vercel (Frontend + API).    │
│                                  │ Ideal para empezar gratis en 1 clic.│
├──────────────────────────────────┼─────────────────────────────────────┤
│ Opción 2: Híbrido Profesional    │ Frontend en Vercel + Backend en     │
│ (Recomendado para Producción)    │ Render / Railway.                   │
│                                  │ Cero límites de timeout de 10s.     │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## ⚡ Opción 1: Despliegue Full-Stack 100% en Vercel (Paso a Paso)

Esta opción publica tanto la interfaz visual (React) como el backend (FastAPI en funciones Serverless) dentro del mismo proyecto de Vercel.

### Pasos:
1. **Inicia sesión en Vercel:**
   - Ve a [https://vercel.com](https://vercel.com) e inicia sesión con tu cuenta de **GitHub**.
2. **Importar el Repositorio:**
   - Haz clic en **"Add New..."** ➔ **"Project"**.
   - Busca tu repositorio: `alejandroham/Oportia.jobs` y haz clic en **"Import"**.
3. **Configuración del Proyecto (Automática):**
   - **Framework Preset:** `Vite` (o `Other`).
   - **Root Directory:** `./` (dejar por defecto en la raíz) o `frontend` si prefieres desplegar solo la UI desacoplada.
   - **Build Command:** `cd frontend && npm install && npm run build` *(configurado en `vercel.json`)*.
   - **Output Directory:** `frontend/dist` *(configurado en `vercel.json`)*.
4. **Variables de Entorno (Environment Variables):**
   - Agrega tu clave de IA (opcional, también puedes ingresarla desde la app):
     - `GEMINI_API_KEY`: Tu clave de Google Gemini.
     - `DEFAULT_PROVIDER`: `gemini`
5. **Hacer clic en "Deploy":**
   - Vercel compilará el frontend y desplegará la función serverless de Python.
   - En aproximadamente 1-2 minutos obtendrás tu URL pública oficial (ej: `https://oportia-jobs.vercel.app`).

> [!NOTE]
> **Consideración técnica sobre Serverless:**  
> Las funciones serverless de Vercel tienen un límite de ejecución (timeout) de **10 a 15 segundos** en el plan gratuito (Hobby). Para operaciones instantáneas (Perfil, Coach, Documentos, Preguntas STAR, Evaluaciones rápidas) funciona perfecto. Si ejecutas scrapers múltiples simultáneos muy lentos, considera la **Opción 2**.

---

## 🌟 Opción 2: Despliegue Híbrido Profesional (Recomendado)

En entornos de alta concurrencia de IA o scrapers intensivos, la arquitectura profesional estándar es:
- **Frontend:** Desplegado en **Vercel** (máxima velocidad, CDN global Edge Network de Apple/Next-gen).
- **Backend:** Desplegado en **Render**, **Railway**, **Fly.io** o tu propio VPS (sin timeouts de 10s y con procesos en background continuos).

### Pasos:
1. **Despliega el Backend en Render o Railway:**
   - Conecta el repo y configura el comando de inicio:
     `uvicorn app.main:app --host 0.0.0.0 --port $PORT` con directorio raíz `backend`.
   - Obtendrás una URL como: `https://oportia-backend.onrender.com`.
2. **Despliega el Frontend en Vercel:**
   - En Vercel, agrega la variable de entorno:
     ```env
     VITE_API_URL=https://oportia-backend.onrender.com/api
     ```
   - El frontend automáticamente se comunicará con tu backend dedicado en la nube.

---

## 📱 Almacenamiento Soberano en Vercel

Oportia Jobs IA almacena los datos sensibles (tu CV, notas y claves) de forma **Soberana en el Cliente** mediante `IndexedDB` y `localStorage` en tu propio navegador.

Esto significa que al publicar en Vercel:
- **Tus datos personales no se comparten con otros usuarios:** Cada persona que entre a tu URL de Vercel tendrá su propia sesión soberana aislada en su dispositivo.
- **Cumplimiento estricto con la Ley N° 21.719:** Privacidad desde el diseño garantizada.

---

## 🌐 Configurar Dominio Personalizado en Vercel

Una vez desplegado tu proyecto en Vercel:
1. Ve a **Project Settings** ➔ **Domains**.
2. Ingresa tu dominio o subdominio (ej: `empleo.midominio.cl` u `oportia.jobs`).
3. Vercel te proporcionará los registros DNS (`CNAME` o `A`) para configurar en tu registrador (NIC Chile, Cloudflare, Namecheap, etc.).
4. El certificado SSL (HTTPS) se generará y renovará de forma 100% gratuita y automática.
