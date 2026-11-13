# Política de Privacidad y Soberanía Digital — Oportia Jobs IA

**Última actualización:** 13 de noviembre de 2026  
**Versión de política:** 1.1.0  
**Marco normativo:** Ley N° 21.719 de Protección de Datos Personales (Chile) y principios de *Privacy by Design*.

---

## 1. Principio Rector: Soberanía Digital del Candidato

En **Oportia Jobs IA**, creemos que la búsqueda de empleo es una de las actividades personales más sensibles y privadas. Por ello, la plataforma ha sido concebida bajo el principio de **Soberanía Digital**:

> **Tus datos laborales, tu currículum, tus postulaciones y tus decisiones te pertenecen exclusivamente a ti.**

A diferencia de los portales de empleo tradicionales que centralizan tus datos en bases de datos remotas para monetizarlos o compartirlos con terceros, Oportia Jobs IA opera bajo una arquitectura **100% Local-First y sin estado en servidor (Stateless Backend)**.

---

## 2. Arquitectura Local-First (Opción A)

### 2.1 Almacenamiento Exclusivo en tu Navegador
Toda tu información personal se almacena **únicamente en tu propio dispositivo**, dentro del motor de base de datos local de tu navegador web (`IndexedDB`, base de datos `oportia_jobs_db`):

- **Perfil profesional:** Nombre, correo, teléfono, región, comuna, extracto laboral, experiencias, educación, idiomas y habilidades técnicas.
- **Preferencias laborales:** Cargos objetivo, modalidades preferidas (Remoto, Híbrido, Presencial), rango salarial y regiones prioritarias.
- **Radar de ofertas y postulaciones:** Empleos descubiertos, estados en el embudo (Seguimiento, Preparación, Postulada, Entrevista, Oferta), notas privadas y bitácora.
- **Documentos generados:** Currículums adaptados y cartas de presentación personalizadas.
- **Memoria de aprendizaje y copiloto Opi:** Calibraciones del comité, historias de logros STAR y preferencias aprendidas.

### 2.2 Ausencia de Cuentas Centralizadas
Oportia Jobs IA no requiere creación de usuario con contraseña en servidores remotos ni inicio de sesión en la nube. Tu sesión es tu navegador local.

---

## 3. Backend sin Estado (Stateless Backend)

El servidor backend de Oportia Jobs IA funciona estrictamente como un **motor de procesamiento computacional efímero**:

1. **Cero persistencia en disco:** El backend no cuenta con base de datos SQL ni NoSQL para registrar candidatos. Las funciones de guardado en disco del servidor están desactivadas (`db.save_jobs` no es invocado durante la búsqueda de ofertas).
2. **Cero almacenamiento de CVs o documentos:** Cuando subes un archivo PDF o Word para extraer su texto, el archivo se procesa en memoria volátil (`RAM`) y se elimina inmediatamente al responder la solicitud.
3. **Cero registro de datos sensibles (No Logging de PII):** Los registros del servidor (*logs*) registran únicamente códigos de estado HTTP y métricas técnicas generales de rendimiento, jamás tu nombre, correo, texto de currículum o contenido de tus consultas a la IA.
4. **Caché en memoria volátil de ofertas:** Para acelerar la navegación de empleo y evitar peticiones redundantes a los portales, las ofertas de empleo públicas se almacenan en un caché volátil (`RAM`) con tiempo de expiración de 15 minutos, sin asociar ninguna búsqueda a la identidad de un usuario.

---

## 4. Custodia y Cifrado de Claves de IA (BYOK — Bring Your Own Key)

Oportia Jobs IA utiliza un modelo **BYOK (Trae tu propia clave)** para conectarte con proveedores líderes de modelos de lenguaje (Google Gemini, Anthropic Claude, OpenAI):

1. **Cifrado local con WebCrypto API:** Tu clave de API se cifra en tu propio navegador antes de almacenarse en el almacenamiento local (`localStorage`), utilizando el estándar criptográfico de grado militar **AES-GCM de 256 bits** con derivación de clave **PBKDF2** (100.000 iteraciones de hash seguro con salt único).
2. **Transmisión efímera en memoria:** Tu clave solo viaja desde tu navegador hacia el backend cuando ejecutas activamente una función de IA (evaluación de compatibilidad, redacción de carta, práctica de entrevista, tutoría o chat con Opi). Se transmite protegida por HTTPS en los encabezados `X-LLM-Key` y `X-LLM-Provider`.
3. **Destrucción inmediata en memoria:** El servidor backend recibe la clave en la memoria de la petición, llama a la API oficial del proveedor de IA correspondiente, devuelve el resultado a tu navegador y **destruye la credencial de la memoria**. La clave nunca se escribe en disco ni se almacena en base de datos alguna.

