# MANUAL MAESTRO DE OPTIMIZACIÓN UI/UX — NEXUS.JOB AI
## Estándar de Ingeniería de Diseño Cupertino (Apple HIG) & Arquitectura Responsiva

**Versión del documento:** 2.0.0 (Aprobado)  
**Entorno de ejecución:** Web Desktop (macOS, Windows, Linux) y Web Mobile PWA (iOS Safari / iPhone, iPad, Android)  
**Fecha de vigencia:** 8 de Noviembre de 2026  

---

## 1. Visión General y Filosofía de Diseño

El objetivo de este manual es elevar **Nexus.Job AI** a un estándar de categoría mundial, replicando con fidelidad la experiencia de diseño que caracteriza a los productos de Apple (*Cupertino Human Interface Guidelines - HIG*). Esto se traduce en una interfaz donde:
* **La claridad supera al adorno:** El contenido profesional (currículum vitae maestro, ofertas del radar y análisis dimensional de ajuste) es el protagonista indiscutible.
* **La tipografía cuenta una historia:** Orden, ritmo y jerarquía óptica estricta.
* **El color se utiliza con absoluta precisión semántica:** Comunica profesionalismo, serenidad, certidumbre, experiencia laboral y alta empleabilidad, evitando la fatiga visual bajo cualquier condición de luz.

---

## 2. Optimización de la Identidad Visual y Logotipo

Se establece formalmente la adopción del isologo **"Conector Talent"** y su respectivo favicon optimizado para pantallas Retina de alta densidad y tamaños reducidos ($16\times16$ / $32\times32$ / $180\times180$ píxeles).

* **Isotipo Principal ("Conector Talent"):** Superelipse con curvatura continua estilo iOS en Azul Institucional (`#0071E3`). En su interior dibuja una letra **"N"** geométrica de trazos redondeados y limpios, conectando dos nodos clave:
  1. **Nodo inicial (inferior izquierdo):** Blanco Puro (`#FFFFFF`), origen de la trayectoria del candidato.
  2. **Nodo final (superior derecho):** Naranja Acento cálido (`#FF9F0A`), que simboliza la chispa de dinamismo y el nexo exitoso con la oportunidad de empleo sin romper la armonía cromática.
* **Logotipo Tipográfico (Wordmark):**
  * `Nexus`: Tipografía geométrica en peso *Bold* (`#1D1D1F` en modo claro / `#FFFFFF` en modo oscuro).
  * `.Job`: Tipografía en Azul Institucional (`#0071E3`), integrando el punto con la palabra para un anclaje tecnológico moderno.

### Activos Vectoriales y Multirresolución Generados en `frontend/public/`

| Archivo | Formato / Dimensiones | Propósito |
| :--- | :--- | :--- |
| `nexusjob-logo.png` | PNG RGBA ($300\times69$) | Logotipo horizontal para fondos claros. |
| `nexusjob-logo-dark.png` | PNG RGBA ($300\times69$) | Logotipo horizontal adaptado con tipografía blanca para modo oscuro OLED. |
| `nexusjob-icon.png` | PNG RGBA ($150\times150$) | Isotipo squircle de alta resolución. |
| `apple-touch-icon.png` | PNG RGBA ($180\times180$) | Icono para pantalla de inicio de iOS (iPhone / iPad). |
| `favicon.svg` / `conector-talent.svg` | SVG Vectorial ($150\times150$ viewBox) | Icono escalable sin pérdida para navegadores modernos. |
| `favicon.ico` / `favicon-32x32.png` | ICO / PNG ($32\times32$) | Favicon de pestaña estándar de navegador. |
| `icon-192.png` / `icon-512.png` | PNG RGBA ($192\times192$ / $512\times512$) | Iconos PWA y pantallas de presentación (*splash*). |
| `manifest.json` | Web App Manifest | Declaración PWA para ejecución independiente a pantalla completa en iOS. |

---

## 3. Correcciones Críticas de Color y Contraste

Para corregir desvíos cromáticos anteriores y asegurar una lectura impecable tanto en monitores de escritorio como bajo luz solar directa en iPhone, se imponen los siguientes tokens obligatorios en `frontend/tailwind.config.js`:

### 3.1. Superficies y Modos (Light / Dark)

* **Modo Claro (Light Mode):**
  * **Lienzo principal (`body`):** `#FBFBFD` (*Gris sutil de Cupertino*) en lugar de blanco absoluto, eliminando el deslumbramiento visual y aportando calma y profundidad.
  * **Tarjetas y paneles:** Fondo blanco limpio (`#FFFFFF`) con sombras difusas multicapa:
    ```css
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
    ```
* **Modo Oscuro (Dark Mode):**
  * **Lienzo principal:** Negros absolutos OLED (`#000000`) para minimizar el consumo de batería en pantallas de iPhone y eliminar el sangrado de luz.
  * **Paneles translúcidos:** Gris carbón (`#1C1C1E`) con sombra profunda:
    ```css
    box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.5);
    ```

