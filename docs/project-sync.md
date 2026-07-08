# Project Sync — .lracloudops.json

Each repository in `lra-cloud-ops` should have a `.lracloudops.json`
file at the root. This file is read by lracloudops.com at build time
(via `getProjectConfig()` in `src/lib/github.ts`) to display accurate
project information — description, status, stats, tags and features —
without requiring a code change on this site.

## How it works

1. `/projects` and `/es/proyectos` call `getAllProjectConfigs()` during
   `astro build`, which fetches `.lracloudops.json` from each repo via
   the GitHub Contents API.
2. If the file doesn't exist or the fetch fails, the page silently
   falls back to the static defaults hardcoded in the page.
3. Any field present in `.lracloudops.json` overrides the static
   default for that project (description, status, tags, stats). Fields
   not present, or not recognized, are left untouched.

## How to update project data

1. Edit `.lracloudops.json` in the repository root.
2. Commit and push to `main`.
3. lracloudops.com rebuilds daily at 6am UTC — or trigger it manually:
   go to `github.com/Liquenson/lracloudops` → Actions → **Sync GitHub
   data — daily rebuild** → Run workflow.

Pushing to the repo alone does **not** update the site — this site has
no webhook listener for other repos, only a scheduled/manual rebuild.

## Files to copy to each repo

Generated this session in the local OS temp folder
(`C:\Users\lique\AppData\Local\Temp`, i.e. `/tmp` under Git Bash).
This is a temp folder and may be cleaned by Windows — copy these into
their target repos soon rather than treating this as permanent storage.

- `/tmp/lra-ai-platform.json` → `lra-cloud-ops/lra-ai-platform/.lracloudops.json`
- `/tmp/aws-devops-agent.json` → `lra-cloud-ops/aws-devops-agent/.lracloudops.json`
- `/tmp/aws-terraform-devops.json` → `lra-cloud-ops/aws-terraform-devops/.lracloudops.json`
- `/tmp/k8s-on-premise.json` → `lra-cloud-ops/k8s-on-premise/.lracloudops.json`

## JSON schema

See `src/lib/github.ts` → `ProjectConfig` interface.

```typescript
interface ProjectConfig {
  name: string
  description: string        // English card description
  descriptionES: string      // Spanish card description
  status: 'Active' | 'PoC' | 'Lab' | 'Archive'
  stats: Record<string, string | number>  // keys matched case-insensitively against stat labels, e.g. "tfModules" -> "TF Modules"
  tags: string[]
  features: string[]         // not yet rendered on /projects — reserved for project detail pages
  featuresES: string[]
}
```
