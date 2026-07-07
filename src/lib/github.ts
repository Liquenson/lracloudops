// GitHub API client for build-time data fetching. Runs during `astro build`, never in the browser.

export interface RepoData {
  name: string
  description: string
  stars: number
  forks: number
  commits: number
  pushedAt: string
  languages: string[]
  url: string
}

const GITHUB_API = 'https://api.github.com'
const ORG = 'lra-cloud-ops'
const REPOS = ['lra-ai-platform', 'aws-devops-agent', 'aws-terraform-devops', 'k8s-on-premise'] as const

function getHeaders(): HeadersInit {
  const token = import.meta.env.GITHUB_TOKEN
  return {
    Accept: 'application/vnd.github.v3+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function fallbackRepoData(repo: string): RepoData {
  return {
    name: repo,
    description: '',
    stars: 0,
    forks: 0,
    commits: 0,
    pushedAt: '',
    languages: [],
    url: `https://github.com/${ORG}/${repo}`,
  }
}

async function getCommitCount(repo: string): Promise<number> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${ORG}/${repo}/commits?per_page=1`, {
      headers: getHeaders(),
    })
    if (!res.ok) return 0

    const link = res.headers.get('Link') || ''
    const match = link.match(/[?&]page=(\d+)>; rel="last"/)
    if (match) return parseInt(match[1], 10)

    const data = await res.json()
    return Array.isArray(data) ? data.length : 0
  } catch {
    return 0
  }
}

async function getLanguages(repo: string): Promise<string[]> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${ORG}/${repo}/languages`, { headers: getHeaders() })
    if (!res.ok) return []
    const data = await res.json()
    return Object.keys(data).slice(0, 5)
  } catch {
    return []
  }
}

export async function getRepoData(repo: string): Promise<RepoData> {
  try {
    const [repoRes, commits, languages] = await Promise.all([
      fetch(`${GITHUB_API}/repos/${ORG}/${repo}`, { headers: getHeaders() }),
      getCommitCount(repo),
      getLanguages(repo),
    ])

    if (!repoRes.ok) {
      throw new Error(`GitHub API error: ${repoRes.status}`)
    }

    const data = await repoRes.json()

    return {
      name: data.name,
      description: data.description || '',
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      commits,
      pushedAt: data.pushed_at,
      languages,
      url: data.html_url,
    }
  } catch (err) {
    console.warn(`[github.ts] Failed to fetch data for ${repo}:`, err)
    return fallbackRepoData(repo)
  }
}

export async function getAllRepos(): Promise<Record<string, RepoData>> {
  const results = await Promise.all(REPOS.map(async (repo) => [repo, await getRepoData(repo)] as const))
  return Object.fromEntries(results)
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateES(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}
