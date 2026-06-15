# Auditoría de idioma — Área española (lracloudops.com)

**Fecha:** 2026-06-14  
**Rama auditada:** main (9fe968f)  
**Páginas auditadas:** 26 rutas españolas  
**Build:** 169 páginas, 0 errores  

---

## Resumen ejecutivo

| Prioridad | Hallazgos |
|---|---|
| P0 — Crítico | 4 |
| P1 — Visible en páginas de servicio/proyecto | 7 |
| P2 — Menor / páginas estáticas | 5 |
| Estructurales (URL/navegación) | 3 |
| **Total** | **19** |

---

## P0 — Crítico / Alto tráfico

### P0-1 — Bug de prefijo `/es/` en enlaces internos (13 archivos, 29 ocurrencias)

**Descripción:** Con `prefixDefaultLocale: false`, los URLs del área española NO llevan prefijo `/es/`. Sin embargo, 13 archivos fuente tienen `href="/es/..."` que generan **404** para todos los visitantes españoles que pulsen un CTA o enlace de navegación.

| Archivo | Líneas afectadas | URLs rotas |
|---|---|---|
| `servicios.astro` | 338, 418, 490, 512, 542, 561 | `/es/contacto` (×5), `/es/proyectos` (×1) |
| `pricing.astro` | 146, 243, 328, 369, 455 | `/es/contacto` (×5) |
| `projects/[slug].astro` | 108, 125, 402, 550, 569 | `/es` (×1), `/es/proyectos` (×2), `/es/contacto` (×2) |
| `certifications.astro` | 681, 688 | `/es/nosotros`, `/es/contacto` |
| `why-lra.astro` | 300 | `/es/contacto` (×2) |
| `terms.astro` | (2 occ.) | `/es/...` |
| `metodologia.astro` | 236, 246 | `/es/proyectos`, `/es/contacto` |
| `nosotros.astro` | 773 | `/es/contacto` |
| `privacy.astro` | (1 occ.) | `/es/...` |
| `open-source.astro` | 341 | `/es/contacto` |
| `blog/index.astro` | 53 | `/es/blog/${post.id}` — todos los artículos del listado |
| `blog/[slug].astro` | 238 | `/es/contacto` |
| `security.astro` | 179 | `/es/contacto` |
| `resources.astro` | 1309 | `/es/contacto` |

**Corrección:** Reemplazar todos los `href="/es/..."` por `href="/..."` en estos archivos.

---

### P0-2 — Dropdown del navbar — labels y descripciones en inglés (Layout.astro)

**Descripción:** Los botones principales del navbar traducen correctamente (`{lang === 'es' ? 'Servicios' : 'Services'}`), pero los **arrays de items** de los 5 dropdowns están hardcodeados en inglés para todos los locales incluyendo español.

**Afecta:** 100% de las páginas del área española (el Layout es universal).

| Array | Labels en inglés | Descripciones en inglés |
|---|---|---|
| `servicesItems` | Cloud Infrastructure, Kubernetes Platforms, DevOps Automation, Platform Engineering, Observability & SRE | "AWS, multi-cloud & hybrid environments", "EKS, GKE & self-managed clusters", etc. |
| `solutionsItems` | AWS Modernization, Kubernetes Adoption, CI/CD Transformation, GitOps Implementation | "Migrate & modernize your AWS workloads", etc. |
| `industriesItems` | Healthcare, Fintech, SaaS | "HIPAA-compliant cloud infrastructure", etc. |
| `resourcesItems` | Guides & Resources, Documentation, Architecture Center, Assessment Tools | "Technical guides & best practices", etc. |
| `aboutItems` | Our Team, Certifications, Open Source, Why LRA, Methodology | "Platform engineers & cloud architects", etc. |

**Corrección:** Añadir lógica `lang === 'es' ? { label: '...ES', desc: '...ES' } : { label: '...EN', desc: '...EN' }` para cada item, o refactorizar arrays con soporte i18n.

---

### P0-3 — Dropdown "Soluciones" e "Industrias" enlazan a páginas inexistentes (Layout.astro)

