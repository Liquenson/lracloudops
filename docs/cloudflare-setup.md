# Cloudflare Pages — Environment Variables Setup

## GITHUB_TOKEN (Required for live repo data)

Without this token, GitHub API calls are limited to 60/hour
and will fail during builds (403 errors).

### Steps:
1. Go to github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Create token with these permissions:
   - Repository: Contents (read)
   - Repository: Metadata (read)
   - Organization: Members (read)
3. Copy the token

4. Go to dash.cloudflare.com → Workers & Pages → lracloudops → Settings → Environment variables
5. Add variable:
   - Name: GITHUB_TOKEN
   - Value: [your token]
   - Environment: Production + Preview

### Verification:
After adding, trigger a new deploy and check the build log.
GitHub API calls should return 200 instead of 403.
