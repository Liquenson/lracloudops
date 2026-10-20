# Auditoría técnica integral — LRA CloudOps

- **Fecha:** 2026-10-20
- **Repositorio:** [Liquenson/lracloudops](https://github.com/Liquenson/lracloudops)
- **Rama revisada:** `main`
- **Commit revisado:** `cda3cc537c45f794d80e611088cead2b829e6b23`
- **Tipo:** revisión estática del repositorio y configuración versionada.
- **Estado:** informe técnico; no equivale a una auditoría de penetración ni a una certificación de seguridad.

## 1. Resumen ejecutivo

LRA CloudOps es un sitio Astro estático bilingüe (inglés y español) que se publica en Cloudflare Pages. Integra GitHub Actions, un Worker de webhook para solicitar análisis, un asesor conversacional servido desde un Worker externo y servicios de terceros para formularios, analítica y correo.

La estructura está razonablemente documentada y dispone de tests de Playwright, análisis de accesibilidad con axe, Lighthouse CI, Dependabot y workflows programados. Sin embargo, la revisión estática ha identificado riesgos importantes en los flujos de automatización y en la superficie pública de los endpoints, además de controles de CI que no bloquean errores.

### Prioridades recomendadas

1. **P0 — corregir interpolación de entradas no confiables en scripts de GitHub Actions**, especialmente `.github/workflows/smart-scan.yml` y `.github/workflows/lead-nurturing.yml`.
2. **P0 — limitar el abuso del webhook público**: rate limiting, Turnstile o protección equivalente, límites de tamaño, lista de repositorios permitidos y límites de gasto.
3. **P0 — proteger `main`** con pull requests y checks obligatorios. En la metadata consultada, `main` aparece sin protección.
4. **P1 — escapar correctamente el HTML del correo** enviado por `workers/webhook/index.ts` y evitar devolver errores internos al cliente.
5. **P1 — endurecer el asesor AI** si `src/lib/worker-config.ts` representa el código desplegado: validar peticiones, restringir CORS, limitar tamaño/uso y controlar errores. La correspondencia exacta con el Worker publicado no se pudo verificar.
6. **P1 — hacer que los checks de calidad sean bloqueantes**; el lint actual se ignora en CI y las verificaciones SEO/Lighthouse son mayoritariamente informativas.
7. **P2 — optimizar recursos gráficos**: hay SVG y PNG versionados de más de 1 MB.
8. **P2 — mejorar cobertura de pruebas, observabilidad y precisión de los monitores**.

No se ha confirmado la existencia de una vulnerabilidad explotada en producción. Los hallazgos de seguridad se derivan del código versionado y deben validarse en un entorno controlado antes de cerrar cada incidencia.

## 2. Alcance y metodología

### Revisado

- Metadata de GitHub, rama principal y estado de protección.
- Árbol del repositorio: 205 entradas en el commit indicado.
- `package.json`, configuración Astro, variables de ejemplo y configuración de Wrangler.
- Cabeceras HTTP, redirecciones y `security.txt`.
- Los nueve workflows de GitHub Actions y la configuración de Dependabot.
- Worker de webhook, configuración candidata del asesor AI y lógica cliente de los formularios.
- Cliente de GitHub en tiempo de build.
- Layout principal, páginas de login/dashboard y pago satisfactorio.
- Pruebas Playwright, configuración de Lighthouse y ESLint.
- Estructura de rutas, scripts del navegador y tamaños de recursos.

### No ejecutado / fuera de alcance

- No se ejecutaron `npm ci`, `npm run build`, `npm test`, ESLint, `npm audit`, Trivy, Checkov ni Lighthouse desde un checkout local.
- No se ejecutó DAST ni una prueba de penetración contra producción.
- No se inspeccionaron secretos de GitHub/Cloudflare ni valores de configuración privados; la integración no permite leer esos secretos.
- No se verificaron permisos efectivos de tokens, configuración de Cloudflare, reglas WAF, límites de gasto, DNS, Stripe, Web3Forms ni configuración del proveedor de correo.
- No se descargó ni verificó el código desplegado de los Workers. La implementación de `src/lib/worker-config.ts` se trata como código candidato, no como prueba definitiva de lo que ejecuta el Worker público.
- No se revisaron línea por línea los 39 archivos de páginas Astro y todos los componentes; se realizó una revisión amplia con foco en flujos críticos y configuración. Por tanto, “integral” describe las áreas cubiertas, no una garantía de ausencia de defectos.

La metodología se inspira en la revisión de código y en el enfoque de pruebas de seguridad web de OWASP WSTG: https://owasp.org/www-project-web-security-testing-guide/

## 3. Hallazgos

### AUD-01 — Interpolación de entradas en scripts de GitHub Actions
- **Severidad:** ALTA (P0)
- **Confianza:** Alta
- **Archivos:** `.github/workflows/smart-scan.yml`, `.github/workflows/lead-nurturing.yml`
- **Evidencia:** los valores `github.event.inputs.repo_url`, `org`, `client_email`, `client_name`, `days_since_scan`, `repo_scanned` se insertan directamente dentro de bloques `run: |` y cadenas de shell.
- **Impacto:** una entrada especialmente construida puede romper el contexto de shell y ejecutar comandos en el runner. Dependiendo del workflow y los permisos/secrets disponibles, esto puede permitir el uso indebido de tokens o secretos y acciones en el repositorio.
- **Recomendación:** no interpolar entradas en el código shell. Pasarlas mediante variables de entorno (`env:`) y leerlas como datos; validar formato y longitud con pasos independientes; construir JSON con una herramienta segura como Python/jq en lugar de concatenación. Definir `permissions:` mínimos por workflow/job y no exponer secretos a pasos que no los necesiten.
- **Validación de cierre:** prueba controlada con entradas que contienen comillas y metacaracteres; comprobar que se tratan como texto y no ejecutan comandos. Revisar los logs y permisos de cada job.

### AUD-02 — Webhook público puede disparar análisis de repositorios sin autenticación
- **Severidad:** ALTA (P0)
- **Confianza:** Alta
- **Archivo:** `workers/webhook/index.ts`
- **Evidencia:** el comentario declara el endpoint público y no autenticado. El Worker valida el formato de email y repositorio, pero `REPO_RE` solo comprueba la forma `owner/repo`; no restringe a una lista de repositorios autorizados. No se observa rate limiting, Turnstile, cuota por IP/email, límite explícito del cuerpo ni control anti-replay.
- **Impacto:** abuso del dispatch de GitHub Actions, consumo de cuota de Actions/Anthropic/correo, análisis de repositorios no previstos y envío de informes a direcciones arbitrarias. CORS solo controla el acceso desde navegadores compatibles; no evita llamadas directas desde scripts o servidores.
- **Recomendación:** implementar rate limiting en Cloudflare, Turnstile o protección equivalente, límite de tamaño del cuerpo, validación estricta del nombre de repositorio y allowlist si el producto lo permite. Añadir cuotas y límites de gasto; deduplicar peticiones; registrar métricas sin almacenar datos personales innecesarios. Si el producto necesita analizar repositorios públicos arbitrarios, mantenerlo como capacidad explícita pero limitar frecuencia y coste.
- **Validación de cierre:** pruebas de exceso de peticiones, payloads grandes, repositorios inválidos/no autorizados y solicitudes repetidas; confirmar que los límites se aplican también a llamadas no procedentes del navegador.

### AUD-03 — Posible inyección de HTML en alertas de correo internas
- **Severidad:** MEDIA (P1)
- **Confianza:** Alta
- **Archivo:** `workers/webhook/index.ts`, función `notifyInternal`
- **Evidencia:** `name`, `email` y `repo` proceden de la petición pública y se interpolan directamente en el campo `html` del correo de Resend.
- **Impacto:** contenido HTML controlado por un solicitante puede alterar el aspecto o los enlaces de la alerta interna y facilitar phishing o confusión del destinatario.
- **Recomendación:** escapar todos los valores para contexto HTML, validar límites y formato; construir el cuerpo con una plantilla que aplique escaping por defecto. No confiar en la validación de formato del repositorio como mecanismo anti-XSS.
- **Validación de cierre:** enviar cadenas con `<`, `>`, comillas y etiquetas; verificar que se muestran como texto y no se interpretan como HTML.

### AUD-04 — Errores internos devueltos al solicitante del webhook
- **Severidad:** MEDIA (P1)
- **Confianza:** Alta
- **Archivo:** `workers/webhook/index.ts`
- **Evidencia:** en el bloque `catch` se devuelve `String(err)` en el JSON de respuesta.
- **Impacto:** puede revelar detalles de fallos del proveedor, endpoints, configuración o ejecución interna. No se ha demostrado que revele un secreto, pero no es necesario mostrar el error bruto al usuario.
- **Recomendación:** devolver un código genérico y un identificador de correlación; registrar detalles solo en logs protegidos y con redacción de datos sensibles.
- **Validación de cierre:** provocar un fallo controlado y comprobar que la respuesta pública no contiene detalles internos.

### AUD-05 — Asesor AI: superficie de abuso y validación insuficiente en código candidato
- **Severidad:** ALTA si está desplegado tal cual (P1)
- **Confianza:** Media; despliegue no verificado
- **Archivo:** `src/lib/worker-config.ts`; cliente: `src/components/ChatWidget.astro`
- **Evidencia:** el código candidato acepta `request.json()` sin validar esquema ni tamaño, permite CORS con `Access-Control-Allow-Origin: *`, no muestra rate limiting ni límites de tokens y llama a Anthropic. La lectura de la respuesta asume que `data.content[0].text` existe y no comprueba `response.ok`.
- **Impacto:** uso automatizado del endpoint y posible consumo no controlado de la API; errores no controlados cuando el proveedor devuelve un error o formato inesperado.
- **Recomendación:** confirmar primero si este archivo corresponde al Worker desplegado. Si sí: restringir orígenes cuando sea viable, validar `messages` por rol/tipo/longitud, limitar cuerpo, número de mensajes, frecuencia y tokens, aplicar protección antiabuso y cuotas. Manejar códigos de error del proveedor sin exponer detalles y añadir observabilidad.
- **Validación de cierre:** pruebas de payload vacío/malformado, historial excesivo, errores del proveedor, concurrencia y límite de gasto.

### AUD-06 — Rama `main` sin protección
- **Severidad:** ALTA (P0)
- **Confianza:** Alta
- **Evidencia:** la API de GitHub devuelve `protected: false` para `main`; protección y required status checks aparecen desactivados.
- **Impacto:** cambios pueden llegar a la rama principal sin revisión ni checks obligatorios, aumentando el riesgo de regresiones y de que un cambio malicioso o accidental alcance el despliegue.
- **Recomendación:** exigir pull request, al menos una revisión cuando haya colaboradores, checks de build/tipos/tests y prohibir force-push/eliminación. Configurar primero nombres de checks que realmente existan. Mantener un procedimiento de emergencia documentado.
- **Validación de cierre:** intentar hacer push directo y abrir un PR con un check fallido; confirmar que las reglas impiden la integración.

### AUD-07 — CI ignora los errores de lint
- **Severidad:** MEDIA (P1)
- **Confianza:** Alta
- **Archivo:** `.github/workflows/build.yml`
- **Evidencia:** el paso se llama “Lint (warn-only)” y ejecuta `npm run lint || true`; el script permite hasta 50 warnings.
- **Impacto:** errores de lint no bloquean CI y los avisos pueden acumularse, reduciendo la utilidad del análisis estático.
- **Recomendación:** retirar `|| true`; acordar un presupuesto inicial de warnings y reducirlo progresivamente hasta cero. Separar reglas informativas de errores bloqueantes.
- **Validación de cierre:** introducir temporalmente un error de lint y confirmar que el job falla.

### AUD-08 — Dependabot auto-merge sin garantía de checks requeridos
- **Severidad:** ALTA (P1)
- **Confianza:** Alta para el riesgo; configuración real de branch rules no verificada más allá de `main` desprotegida
- **Archivo:** `.github/workflows/auto-merge-dependabot.yml`
- **Evidencia:** el workflow concede `contents: write` y `pull-requests: write` y activa auto-merge para actualizaciones minor/patch. La rama principal aparece sin protección.
- **Impacto:** una actualización de dependencia puede integrarse sin que los checks de CI sean una condición obligatoria. Las actualizaciones minor/patch también pueden introducir regresiones o cambios de comportamiento.
- **Recomendación:** activar protección de rama y checks requeridos; considerar auto-merge solo tras CI verde. Revisar acciones de terceros y limitar permisos a nivel de job. No ignorar automáticamente el riesgo por tratarse de versiones minor/patch.
- **Validación de cierre:** demostrar que una PR Dependabot con tests fallidos no se integra.

### AUD-09 — Acciones y herramientas de terceros no fijadas a SHA/versión inmutable
- **Severidad:** MEDIA (P1)
- **Confianza:** Alta
- **Archivos:** workflows de GitHub Actions
- **Evidencia:** acciones usadas mediante tags como `actions/checkout@v4`, `actions/setup-node@v4`; el workflow Smart Scan descarga un instalador de Trivy desde la rama `main` y lo ejecuta mediante `wget | sh`. Dependencias Python se instalan desde `requirements.txt` sin lock/hash visible en este workflow.
- **Impacto:** cambios upstream o compromiso de una acción/instalador pueden modificar el código ejecutado en CI.
- **Recomendación:** fijar acciones críticas a SHA completo y automatizar su actualización; usar releases/versiones verificadas para herramientas; descargar y verificar checksums/firma de binarios cuando sea posible; fijar dependencias Python y revisar permisos del runner.
- **Validación de cierre:** revisar todos los workflows y confirmar que cada dependencia de ejecución tiene origen/versionado controlado.

### AUD-10 — Escaneo de dependencias descrito pero no bloqueante en el workflow de build
- **Severidad:** MEDIA (P1)
- **Confianza:** Alta respecto al workflow revisado
- **Archivos:** `SECURITY.md`, `.github/workflows/build.yml`
- **Evidencia:** SECURITY.md afirma que las dependencias se auditan mediante `npm audit`; el workflow Build & Validate no ejecuta `npm audit` ni un escaneo SCA explícito.
- **Impacto:** la documentación puede dar una impresión de cobertura continua que no queda respaldada por el workflow principal revisado.
- **Recomendación:** añadir un job de auditoría de dependencias con política definida para severidades, o documentar claramente dónde y cuándo se ejecuta. Evitar fallos indiscriminados sin proceso de triage; definir SLA de remediación.
- **Validación de cierre:** revisar un run real y confirmar que la auditoría aparece como paso/job y genera resultado visible.

### AUD-11 — CSP con estilos inline y fuentes de imágenes muy amplias
- **Severidad:** MEDIA (P2)
- **Confianza:** Alta
- **Archivo:** `public/_headers`
- **Evidencia:** `style-src 'self' 'unsafe-inline'` permite estilos inline y `img-src 'self' data: https:` acepta imágenes desde cualquier origen HTTPS.
- **Impacto:** la política es menos restrictiva de lo ideal. `unsafe-inline` para estilos aumenta el margen de maniobra ante ciertos vectores de inyección; permitir imágenes de cualquier dominio puede facilitar exfiltración visual/seguimiento si otra vulnerabilidad permite inyectar contenido.
- **Recomendación:** inventariar usos reales y migrar gradualmente estilos inline a clases/hojas de estilo. Reducir `img-src` a orígenes necesarios. No cambiar la CSP sin probar todas las páginas, formularios, analítica, chat y Cloudflare Turnstile.
- **Validación de cierre:** CSP report-only primero, revisión de violaciones y pruebas de regresión antes de aplicar una política más estricta.

### AUD-12 — Monitores informativos pueden producir falsos verdes
- **Severidad:** MEDIA (P1/P2)
- **Confianza:** Alta
- **Archivos:** `.github/workflows/seo-monitor.yml`, `.github/workflows/stripe-monitor.yml`, `.github/workflows/lighthouse-weekly.yml`, `.github/workflows/sync-github.yml`
- **Evidencia:**
  - SEO monitor registra errores como warnings pero no termina con código distinto de cero cuando fallan URLs o comprobaciones hreflang.
  - Stripe monitor solo verifica códigos HTTP de páginas del sitio; no verifica la API de Stripe, el estado de Payment Links ni el ciclo real de pago.
  - Lighthouse convierte fallos/umbrales en un mensaje informativo mediante `|| echo` y sus assertions son `warn`.
  - Sync workflow usa `curl -s` para disparar el deploy sin `--fail`, por lo que un HTTP de error puede no hacer fallar el paso; el health-check solo comprueba que la homepage responde 200 después de esperar 60 segundos.
- **Impacto:** los workflows pueden aparecer verdes sin que el criterio operacional que su nombre sugiere esté satisfecho.
- **Recomendación:** definir qué debe bloquear y qué solo notifica. Usar `curl --fail-with-body` o comprobar explícitamente el código HTTP, configurar timeouts/reintentos, hacer que los checks críticos fallen y describir con precisión los checks de Stripe. Confirmar deploy mediante API/estado de deployment si se necesita comprobar que se publicó el commit esperado.
- **Validación de cierre:** simular códigos 404/500 y errores de proveedor; confirmar resultado rojo/alerta para checks críticos.

### AUD-13 — La página estática de éxito no valida el pago
- **Severidad:** MEDIA (P1, integridad de negocio)
- **Confianza:** Alta para el contenido del sitio; flujo de Stripe no verificado
- **Archivo:** `src/pages/payment-success.astro`
- **Evidencia:** la página muestra “Payment confirmed” y describe acciones posteriores, pero es una página estática que no verifica un identificador de sesión de Stripe ni consulta un backend/webhook.
- **Impacto:** cualquiera puede abrir la URL directamente y ver el mensaje de confirmación. Si sistemas operativos o personas usan esta página como prueba de pago, podrían aceptar pagos no realizados.
- **Recomendación:** tratar esta página solo como UX posterior al checkout, no como fuente de verdad. Confirmar pagos mediante Stripe webhook firmado y/o consulta server-side de la sesión; procesar la operación de forma idempotente y mostrar estado pendiente/confirmado según la verificación.
- **Validación de cierre:** abrir la URL sin pago y comprobar que no se marca una compra como confirmada; verificar webhooks válidos, inválidos y repetidos.

### AUD-14 — Recursos estáticos grandes y duplicados
- **Severidad:** MEDIA (P2, rendimiento)
- **Confianza:** Alta
- **Evidencia:** el árbol de GitHub contiene múltiples SVG de aproximadamente 1,35 MB (`favicon-new.svg`, `favicon-optimized.svg`, `favicon.svg`, `lracloudops-icon.svg`, `lracloudops-logo.svg`, entre otros) y PNG de retratos entre aproximadamente 1,9 y 2,25 MB.
- **Impacto:** más transferencia y decodificación, carga más lenta en móvil y duplicación de activos en el repositorio. Los SVG de favicon/logo de ese tamaño son inusualmente grandes.
- **Recomendación:** comprobar si los SVG contienen datos raster embebidos; exportar variantes SVG realmente vectoriales o PNG/WebP/AVIF adecuados; generar tamaños responsive con `srcset`; conservar originales solo si son necesarios y evitar copias idénticas.
- **Validación de cierre:** comparar tamaños, apariencia y métricas Lighthouse antes/después; revisar logos, favicons y tarjetas sociales en navegadores y dispositivos.

### AUD-15 — Cobertura de tests insuficiente para los flujos de negocio críticos
- **Severidad:** MEDIA (P1/P2)
- **Confianza:** Alta
- **Archivos:** `tests/basic.spec.ts`, `playwright.config.ts`, `lighthouserc.json`
- **Evidencia:** tests cubren páginas principales y solo comprueban violaciones de accesibilidad críticas en home, audit y services. No se observan tests de seguridad del webhook, validación de pago, formularios completos, errores de APIs, límites de uso o comportamiento de los workflows.
- **Impacto:** pueden pasar regresiones de formularios, i18n, integraciones y controles de seguridad aunque las páginas carguen.
- **Recomendación:** añadir pruebas para rutas ES/EN, enlaces alternativos/hreflang, formularios con estados de error, CSP, cabeceras, webhook (validación, rate limit, payloads grandes), manejo de errores del chat y estado de pago. Aumentar cobertura de accesibilidad a páginas representativas adicionales.
- **Validación de cierre:** ejecutar suite en CI con resultados publicados y checks obligatorios.

### AUD-16 — Contrato de API del asesor AI no robusto
- **Severidad:** MEDIA (P2)
- **Confianza:** Media
- **Archivo:** `src/lib/worker-config.ts`
- **Evidencia:** se presupone que la respuesta de Anthropic siempre contiene `content[0].text`; no se comprueba `response.ok` ni se controla explícitamente una respuesta vacía o de error.
- **Impacto:** errores upstream pueden provocar excepción o respuesta inválida; el cliente recibe un error genérico y no existe evidencia de telemetría estructurada en el código revisado.
- **Recomendación:** comprobar status y esquema de respuesta, mapear errores a códigos genéricos, registrar latencia/estado sin guardar conversaciones sensibles y añadir pruebas de respuestas vacías, límites y errores del proveedor.
- **Validación de cierre:** simular 429, 500, JSON malformado y respuesta sin `content`.

### AUD-17 — Riesgo de precondiciones de HSTS
- **Severidad:** MEDIA (P2, depende de infraestructura)
- **Confianza:** Media
- **Archivo:** `public/_headers`
- **Evidencia:** HSTS está configurado con `includeSubDomains; preload` y dos años de max-age.
- **Impacto:** si algún subdominio no soporta HTTPS de forma estable, navegadores pueden impedir acceder a él. La validez de preload depende también de la infraestructura/DNS.
- **Recomendación:** confirmar que todos los subdominios incluidos usan HTTPS y mantenerlo; verificar el estado de preload si realmente se ha solicitado. No retirar la política sin analizar el impacto.
- **Validación de cierre:** inventario de subdominios, prueba TLS y revisión de configuración de producción.

### AUD-18 — Metadatos sociales duplicados
- **Severidad:** BAJA (P2)
- **Confianza:** Alta
- **Archivo:** `src/layouts/Layout.astro`
- **Evidencia:** el layout declara dos veces `og:image`, `og:image:width` y `og:image:alt`, con tamaños declarados distintos para la misma URL `og-image.png`.
- **Impacto:** parsers de redes sociales pueden interpretar metadatos ambiguos y las dimensiones declaradas no describir el recurso real.
- **Recomendación:** dejar un bloque OG coherente por imagen, verificar las dimensiones reales y usar una segunda imagen solo si es un recurso diferente.
- **Validación de cierre:** revisar HTML generado y depuradores de enlaces sociales.

### AUD-19 — Credencial de formulario visible en HTML estático
- **Severidad:** INFORMATIVA / por validar con proveedor
- **Confianza:** Alta en que está versionada; impacto depende del tipo de clave
- **Archivos:** `src/pages/login.astro`, `src/pages/es/login.astro`, `src/pages/dashboard/index.astro`, `src/pages/es/dashboard/index.astro`
- **Evidencia:** formularios Web3Forms incluyen un valor `access_key` estático en el código de página.
- **Impacto:** cualquier valor incluido en HTML público es visible y no puede considerarse secreto. Si es una clave pública del formulario, esto puede ser esperado; si habilita acciones privilegiadas, sería un problema.
- **Recomendación:** verificar el tipo de clave y sus restricciones en Web3Forms. Configurar protección anti-spam, restricciones de dominio/cuotas si el proveedor las ofrece y rotar la clave si no está diseñada para exposición pública.
- **Validación de cierre:** confirmar en la consola del proveedor el alcance real de la clave; probar abuso de formulario con límites controlados.

## 4. Controles positivos observados

- Sitio Astro estático con configuración explícita de idiomas inglés/español.
- Existe política de seguridad en `SECURITY.md` y `public/.well-known/security.txt`.
- `public/_headers` incluye X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS, COOP, CORP y CSP.
- El webhook evita incrustar el token de GitHub en el navegador y documenta que el endpoint es público.
- Dependabot está configurado para npm y GitHub Actions.
- Hay pruebas Playwright básicas y axe-core; existen configuraciones de Lighthouse CI.
- La integración de datos GitHub en `src/lib/github.ts` se ejecuta en build time y usa una lista fija de repositorios para la función de datos de portfolio.
- `wrangler.jsonc` tiene observabilidad activada para el proyecto configurado en ese archivo; no se ha comprobado si coincide con todos los Workers desplegados.

## 5. CI/CD y DevSecOps

### Situación observada

- Build workflow: `npm ci`, lint no bloqueante, `astro check`, build y Playwright.
- Dependabot: actualizaciones semanales de npm y GitHub Actions.
- Smart Scan: workflow manual y semanal; usa un token para hacer checkout de `lra-ai-platform`, instala dependencias Python y descarga Trivy.
- Monitores: SEO, Stripe (alcance limitado a páginas), Lighthouse, sincronización/rebuild y notificación de deploy.

### Cambios recomendados

1. Añadir permisos explícitos mínimos a cada workflow. Los workflows que no escriben deben usar `contents: read`.
2. Fijar acciones de terceros a SHA completo y automatizar actualizaciones.
3. Separar jobs con secretos de los jobs que ejecutan código de origen no confiable.
4. Eliminar interpolación directa de inputs en shell.
5. Hacer que lint, tipos, build, tests y auditoría de dependencias sean checks requeridos.
6. Publicar reportes como artefactos con retención definida; no subir informes potencialmente sensibles a almacenamiento público sin una decisión consciente.
7. Añadir alertas operativas reales, no solo mensajes en el resumen de Actions.

## 6. Arquitectura y operación

### Sitio estático

Astro + Tailwind CSS/Vite, Cloudflare Pages, páginas EN en raíz y ES bajo `/es/`. El árbol contiene 39 páginas Astro y 11 scripts JS en `public/js/`.

### Integraciones

- GitHub API durante build.
- Web3Forms para formularios.
- Worker público de webhook que puede disparar Smart Scan.
- Worker externo de asesor AI llamado desde `ChatWidget.astro`.
- Google Analytics y Cloudflare Web Analytics opcionales/configurables.
- Resend para alertas y correos de automatización.
- Stripe aparece en documentación/monitores; la integración de pago y sus webhooks no se pudo verificar desde el repositorio revisado.

### Riesgos de operación que requieren verificación externa

- Permisos efectivos y expiración de `GITHUB_TOKEN`, `AGENT_GITHUB_TOKEN`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY` y `CLOUDFLARE_DEPLOY_HOOK_URL`.
- Protección WAF/rate limiting en Cloudflare.
- Alertas de gasto y cuotas de Anthropic/Resend/GitHub Actions.
- Orígenes permitidos y variables de entorno de los Workers realmente desplegados.
- Firma y procesamiento idempotente de webhooks de Stripe, si existen.
- Retención de logs y datos personales enviados por formularios/chat.

## 7. Plan de remediación propuesto

### P0 — antes de ampliar el uso público
- [ ] Corregir inyección de comandos potencial en Smart Scan y Lead Nurturing.
- [ ] Activar protección de `main` y checks requeridos.
- [ ] Añadir rate limiting/antiabuso y cuotas al webhook.
- [ ] Validar alcance de tokens y limitar permisos por job.

### P1 — siguiente iteración
- [ ] Escapar HTML de alertas de correo y sanitizar respuestas públicas.
- [ ] Revisar el Worker AI desplegado y aplicar límites de uso/cuerpo/tokens.
- [ ] Hacer lint, pruebas y auditoría de dependencias bloqueantes.
- [ ] Corregir falsos verdes de los monitores SEO, Lighthouse, deploy y Stripe.
- [ ] Validar el pago server-side mediante Stripe, si la página se utiliza en un flujo de pago real.
- [ ] Añadir tests de seguridad y de flujos de negocio.

### P2 — rendimiento y mantenibilidad
- [ ] Optimizar SVG/PNG grandes y eliminar duplicados.
- [ ] Ajustar CSP de forma gradual con report-only y pruebas.
- [ ] Corregir metadatos OG duplicados.
- [ ] Revisar subdominios antes de mantener HSTS preload.
- [ ] Ampliar cobertura de accesibilidad y pruebas de rutas bilingües.

## 8. Checklist de validación técnica posterior

Ejecutar desde un checkout limpio con Node compatible con `package.json`:

```bash
npm ci
npm run lint
npx astro check
npm run build
npx playwright install --with-deps chromium
npm test
npm audit
```

Los comandos anteriores son **propuestos, no ejecutados durante esta revisión**. Registrar resultados, versiones, commit exacto y artefactos en la siguiente actualización del informe.

Después, en un entorno autorizado:
- Probar cabeceras y redirecciones del sitio publicado.
- Probar límites de webhook sin enviar cargas dañinas ni afectar servicios de terceros.
- Validar la respuesta del asesor con casos límite y cuotas controladas.
- Confirmar el flujo de pago con eventos de prueba de Stripe.
- Verificar la configuración efectiva de Cloudflare y GitHub desde sus paneles.

## 9. Conclusión

El proyecto tiene una base funcional y herramientas de calidad útiles, pero los controles no están suficientemente conectados para garantizar que los fallos bloqueen la entrega. La mayor prioridad es proteger las automatizaciones con secretos y limitar el abuso de endpoints públicos. Después, hay que convertir las pruebas y monitores actuales en controles fiables, y completar la validación dinámica de los servicios desplegados.

**No se recomienda considerar el proyecto “auditado y seguro” hasta cerrar los P0, ejecutar el build/tests y validar la configuración efectiva de los Workers y servicios externos.**
