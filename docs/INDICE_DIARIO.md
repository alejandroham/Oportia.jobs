# Índice diario de ofertas (Etapa B)

Todas las mañanas, a las **08:00 de Chile**, GitHub Actions junta ofertas de Chile de todas las áreas, las limpia y publica un **índice comprimido** en Supabase Storage. La búsqueda de Oportia responde **al instante** con ese índice y ofrece **"Buscar también en vivo"** para lo publicado después.

## Qué hace la tarea diaria

1. **Recolecta** de fuentes que permiten este uso:
   - **Empleos Públicos:** todas las convocatorias abiertas (API oficial).
   - **GetOnBoard:** API oficial, con unas 90 consultas por área.
   - **Portales de empleo de empresas:** API públicas de Greenhouse, Lever, Ashby y SmartRecruiters. Solo ofertas en Chile o remotas para Latinoamérica. La lista de empresas está en `backend/app/scrapers/company_boards.py`.
   - **ChileTrabajos:** lectura moderada, una ronda al día con pausas. Sus condiciones no prohíben robots.
   - **No se usan LinkedIn, Computrabajo ni Laborum.** Sus condiciones de uso prohíben el acceso automatizado o la reproducción de sus avisos (revisado el 17-11-2026).
2. **Limpia**:
   - Quita duplicados por URL y por cargo + empresa + ciudad.
   - Descarta las ofertas vencidas y las de más de 30 días sin fecha de cierre.
3. **Clasifica** cada oferta por área con un diccionario, sin IA.
4. **Recuerda qué día apareció cada oferta** (`discovered_at`), lo que permite avisar solo las nuevas (Etapa C).
5. **Publica** `jobs-index.json.gz` en el bucket público `oportia-index`.

El índice **solo contiene ofertas públicas**: nunca búsquedas ni datos de personas. El servidor lo guarda en memoria 30 minutos y no escribe nada en disco.

## Configuración (una sola vez)

1. **Crea un proyecto gratuito en [Supabase](https://supabase.com/dashboard)**. Elige la región más cercana: São Paulo.
2. **Crea el bucket.** Ve a *Storage → New bucket*, ponle el nombre `oportia-index` y marca **Public bucket**.
   - Otra forma: en *SQL Editor* ejecuta:
     ```sql
     insert into storage.buckets (id, name, public) values ('oportia-index', 'oportia-index', true);
     ```
3. **Copia los datos del proyecto** (*Project Settings → API*):
   - **Project URL**, por ejemplo `https://abcd1234.supabase.co`.
   - **service_role key**. Es **secreta**: solo va en GitHub, nunca en Vercel ni en el código.
4. **Agrega los secretos en GitHub** (*Settings → Secrets and variables → Actions → New repository secret*):
   - `SUPABASE_URL`: la Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: la service_role key.
5. **Agrega la variable en Vercel** (*Settings → Environment Variables*):
   - `SUPABASE_URL`: la misma Project URL. Es pública; la app solo **lee** el índice. Después vuelve a desplegar.
6. **Prueba la tarea:** en GitHub ve a *Actions → Índice diario de ofertas → Run workflow*. Tarda entre 5 y 15 minutos.
7. **Comprueba** en `https://oportia-jobs.vercel.app/api/jobs/index/status`. Debe mostrar `available: true`, el total y las áreas.

Sin `SUPABASE_URL`, Oportia sigue funcionando como antes: busca en vivo.

## Correo diario con las ofertas nuevas (Etapa C)

Después de publicar el índice, la tarea envía un correo con **solo las ofertas que aparecieron hoy**:
- Agrupadas por área, o por tus búsquedas si defines `NOTIFY_KEYWORDS`.
- Máximo 2 por empresa y 80 en total, cada una con su enlace a la fuente original.
- Si un día no hay ofertas nuevas, no se envía nada.

**Tu correo nunca queda en el código ni en los registros**: es un secreto de GitHub. Si Resend responde con un error que incluye una dirección, se oculta antes de mostrarlo.

Configuración:
1. **Crea una cuenta gratuita en [Resend](https://resend.com)** (3.000 correos al mes) con el **mismo correo en que quieres recibir los avisos**.
2. **Crea una API key** en *API Keys → Create API Key*, con permiso *Sending access*.
3. **Agrega estos secretos en GitHub** (*Settings → Secrets and variables → Actions*):
   - `RESEND_API_KEY`: la clave (empieza con `re_`).
   - `NOTIFY_EMAIL`: tu correo. Para varios, sepáralos con coma.
   - `NOTIFY_KEYWORDS` (opcional): tus búsquedas, separadas por coma. Por ejemplo: `encargado informática, soporte TI, mesa de ayuda`.
   - `NOTIFY_FROM` (opcional): solo si verificas un dominio propio en Resend, por ejemplo `Oportia <avisos@tudominio.cl>`.
4. **Prueba:** en *Actions → Índice diario de ofertas → Run workflow*. La anotación "Correo diario" dice cuántas ofertas se enviaron.

Sin un dominio propio, Resend envía desde `onboarding@resend.dev`, y **solo al correo con que creaste la cuenta de Resend**. Para un aviso personal es suficiente. Revisa la carpeta de spam el primer día.

Para ver cómo queda el correo sin enviarlo:

```bash
cd backend && ../venv/bin/python -m app.indexer.build --no-upload --max-queries 5 --preview-email /tmp/correo.html
```

## Agregar una empresa

1. Busca su portal de empleo. Debe ser una dirección como `boards.greenhouse.io/<id>`, `jobs.lever.co/<id>`, `jobs.ashbyhq.com/<id>` o `jobs.smartrecruiters.com/<id>`.
2. Verifica que su API responde:
   - Greenhouse: `https://boards-api.greenhouse.io/v1/boards/<id>/jobs`
   - Lever: `https://api.lever.co/v0/postings/<id>?mode=json`
   - Ashby: `https://api.ashbyhq.com/posting-api/job-board/<id>`
   - SmartRecruiters: `https://api.smartrecruiters.com/v1/companies/<id>/postings?country=cl`
3. Agrégala a `COMPANY_BOARDS` en `backend/app/scrapers/company_boards.py`.

## Probarlo en tu equipo

```bash
cd backend && ../venv/bin/python -m app.indexer.build --no-upload --out /tmp/indice.json.gz
```

`--max-queries 5` sirve para una prueba corta.

## Variables

| Variable | Dónde | Para qué |
|---|---|---|
| `SUPABASE_URL` | GitHub (secreto) y Vercel | Dirección del proyecto. Con ella se arma la URL pública del índice |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo GitHub (secreto) | Publicar el índice |
| `OPORTIA_INDEX_URL` | Opcional | URL completa del índice, si se aloja en otro lugar |
| `OPORTIA_INDEX_BUCKET` | Opcional | Otro nombre de bucket (por defecto `oportia-index`) |
| `RESEND_API_KEY` | Solo GitHub (secreto) | Enviar el correo diario |
| `NOTIFY_EMAIL` | Solo GitHub (secreto) | A quién se envía |
| `NOTIFY_KEYWORDS` | Solo GitHub (secreto, opcional) | Filtrar el correo por tus búsquedas |
| `NOTIFY_FROM` | Solo GitHub (secreto, opcional) | Remitente con dominio propio verificado |
