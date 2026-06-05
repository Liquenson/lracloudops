# CI/CD Pipeline — LRA Cloud Operations

## Overview

CI is handled by GitHub Actions. Deployment is handled automatically by Cloudflare Pages via direct GitHub integration — no deploy step lives in the workflow.

## Workflow: `.github/workflows/build.yml`

**Triggers:**
- Push to `main`, `feat/**`, `fix/**`, `chore/**`
- Pull requests targeting `main`

**Concurrency:** one run per `workflow + ref` — in-progress runs are cancelled when a new commit is pushed.

## Steps

| Step | Tool | Purpose |
|---|---|---|
| Checkout | `actions/checkout@v4` | Clone repo |
| Setup Node.js | `actions/setup-node@v4` (Node 22, npm cache) | Runtime + cache |
| Install dependencies | `npm ci` | Reproducible install from `package-lock.json` |
| Security audit | `npm audit --audit-level=high` | Flag high/critical vulnerabilities (non-blocking via `continue-on-error: true`) |
| Type check | `npx astro check` | TypeScript + Astro template type errors |
| Build | `npm run build` | Astro static build → `./dist/` |
| Verify output | bash `[ -d dist ]` | Sanity check that dist was produced |
| Upload artifact | `actions/upload-artifact@v4` | Archive `dist/` for 30 days (main branch only) |
| Lighthouse CI | `@lhci/cli` | Performance/accessibility audit |

## How to Add a New Step

1. Edit `.github/workflows/build.yml`
2. Add your step under `jobs.build.steps` in the correct position (after `npm ci`, before `Build` is typical for validators)
3. Use `continue-on-error: true` for advisory checks that should not block merges
4. Commit and push — GitHub Actions picks up the change automatically

Example step template:
```yaml
- name: My new check
  run: npx my-tool --flag
  continue-on-error: true   # remove if this should be a hard gate
```

## Secrets

No secrets are required for the current CI workflow. The `GITHUB_TOKEN` is auto-injected and used for Lighthouse CI reporting.

If you add steps that need AWS, SonarCloud, or other external services:

| Secret name | Purpose | Where to add |
|---|---|---|
| `GITHUB_TOKEN` | Lighthouse CI GitHub App integration | Auto-injected, no setup needed |

Secrets are configured in **Settings → Secrets and variables → Actions** on the GitHub repository.

## Deployment

Deployment is **not** part of the GitHub Actions workflow. Cloudflare Pages monitors the `main` branch directly:

1. `main` receives a new commit
2. Cloudflare Pages triggers an automatic build using its own Node.js environment
3. The site is deployed to `https://lracloudops.com`

Preview deployments are created automatically for pull requests.

## Dependabot

Configured in `.github/dependabot.yml`:
- **Schedule:** weekly
- **Ecosystem:** npm
- **Max open PRs:** 5
- **Ignored:** major version bumps (to avoid breaking changes without review)
- **Labels:** `dependencies`

## Local Validation Before Push

```bash
npm ci                           # clean install
npm audit --audit-level=high     # security check
npx astro check                  # type check
npm run build                    # production build
```