**Descripción:** Los dropdowns de navegación enlazan a rutas `/solutions/...` e `/industries/...` que **no existen** en el área española (sin prefijo). El dist/ no genera esas rutas. Los usuarios que pulsen cualquier item de Soluciones o Industrias recibirán **404**.

| Dropdown | Rutas rotas |
|---|---|
| Soluciones | `/solutions/aws-modernization`, `/solutions/kubernetes-adoption`, `/solutions/cicd-transformation`, `/solutions/gitops` |
| Industrias | `/industries/healthcare`, `/industries/fintech`, `/industries/saas` |

**Nota:** Las versiones EN de estas páginas sí existen bajo `/en/solutions/...` y `/en/industries/...`.

**Corrección (opciones):** (a) Crear páginas `src/pages/solutions/*.astro` y `src/pages/industries/*.astro` en español, o (b) redirigir a `/en/solutions/...` o (c) retirar esos items del dropdown ES hasta que existan.

---

### P0-4 — `projects/[slug].astro` — badge `madurez` muestra valor en inglés

**Descripción:** Las páginas de detalle de proyecto muestran el badge de estado en inglés ("Production", "In Development", "Reference") porque `badgeStyle(madurez)` usa el campo `madurez` (inglés) en lugar de `madurez_es` (español).

```astro
// ❌ Actual (línea 148-149):
<span style={badgeStyle(madurez)}>{madurez}</span>

// ✅ Corrección:
const displayMaturity = (project.data as any).madurez_es ?? madurez
<span style={badgeStyle(displayMaturity)}>{displayMaturity}</span>
// También actualizar badgeStyle() para mapear valores ES: 'Producción', 'En Desarrollo', 'Referencia'
```

