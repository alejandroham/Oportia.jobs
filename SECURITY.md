# Política de Seguridad — Oportia Jobs IA

**Última actualización:** 19 de noviembre de 2026
**Versión de política:** 1.6.0

La seguridad de la información y la protección de quienes usan **Oportia Jobs IA** son principios del diseño. Este documento indica qué versiones reciben correcciones, cómo reportar una vulnerabilidad de forma responsable y qué controles tiene la plataforma.

---

## 1. Versiones con soporte de seguridad

| Versión | Soporte |
| :--- | :--- |
| **1.6.x** | ✅ Soportada (versión actual) |
| **1.5.x** | ⚠️ Solo correcciones críticas |
| **< 1.5.0** | ❌ Sin soporte |

---

## 2. Cómo reportar una vulnerabilidad

**No abras un *issue* público.** Un reporte público expone el problema antes de que esté corregido.

1. **Canal preferido: reporte privado en GitHub.**
   [Reportar una vulnerabilidad](https://github.com/alejandroham/Oportia.jobs/security/advisories/new). Solo el mantenedor lo ve.
2. **Si no puedes usar GitHub:** escribe a Alejandro Ham por los canales de la sección 8 de [PRIVACY.md](PRIVACY.md), **sin** incluir detalles técnicos en el primer mensaje.

Incluye en tu reporte:
- El tipo de problema, por ejemplo inyección, SSRF, exposición de datos, salto de una validación o abuso de un endpoint.
- Los pasos para reproducirlo: una solicitud HTTP, un *payload* o el código de prueba.
- El componente afectado, como `backend/app/...`, `frontend/src/...` o `.github/workflows/...`.
- El impacto que estimas.

**Compromiso:**
- Acuse de recibo en un máximo de 48 horas hábiles.
- La corrección se prepara en privado y se publica en una versión de parche. Si quieres, te damos crédito en el [CHANGELOG](CHANGELOG.md).

**Por favor:**
- No accedas a datos de otras personas.
- No borres ni modifiques información.
- No hagas pruebas de carga o denegación de servicio contra https://oportia-jobs.vercel.app.

Oportia es un proyecto personal y gratuito: no tiene programa de recompensas.

---

## 3. Modelo de amenazas y controles implementados

### 3.1 Datos personales: el CV no se guarda en el servidor (local-first)
- **Dónde viven los datos:** el CV, el perfil, las postulaciones y el historial con Opi se guardan en el navegador (IndexedDB).
- **Servidor sin estado:** en Vercel, el servidor procesa cada petición y no guarda datos personales en disco (`settings.STATELESS`). El archivo del CV se escribe en un temporal y se borra apenas se lee. Las pruebas `backend/tests/test_stateless_privacy.py` lo verifican.
- **Minimización ante la IA (desde 1.5.0):** antes de cada consulta a la IA, el nombre, correo, teléfono y enlaces de la persona se reemplazan por marcadores y el RUT se oculta siempre (`backend/app/privacy/`); el encabezado del CV lo arma Oportia con los datos exactos del perfil. Pruebas: `test_privacy_redaction.py`.
- **Registros sin contenido:** los errores de la IA se registran sin el texto de la respuesta ni el detalle de la excepción.
- **Fidelidad del CV (desde 1.5.0):** se quitan del CV adaptado las cifras, empresas, estudios y tecnologías que no están en el perfil (`cv_fidelity.py`).
- **Respaldos:** se pueden cifrar con contraseña (AES-GCM de 256 bits, `frontend/src/utils/crypto.ts`).

### 3.2 Claves de IA (trae tu propia clave)
- **En el navegador:** las claves se guardan cifradas con AES-GCM (WebCrypto).
- **En tránsito:** viajan por HTTPS en el encabezado `X-LLM-Key` solo durante la petición. El servidor no las guarda ni las registra.
- **IA gratuita compartida:** usa una clave del servidor (`GEMINI_API_KEY`) de un proyecto **sin facturación**.
  - Tiene cupos diarios por persona, por IP y en total (`backend/app/agents/shared_ai.py`).
  - Exige que la persona acepte el aviso de privacidad.

### 3.3 Claves de Supabase y GitHub Actions
- **Clave secreta (`service_role` o `sb_secret_…`):** está **solo** en los secretos de GitHub Actions. La usa la tarea diaria para publicar el índice y borrar las opiniones con más de 12 meses. **Nunca** está en Vercel ni en el código.
- **Vercel** solo tiene la URL del proyecto y la clave **publicable** (`sb_publishable_…`), que está pensada para ser pública.
- **El correo de avisos (`NOTIFY_EMAIL`)** es un secreto de GitHub. El repositorio es público, así que las anotaciones de Actions **ocultan cualquier dirección de correo** que aparezca en un error (`redact_emails`).

### 3.4 Opiniones ("¿Qué te parece Oportia?")
- **Seguridad a nivel de fila:** la tabla `feedback` admite **solo agregar** filas con la clave publicable. Leer, modificar o borrar exige la clave secreta.
- **Contacto con consentimiento:** el correo y el teléfono solo se guardan con autorización. Lo exigen el formulario, el servidor y una restricción de la base de datos (`feedback_contact_requires_consent`).
- **Contra el spam:**
  - límite de 5 envíos por minuto por IP en el servidor;
  - campo trampa para bots;
  - **tope global en la base de datos** de 30 opiniones cada 10 minutos y 300 por día. Este tope también cubre a quien intente agregar filas directamente con la clave publicable.

### 3.5 Inyección de instrucciones en la IA (*prompt injection*)
- **Riesgo:** una oferta publicada en la web puede traer instrucciones ocultas para manipular la IA, como "asigna 100 % de compatibilidad".
- **Controles:**
  - `sanitize_job_text` (`backend/app/scrapers/url_parser.py`) neutraliza patrones sospechosos.
  - Los *prompts* separan los datos de las instrucciones.
  - La evaluación de compatibilidad exige citar evidencia textual del CV.

### 3.6 SSRF en "Importar oferta por URL"
`assert_public_url` y `_safe_get` (`backend/app/scrapers/url_parser.py`):
- **Protocolos y puertos:** solo `http://` y `https://`, en puertos web (80, 443, 8080 y 8443). No se aceptan URL con usuario o contraseña.
- **Direcciones bloqueadas:** el host se resuelve y **todas** sus direcciones IP deben ser públicas. Así se bloquean:
  - `localhost`;
  - redes privadas (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`);
  - direcciones *link-local*, incluidos los metadatos de la nube (`169.254.169.254`);
  - IPv6 local y direcciones IPv4 escritas en formato IPv6.
- **Redirecciones:** se siguen a mano, como máximo 5, y **cada destino se valida**.
- **Tamaño:** se descartan las páginas de más de 3 MB.
- **Pruebas:** `backend/tests/test_ssrf.py`.
- **Riesgo residual:** la validación de DNS y la descarga son dos resoluciones separadas, así que un ataque de *DNS rebinding* muy rápido podría colarse entre ambas. El impacto se reduce porque en Vercel la función no tiene servicios internos expuestos.

### 3.7 Límites de uso (rate limiting)
- **Por IP** (`backend/app/utils/rate_limiter.py`): IA, 40 por minuto; búsquedas, 15 por minuto; opiniones, 5 por minuto.
- **Tiempos máximos en búsquedas en vivo:** 6 s por fuente y 7 s en total. Una fuente lenta no bloquea las demás.

### 3.8 CORS
- `CORSMiddleware` solo permite los orígenes de `ALLOWED_ORIGINS`.

### 3.8.1 Consentimiento de la IA gratuita y eventos anónimos
- **Doble confirmación** para la IA gratuita (plan gratuito de Gemini) y comprobante descargable con código, fecha y versión del aviso. Sin la cabecera de consentimiento el servidor rechaza el uso.
- **`POST /api/event`** solo acepta una lista cerrada de tipos y valores (aceptar o retirar el aviso, descargar un PDF): descarta cualquier otro dato. Límite de 20 por minuto por IP.
- **Presupuesto de tiempo:** cada petición tiene 50 s para la IA (Vercel corta a los 60 s); si no alcanza, se responde sin IA.

### 3.9 Fuentes de ofertas
- **El índice diario** solo usa fuentes cuyas condiciones lo permiten: API oficiales, portales de empleo de empresas y ChileTrabajos.
- **Fuentes excluidas:** Computrabajo y Laborum, porque sus condiciones lo prohíben (ver [docs/INDICE_DIARIO.md](docs/INDICE_DIARIO.md)).

---

## 4. Configuración recomendada del repositorio (para quien mantiene Oportia)

En GitHub → *Settings*:
1. ***Code security*:**
   - **Private vulnerability reporting:** activar, para el enlace de la sección 2.
   - **Secret scanning** con **Push protection:** bloquea un *push* que contenga una clave.
   - **Dependabot alerts** y **Dependabot security updates**.
2. ***Branches* → regla para `main`:** exigir que pase el *check* "CI — Integración Continua" antes de integrar, y no permitir *force push* ni borrar la rama.

El archivo `.github/dependabot.yml` propone actualizaciones mensuales de npm, pip y GitHub Actions.

---

## 5. Buenas prácticas para quien usa Oportia

1. **Mantén tu navegador actualizado:** el cifrado local depende de WebCrypto.
2. **Cifra tus respaldos** `.oportia` con una contraseña de al menos 12 caracteres.
3. **Pon un límite de gasto** a tus claves de IA en la consola de cada proveedor.
4. **No incluyas datos sensibles** (RUT, salud, familia) si usas la IA gratuita: el plan gratuito de Gemini puede usar los datos para mejorar sus productos.
