// Maps a technology tag label (EN or ES, exact or descriptive e.g. "Python 3.11+")
// to one of the .tag-* color classes defined in src/styles/global.css.
// Order matters: more specific keywords are checked before broader ones
// (e.g. "eks"/"kubeadm"/"calico" before "aws") since some tags combine both.
const TAG_KEYWORDS: [string, string][] = [
  ['python', 'tag-python'],
  ['kubernetes', 'tag-kubernetes'],
  ['kubeadm', 'tag-kubernetes'],
  ['calico', 'tag-kubernetes'],
  ['eks', 'tag-kubernetes'],
  ['terraform', 'tag-terraform'],
  ['aws', 'tag-aws'],
  ['docker', 'tag-docker'],
  ['helm', 'tag-helm'],
  ['argocd', 'tag-argocd'],
  ['trivy', 'tag-security'],
  ['checkov', 'tag-security'],
  ['github', 'tag-github'],
  ['sonarcloud', 'tag-sonarcloud'],
  ['ansible', 'tag-ansible'],
  ['vagrant', 'tag-vagrant'],
  ['anthropic', 'tag-ai'],
  ['ai model', 'tag-ai'],
  ['modelo de ia', 'tag-ai'],
  ['modelo ia', 'tag-ai'],
  ['tool-use', 'tag-ai'],
]

export function getTagClass(tag: string): string {
  const t = tag.toLowerCase()
  for (const [keyword, className] of TAG_KEYWORDS) {
    if (t.includes(keyword)) return className
  }
  return ''
}