### 3.2. Jerarquía Tipográfica y Contraste de Texto

Cumplimiento estricto de las directrices de accesibilidad internacional **WCAG AA** (ratio de contraste superior a 4.5:1):

* **Texto Primario:**
  * Modo Claro: `#1D1D1F` (*Carbon Slate*).
  * Modo Oscuro: `#F5F5F7` (*Platinum White*).
  * Aplicación: Títulos de vacantes, encabezados principales H1-H3, nombres de empresas y botones de acción principal.
* **Texto Secundario (Metadatos):**
  * Modo Claro: `#86868B` (*Cupertino Slate Gray*).
  * Modo Oscuro: `#A1A1A6` (*Muted Silver*).
  * Aplicación: Fechas de publicación, comunas, salarios, modalidades contractuales y resúmenes breves.

### 3.3. Colores de Acento y Semáforo Semántico

* **Azul Institucional:** `#0071E3` (Light) / `#0A84FF` (Dark).
* **Naranja Acento Conector:** `#FF9F0A` (Equilibrio térmico entre profesionalismo y dinamismo).
* **Verde Éxito / Alta Compatibilidad (Fit ≥ 85%):** `#34C759`.
* **Rojo Eliminatorio / Deal-Breakers / Purga:** `#FF3B30`.

---

## 4. Guía de Interfaz Cupertino (Glassmorphism & Hairline Borders)

### 4.1. Efecto Vidrio Esmerilado (*Glassmorphism*)
Las barras de navegación superior e inferior, modales y cajones laterales implementan desenfoque óptico en tiempo real:

```css
.apple-glass {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background-color: rgba(255, 255, 255, 0.72); /* Light Mode */
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.dark .apple-glass {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background-color: rgba(28, 28, 30, 0.75); /* Dark Mode */
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### 4.2. Líneas Capilares (*Hairline Borders*)
Delimitación precisa de tarjetas y paneles mediante bordes de `1px` ultrafinos, erradicando los marcos gruesos:
* **Modo Claro:** `rgba(0, 0, 0, 0.06)` (6% de opacidad).
* **Modo Oscuro:** `rgba(255, 255, 255, 0.08)` (8% de opacidad).

---

## 5. Ergonomía Táctil y Adaptabilidad Móvil (iPhone & Desktop)

### 5.1. Áreas Táctiles Mínimas (*Touch Targets ≥ 44px*)
Siguiendo las directrices de Apple HIG, ningún control interactivo principal o secundario tiene una dimensión táctil inferior a **44×44 píxeles**:
* Botones principales ("Postular", "Guardar", "Escanear Radar", "Evaluar Fit"): `min-h-[44px] px-4 py-2.5 rounded-2xl`.
* Botón de menú contextual ("•••"): `min-h-[44px] min-w-[44px] rounded-2xl`.
* Pestañas de la barra inferior móvil en iPhone: `min-h-[48px] py-1 px-1 rounded-xl`.

### 5.2. Botón Flotante Global de IA (Nexus Asistente)
* **En Desktop:** `fixed bottom-6 right-6 z-40`.
* **En iPhone / Mobile:** `fixed bottom-20 right-4 z-40`. Se sitúa de forma ergonómica exactamente por encima de la barra de pestañas inferior (`bottom-0`) y de la zona de gestos del sistema (*Home Indicator*), permitiendo activación instantánea con el pulgar sin interferir con la navegación.

### 5.3. Renderizado Óptico Tipográfico
Activado permanentemente en `frontend/src/index.css`:

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 6. Estado de Auditoría y Verificación del Código

| Componente / Archivo | Estado | Cumplimiento del Manual Maestro |
| :--- | :--- | :--- |
| `frontend/tailwind.config.js` | ✅ Verificado | Tokens oficiales de canvas, superficies, texto WCAG AA, bordes capilares y sombras difusas. |
| `frontend/src/index.css` | ✅ Verificado | Vidrio esmerilado (`blur(20px)`), `hairline-border`, `touch-target` y tipografía San Francisco. |
| `frontend/public/` | ✅ Verificado | Isologo "Conector Talent" en SVG, favicon multirresolución, Apple Touch Icon y PWA Manifest. |
| `frontend/src/components/Navbar.tsx` | ✅ Verificado | Logotipo dual light/dark, tabs móviles de 48px con soporte para gestos táctiles. |
| `frontend/src/components/JobRadar.tsx` | ✅ Verificado | Touch targets mínimos de 44px en botones de postulación, filtros y escáner; contraste estricto. |
| `frontend/src/components/MemoryChat.tsx` | ✅ Verificado | Área de entrada y botón de envío de 44px, píldoras táctiles y contenedor translúcido. |
| `frontend/src/App.tsx` | ✅ Verificado | Botón flotante adaptativo (`bottom-20` en móvil / `bottom-6` en desktop) y splash icon. |