---

## 5. Portabilidad y Copias de Seguridad Cifradas

Tú tienes el control absoluto para respaldar y mover tu información entre dispositivos:

- **Exportación en formato `.oportia`:** Puedes descargar una copia de seguridad completa de todos tus datos en cualquier momento desde el panel de Ajustes.
- **Cifrado opcional con contraseña:** Puedes proteger el archivo de respaldo con una contraseña maestra. El archivo se empaqueta cifrado mediante AES-GCM, haciéndolo ilegible para cualquier persona sin la contraseña.
- **Compatibilidad con versiones anteriores:** El importador reconoce y procesa automáticamente respaldos históricos en formato `.nexusjob`.
- **Importación transparente:** Al restaurar una copia de seguridad en un nuevo dispositivo o navegador, tus datos vuelven a poblar tu `IndexedDB` local sin intervención de servidores externos.

---

## 6. Cumplimiento con la Ley N° 21.719 de Chile y Derechos ARCO

En conformidad con las disposiciones de la **Ley N° 21.719 sobre Protección de los Datos Personales de Chile** y estándares internacionales comparables, Oportia Jobs IA garantiza el ejercicio expedito y autónomo de tus derechos:

| Derecho | Mecanismo en Oportia Jobs IA |
| :--- | :--- |
| **Acceso** | Todos tus datos están visibles y navegables directamente en las secciones *Mi Perfil*, *Mis Postulaciones* y *Ajustes*. |
| **Rectificación** | Puedes modificar cualquier campo de tu perfil, cambiar tus preferencias o corregir experiencias en tiempo real desde el editor de CV. |
| **Cancelación (Supresión / Olvido)** | Mediante el botón de **"Purga Total de Datos"** en *Ajustes*, puedes eliminar de forma instantánea e irreversible el 100% de tus datos locales (`IndexedDB` y `localStorage`). No requiere solicitud por correo ni espera de plazos de respuesta: la eliminación es inmediata. |
| **Oposición** | La plataforma no realiza perfilamientos comerciales ni envía publicidad no deseada. Eres tú quien decide cuándo realizar búsquedas y qué información enviar a la IA. |
| **Portabilidad** | Exporta todos tus datos en formato estructurado JSON / `.oportia` con un solo clic. |

---

## 7. Transparencia y Uso Responsable de la Inteligencia Artificial

- **La IA como copiloto, no como decisora:** La Inteligencia Artificial en Oportia Jobs IA está diseñada para organizar ofertas, calcular estimaciones de compatibilidad con base en evidencias textuales, sugerir mejoras a tu redacción y simular preguntas de entrevista. **La IA nunca toma decisiones autónomas de contratación ni postula a tu nombre sin tu consentimiento explícito.**
- **Transparencia en el puntaje de compatibilidad:** El porcentaje de compatibilidad es una estimación orientativa calculada por el Comité Oportia (5 perspectivas) o por un algoritmo heurístico básico cuando la IA está desconectada. Cada evaluación detalla los requisitos cumplidos, parciales y no cumplidos con citas textuales de tu currículum.
- **Revisión obligatoria del candidato:** Te recomendamos revisar y validar siempre los documentos generados (CV adaptado, carta de presentación y respuestas STAR) antes de enviarlos formalmente a un empleador.

---

## 8. Canales de Contacto y Dudas sobre Privacidad

Si tienes preguntas sobre la implementación de privacidad o la arquitectura de datos de Oportia Jobs IA, puedes contactar al mantenedor del proyecto:

- **Desarrollador y Mantenedor:** Alejandro Ham
- **Perfil de GitHub:** [https://github.com/alejandroham](https://github.com/alejandroham)
- **Instagram Oficial:** [https://www.instagram.com/not.kano/](https://www.instagram.com/not.kano/)
- **Repositorio de Código Abierto:** [https://github.com/alejandroham/Oportia.jobs](https://github.com/alejandroham/Oportia.jobs)
