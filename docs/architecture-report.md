# LRA Cloud Ops — Architecture Report
**Version:** 4.0 | **Date:** 2026-06-01 | **Branch:** feat/multilingual-es

---

## 1. Summary of Changes

This document describes the architectural evolution from the original monolingual portfolio site to the current enterprise-grade multilingual platform.

---

## 2. Previous Architecture

### Structure
```
src/
  layouts/Layout.astro           — Single base layout (542 lines)
  pages/
    index.astro                  — Home
    servicios.astro              — Solutions (Spanish URL)
    proyectos.astro              — Projects (Spanish URL)
    sobre-nosotros.astro         — About (Spanish URL)
    contacto.astro               — Contact (Spanish URL, Spanish content)
    case-studies.astro           — Duplicate of proyectos
    cloud-infrastructure.astro   — 173 lines (full inline)
    platform-engineering.astro   — 173 lines (full inline, duplicate structure)
    devops-automation.astro      — 173 lines (full inline, duplicate structure)
    observability.astro          — 173 lines (full inline, duplicate structure)
    blog/
      index.astro
      [slug].astro
    projects/[slug].astro
  content/
    blog/                        — 8 articles
    projects/                    — 11 case studies
  styles/global.css
  i18n/
    index.ts                     — Helpers (unused)
    ui.ts                        — 79 keys en/es (unused)
```

### Known Issues (Pre-refactor)
| Issue | Severity | Impact |
|-------|----------|--------|
| `<title>` hardcoded in Layout.astro (line 84) | Critical | All pages had the same browser title. SEO broken. |
| `contacto.astro` fully in Spanish | High | Conversion broken for English visitors |
| 4 solution pages with 100% duplicated structure | High | 692 lines of duplicated code |
| i18n infrastructure built but never connected | High | No Spanish version despite 79 translated keys |
| Gmail email in Organization schema | Medium | Unprofessional for B2B |
| "Available for new projects" copy | Medium | Freelancer language in enterprise context |
| No security headers | Medium | Missing X-Frame-Options, CSP, etc. |
| No GitHub Actions CI | Medium | DevOps firm with no CI on its own site |
| IBM Plex Sans loaded (unused) | Low | Extra ~60KB font network request |
| `lastmod` always `new Date()` in sitemap | Low | Incorrect crawl signals |

---

## 3. New Architecture

### Structure
```
src/
  layouts/Layout.astro           — Updated: dynamic title, hreflang, language switcher, i18n-aware nav
  components/
    SolutionLayout.astro         — NEW: parametrized solution page template
  pages/
    index.astro                  — Updated: Selected Engagements section, /contact links
    services.astro               — NEW: English URL for solutions
    projects.astro               — NEW: English URL for projects
    about.astro                  — NEW: English URL for about
    contact.astro                — NEW: Fully translated English contact page
    cloud-infrastructure.astro   — Refactored: now 50 lines using SolutionLayout
    platform-engineering.astro   — Refactored: now 55 lines using SolutionLayout
    devops-automation.astro      — Refactored: now 55 lines using SolutionLayout
    observability.astro          — Refactored: now 55 lines using SolutionLayout
    blog/
      index.astro                — Updated: /contact link
      [slug].astro               — Updated: LRA Cloud Operations author, /contact link
    projects/[slug].astro        — Updated: enterprise copy, /contact link
    es/
      index.astro                — NEW: Spanish home
      servicios.astro            — NEW: Spanish solutions
      proyectos.astro            — NEW: Spanish projects (links to EN detail)
      nosotros.astro             — NEW: Spanish about
      contacto.astro             — NEW: Spanish contact
      blog/
        index.astro              — NEW: Spanish blog listing
  content/
    blog/                        — 8 articles (unchanged)
    projects/                    — 11 case studies (unchanged)
  styles/global.css              — Updated: IBM Plex Sans removed from --font-sans
  i18n/
    index.ts                     — NOW CONNECTED via Layout.astro
    ui.ts                        — 79 keys (complete)
public/
  _headers                       — NEW: Security headers (CSP, X-Frame-Options, HSTS)
  _redirects                     — NEW: 301 redirects from Spanish to English URLs
.github/
  workflows/
    build.yml                    — NEW: CI pipeline (npm ci + astro check + astro build)
astro.config.mjs                 — Updated: i18n config added
CLAUDE.md                        — Updated: reflects new architecture
docs/
  architecture-report.md         — THIS FILE
```

---

## 4. Improvements Made

### SEO
| Before | After |
|--------|-------|
| `<title>` hardcoded — same for all pages | `<title>{titulo} \| LRA Cloud Ops</title>` — dynamic per page |
| No hreflang tags | `<link rel="alternate" hreflang="en/es/x-default">` on every page |
| `og:type` always `"website"` | `ogType` prop — passes `"article"` for blog posts |
| Gmail email in Organization schema | `info@lracloudops.com` throughout |
| No Spanish alternate URLs | hreflang pairs generated dynamically from `getAlternateUrl()` |

### Multilingual
| Before | After |
|--------|-------|
| i18n helpers built but not connected | `getLangFromUrl()` used in Layout.astro for dynamic `lang` attr |
| No i18n config in astro.config.mjs | Native Astro i18n with `prefixDefaultLocale: false` |
| No `/es/` pages | 6 Spanish pages under `src/pages/es/` |
| `<html lang="en">` hardcoded | `<html lang={lang === 'es' ? 'es' : 'en'}>` — dynamic |
| No language switcher | **EN \| ES** pill in desktop nav + mobile drawer |