**Inconsistencia:** Las cards en `/proyectos` y en la home SÍ usan `madurez_es` (PR #137), pero la página de detalle NO. Un usuario ve "En Desarrollo" en la card → "In Development" al entrar al detalle.

---

## P1 — Páginas de servicio / proyecto / about

### P1-1 — `nosotros.astro` — Sección "Cómo Trabajamos" — 6 títulos de fase en inglés

**Ubicación:** `src/pages/nosotros.astro`, líneas 702–736 (array de la sección "How We Work")

| Valor actual (inglés) | Traducción sugerida |
|---|---|
| `Assessment` | `Evaluación` |
| `Architecture` | `Arquitectura` |
| `Implementation` | `Implementación` |
| `Validation` | `Validación` |
| `Operations` | `Operaciones` |
| `Continuous Improvement` | `Mejora Continua` |

---

### P1-2 — `nosotros.astro` — "Observability" en subtítulo del hero

**Ubicación:** `src/pages/nosotros.astro`, línea 48

```
// ❌ Actual:
Platform Engineering · Infraestructura Cloud · Automatización DevOps · Observability

// ✅ Corrección:
Platform Engineering · Infraestructura Cloud · Automatización DevOps · Observabilidad
```

---

### P1-3 — `servicios.astro` — palabra "engagement" en texto español

**Descripción:** La palabra "engagement" (anglicismo) aparece 5+ veces embebida en frases en español.

| Texto actual | Traducción sugerida |
|---|---|
| `Modelo de engagement` (línea 257) | `Nuestro modelo de trabajo` |
| `Iniciar engagement` (línea 421, botón) | `Iniciar proyecto` |
| `Cada engagement comienza con...` (línea 504) | `Cada proyecto comienza con...` |
| `Cada engagement se adapta...` (línea 504) | `Cada proyecto se adapta...` |

**Nota:** También aparece en `nosotros.astro` (línea 688): "Cada engagement sigue el mismo proceso" → "Cada proyecto sigue el mismo proceso".

---

### P1-4 — `projects/[slug].astro` — badge `CI/CD Active`

**Ubicación:** `src/pages/projects/[slug].astro`, línea 163

```astro
// ❌ Actual:
CI/CD Active

// ✅ Corrección:
CI/CD Activo
```

---

### P1-5 — `cloud-infrastructure.astro` — `badgeLabel` en inglés

**Ubicación:** `src/pages/cloud-infrastructure.astro`, línea 22

```astro
// ❌ Actual:
badgeLabel="01 · Cloud Infrastructure"

// ✅ Corrección:
badgeLabel="01 · Infraestructura Cloud"
```

**Nota:** Verificar los badgeLabels de las otras 4 páginas de servicio (`kubernetes-platforms.astro`, `devops-automation.astro`, `platform-engineering.astro`, `observability.astro`).

---

### P1-6 — `resources.astro` — "cada engagement"

**Ubicación:** `src/pages/resources.astro`, línea 43

```
// ❌ Actual:
Usados por nuestro equipo en cada engagement.

// ✅ Corrección:
Usados por nuestro equipo en cada proyecto.
```

---

### P1-7 — `contacto.astro` — label "Tipo de engagement"

**Ubicación:** `src/pages/contacto.astro`, línea 183

```
// ❌ Actual:
Tipo de engagement

// ✅ Corrección:
Tipo de proyecto
```

---

## P2 — Páginas estáticas / menor impacto

### P2-1 — `index.astro` — "Insights DevOps" (LinkedIn card)

**Ubicación:** `src/pages/index.astro`, línea 1991

```
// ❌ Actual:
Insights DevOps y actualizaciones de infraestructura cloud

// ✅ Corrección:
Novedades DevOps y actualizaciones de infraestructura cloud
```

---

### P2-2 — LD+JSON schemas con URLs `/es/` incorrectas (SEO)

Las páginas de servicio y detalle de proyecto generan structured data con URLs incorrectas que incluyen `/es/` siendo páginas sin prefijo.

| Archivo | URL incorrecta en schema |
|---|---|
| `cloud-infrastructure.astro` | `lracloudops.com/es/cloud-infrastructure#service` |
| `projects/[slug].astro` | `lracloudops.com/es/projects/${id}` (línea 49) |

**Corrección:** Cambiar a `lracloudops.com/cloud-infrastructure` y `lracloudops.com/projects/${id}`.

---

### P2-3 — `index.astro` — Títulos de sección con términos en inglés

| Texto actual | Nota |
|---|---|
| `Mentalidad production-first.` | Término técnico compuesto — borderline aceptable |
| `Operaciones GitOps-first.` | Idem |

**Recomendación:** Evaluar si traducir o dejar como términos de industria reconocidos.

---

### P2-4 — Testimoniales con cargos en inglés

**Ubicación:** `src/pages/index.astro`, sección de testimoniales

Los cargos profesionales están en inglés: `Head of Infrastructure`, `VP of Engineering`, `Senior DevOps Engineer`. Son títulos formales de puesto que habitualmente se mantienen en inglés, pero podrían traducirse si se quiere consistencia total.

---

### P2-5 — `blog/[slug].astro` — Verificar cuerpo de artículos en español

**Descripción:** La colección `esBlog` carga `src/content/es/blog/`. Los títulos de los 10 artículos sugieren contenido en español (terraform-aws-produccion, terraform-modulos-reutilizables, etc.), pero verificar que el cuerpo de cada `.md` esté completamente en español y no solo el frontmatter.

---

## Hallazgos estructurales

| # | Hallazgo | Impacto |
|---|---|---|
| E1 | Las rutas `/solutions/*` e `/industries/*` NO existen en el área española — el nav las referencia y generan 404 | P0 (ya documentado en P0-3) |
| E2 | Las rutas `/resources/aws-checklist` NO aparecen en dist/ (se sirve desde `/resources` como descarga). Verificar si existe una ruta dedicada al checklist con URL propia | P2 |
| E3 | El archivo `cloud-infrastructure.astro` y todos los demás servicios de detalle generan schemas LD+JSON con URLs `/es/` incorrectas — afecta indexado Google | P2 (ya en P2-2) |

---

## Componentes compartidos con texto en inglés

| Componente | Texto en inglés | Páginas afectadas |
|---|---|---|
| `Layout.astro` — `servicesItems[].label` | "Cloud Infrastructure", "Kubernetes Platforms", "DevOps Automation", "Platform Engineering", "Observability & SRE" | Todas (26+) |
| `Layout.astro` — `servicesItems[].desc` | "AWS, multi-cloud & hybrid environments", etc. | Todas |
| `Layout.astro` — `solutionsItems[].label` | "AWS Modernization", "Kubernetes Adoption", "CI/CD Transformation", "GitOps Implementation" | Todas |
| `Layout.astro` — `industriesItems[].desc` | "HIPAA-compliant cloud infrastructure", etc. | Todas |
| `Layout.astro` — `resourcesItems[].label` | "Guides & Resources", "Documentation", "Architecture Center", "Assessment Tools" | Todas |
| `Layout.astro` — `aboutItems[].label` | "Our Team", "Certifications", "Open Source", "Why LRA", "Methodology" | Todas |

---

## Páginas sin hallazgos de texto

Las siguientes páginas están 100% en español (sin hallazgos de texto visibles, salvo el bug de links P0-1 si aplica):

| Página | URL | Estado |
|---|---|---|
| `index.astro` | `/` | ✅ texto OK, salvo P2-1, P2-3, P2-4 |
| `proyectos.astro` | `/proyectos` | ✅ 100% español |
| `blog/index.astro` | `/blog` | ✅ texto OK (P0-1 en links) |
| `pricing.astro` | `/pricing` | ✅ texto OK (P0-1 en links) |
| `assessment.astro` | `/assessment` | ✅ 100% español |
| `resources.astro` | `/resources` | ✅ texto OK (P0-1 en link, P1-6) |
| `certifications.astro` | `/certifications` | ✅ texto OK (P0-1 en links) |
| `why-lra.astro` | `/why-lra` | ✅ texto OK (P0-1 en links) |
| `cloud-readiness.astro` | `/cloud-readiness` | No auditado — verificar |
| `kubernetes-readiness.astro` | `/kubernetes-readiness` | No auditado — verificar |

---

## Resumen cuantitativo

| Métrica | Valor |
|---|---|
| Páginas auditadas | 22 de 26 (4 pendientes: cloud-readiness, kubernetes-readiness, terms, privacy completos) |
| Bug crítico de URLs `/es/` | 29 ocurrencias en 13 archivos |
| Textos en inglés encontrados | ~35 instancias (excluyendo terminología técnica aceptada) |
| P0 | 4 hallazgos |
| P1 | 7 hallazgos |
| P2 | 5 hallazgos |
| Estructurales | 3 hallazgos |
| Páginas 100% en español (texto): | ~12 de 22 auditadas |
| Componente compartido más afectado | `Layout.astro` — navbar dropdowns en inglés para todos los visitantes ES |

---

## Plan de corrección recomendado

### Sprint 1 (P0 — máxima urgencia)
1. **P0-1:** Script de reemplazamiento masivo `href="/es/..."` → `href="/..."` en 13 archivos
2. **P0-2:** Añadir i18n a los 5 arrays de items del dropdown en `Layout.astro`
3. **P0-3:** Decidir: crear páginas ES de soluciones e industrias o retirar dropdowns del nav ES
4. **P0-4:** Fix `madurez` badge en `projects/[slug].astro` para usar `madurez_es`

### Sprint 2 (P1 — visible en páginas de alto tráfico)
5. **P1-1:** Traducir 6 títulos de fases en `nosotros.astro`
6. **P1-2:** "Observability" → "Observabilidad" en hero de nosotros
7. **P1-3:** Reemplazar "engagement" por "proyecto" en `servicios.astro` (6 ocurrencias)
8. **P1-4:** "CI/CD Active" → "CI/CD Activo" en `projects/[slug].astro`
9. **P1-5:** Revisar badgeLabels de las 5 páginas de servicio detalle
10. **P1-6/P1-7:** "engagement" → "proyecto" en `resources.astro` y `contacto.astro`

### Sprint 3 (P2 + SEO)
11. **P2-1:** "Insights" → "Novedades" en home
12. **P2-2:** Corregir URLs en schemas LD+JSON de `cloud-infrastructure.astro` y `projects/[slug].astro`
13. **P2-5:** Verificar cuerpo de artículos del blog en `src/content/es/blog/`
