# Portal de administración de Oportia

App **separada** de Oportia, sin enlaces desde la app principal y con `noindex`. Sirve para ver:
- **Uso:** usuarios activos por día (huella anónima diaria), búsquedas y funciones usadas.
- **Opiniones:** las opiniones de "¿Qué te parece Oportia?", con su contacto si la persona lo autorizó.
- **Seguridad:**
  - exceso de peticiones;
  - SSRF bloqueado;
  - intentos de manipular la IA;
  - portales restringidos;
  - bots;
  - errores del servidor.
- **Ofertas:**
  - ofertas vigentes por fuente y área;
  - historial diario;
  - ofertas sacadas del índice en los últimos 30 días, vencidas o ya no publicadas.
- **Estado:** versión en producción, índice diario, IA gratuita y ejecuciones de GitHub Actions.

## Seguridad (doble verificación)

1. **Contraseña:** inicio de sesión con Supabase Auth.
2. **Verificación en dos pasos (TOTP):** código de una app de autenticación. Se configura la primera vez.
3. **Base de datos:** las tablas `app_events` y `feedback` solo entregan filas a una sesión con verificación en dos pasos (nivel `aal2`) cuyo usuario esté en `admin_users`. La seguridad a nivel de fila lo exige, y la regla vive en `private.is_admin()`.
4. **Sesión:** se guarda solo en la pestaña. Se cierra al cerrar el navegador y tras 30 minutos sin actividad.

La clave del portal es la **publicable**, igual que en la app. Sin las dos verificaciones, la base de datos no entrega nada.

## Configurarlo (una sola vez)

1. **Crea tu usuario de administración.** En Supabase, ve a *Authentication → Users → Add user → Create new user* con tu correo y una contraseña larga, y marca *Auto Confirm User*.
2. **Cierra el registro público.** En *Authentication → Sign In / Providers*, desactiva **Allow new users to sign up**. Así nadie más puede crear cuentas.
3. **Marca tu usuario como administrador.** En *SQL Editor*:
   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'TU_CORREO';
   ```
4. **Crea el proyecto en Vercel.** *Add New → Project*, el mismo repositorio, **Root Directory: `admin`** y *Framework* Vite. Agrega estas variables de entorno:
   - `VITE_SUPABASE_URL`: la URL del proyecto de Supabase.
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: la clave publicable.
   - `VITE_APP_URL`: `https://oportia-jobs.vercel.app`.
5. **Entra al portal:** abre su URL, ingresa con tu correo y contraseña, escanea el código QR con tu app de autenticación y escribe el código.

Para la app principal (en Vercel), agrega además `METRICS_SALT` con un texto aleatorio largo. Es la clave de las huellas diarias anónimas.

## Desarrollo local

```bash
cd admin
cp .env.example .env.local   # completa los valores
npm install
npm run dev                  # http://localhost:3100
```
