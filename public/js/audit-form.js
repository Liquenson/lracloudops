// Audit request form — audit.astro / es/auditoria.astro
;(function () {
  const params = new URLSearchParams(window.location.search)
  if (params.get('success') === 'true') {
    document.getElementById('audit-success')?.style.setProperty('display', 'block')
    document.getElementById('audit-form')?.style.setProperty('display', 'none')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const form = document.getElementById('audit-form')
  form?.addEventListener('submit', () => {
    const formData = new FormData(form)
    const githubRepo = (formData.get('github_repo') || '').trim()
    if (githubRepo && githubRepo.includes('/')) {
      try {
        fetch('https://lracloudops-webhook.liquenson-cloud.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            name: formData.get('name') || '',
            email: formData.get('email') || '',
            github_repo: githubRepo,
          }),
        })
      } catch {
        /* fail silently */
      }
    }
  })
})()