### Architecture
| Before | After |
|--------|-------|
| 4 × 173-line duplicate solution pages | 1 × `SolutionLayout.astro` component + 4 × ~55-line wrappers |
| No `src/components/` directory | `src/components/` created with `SolutionLayout.astro` |
| All page code inline | Component extraction begun; pattern established for future |

### Enterprise Positioning
| Before | After |
|--------|-------|
| "Available for new projects" (freelancer) | "Accepting new engagements" (enterprise) |
| "Hablemos" H1 on contact page (Spanish) | "Let's talk." (English) |
| Gmail email public | `info@lracloudops.com` |
| No social proof section | "Selected Engagements" section on home page |
| "I can design..." in project detail | "We can design..." |
| Author: "Liquenson Rubén" in schemas | Author: "LRA Cloud Operations" |

### URL Consistency
| Before | After |
|--------|-------|
| `/servicios` (Spanish URL, English content) | `/services` (English URL) |
| `/proyectos` (Spanish URL, English content) | `/projects` (English URL) |
| `/sobre-nosotros` (Spanish URL, English content) | `/about` (English URL) |
| `/contacto` (Spanish URL, Spanish content) | `/contact` (English URL, English content) |
| Old URLs unhandled | `public/_redirects` — 301 to new English URLs |

### Security
| Before | After |
|--------|-------|
| No HTTP security headers | `public/_headers` with CSP, X-Frame-Options, HSTS, Permissions-Policy |

### DevOps
| Before | After |
|--------|-------|
| No CI workflow | `.github/workflows/build.yml` — npm ci + astro check + astro build |

### Performance
| Before | After |
|--------|-------|
| 3 font families (Inter + IBM Plex Sans + JetBrains Mono) | 2 font families (Inter + JetBrains Mono) |
| IBM Plex Sans listed in `--font-sans` CSS var | Removed |

---

## 5. Remaining Technical Debt

### High Priority
- **Spanish content translations**: The `/es/` pages use simplified translations. Full article-level translation (blog + project case studies) requires separate `.md` files in `src/content/es/`.
- **Old Spanish pages** (`servicios.astro`, `proyectos.astro`, `sobre-nosotros.astro`, `contacto.astro`): Still exist alongside English versions. Consider removing after `_redirects` is validated in production.
- **`lastmod` in sitemap**: Still `new Date()` — should use file modification dates for accurate crawl signals.

### Medium Priority
- **Font self-hosting**: Google Fonts adds 2 external DNS lookups on first paint. Consider `@fontsource/inter` and `@fontsource/jetbrains-mono` for self-hosted fonts.
- **Image optimization**: Team photos in `public/images/` bypass Astro's image optimization. Migrate to `src/assets/` and use `<Image />` from `astro:assets`.
- **`og:image` per article**: Blog posts and project pages use the generic `og-image.png`. Consider per-page OG images (can be automated with `@vercel/og` equivalent or Satori).
- **`sobre-nosotros.astro`** is 1193 lines — the team section should be extracted to a `TeamMemberCard.astro` component.
- **Cloudflare Turnstile**: Contact form does not have bot protection. Add Turnstile widget to `/contact` and `/es/contacto`.

### Low Priority
- **FAQ Schema**: Service pages contain FAQ-like content but no `FAQPage` structured data.
- **Blog category filter JS**: Client-side category filter in `blog/index.astro` uses `display:none` — not crawlable by search engines for category filtering.
- **`dateModified` in blog schema**: Always equals `datePublished`. Add an `updatedAt` field to the blog content schema.

---

## 6. Recommended Next Steps

### Immediate (this week)
1. Validate `_redirects` in production — confirm `/servicios` → `/services` 301 works on Cloudflare Pages
2. Delete old Spanish-named page files after redirect validation: `servicios.astro`, `proyectos.astro`, `sobre-nosotros.astro`, `contacto.astro`
3. Add `info@lracloudops.com` email forwarding to personal inbox

### Short-term (30 days)
1. Translate all 8 blog articles into Spanish (`src/content/es/blog/`)
2. Add Cloudflare Turnstile to both contact forms
3. Migrate team photos to `src/assets/` for WebP conversion
4. Extract `TeamMemberCard.astro` from `about.astro` / `sobre-nosotros.astro`
5. Add `FAQPage` schema to 4 solution pages

### Medium-term (60–90 days)
1. Self-host fonts via `@fontsource`
2. Implement per-page OG image generation
3. Add `src/content/es/projects/` with Spanish project summaries
4. Create `/engage` or `/pricing` page with engagement models
5. Add client testimonials section (anonymous by industry)

---

## 7. File Count Summary

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Total .astro pages | 13 | 23 | +10 |
| Spanish pages | 0 | 6 | +6 |
| Components | 0 | 1 | +1 |
| Security files | 0 | 2 (_headers, _redirects) | +2 |
| CI workflows | 0 | 1 | +1 |
| Lines in solution pages | 692 (4×173) | ~220 (4×55 + 1×115) | -472 |
| Hardcoded `<title>` bugs | 1 (critical) | 0 | -1 |
