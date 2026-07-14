// Contact form — contact.astro / es/contacto.astro
;(function () {
  const WEBHOOK_URL = 'https://lracloudops-webhook.liquenson-cloud.workers.dev'

  const form = document.querySelector('form[action*="web3forms"]')
  const successMessage = document.getElementById('success-message')

  // Show success message after Web3Forms redirects back with ?success=true
  if (new URLSearchParams(window.location.search).get('success') === 'true') {
    successMessage?.style.setProperty('display', 'block')
    form?.style.setProperty('display', 'none')
  }

  // Fire the smart-scan webhook alongside the normal Web3Forms submission.
  // Does NOT preventDefault — the browser still navigates to Web3Forms as usual.
  // keepalive lets the request survive that navigation.
  form?.addEventListener('submit', () => {
    const formData = new FormData(form)
    const githubRepo = (formData.get('github_repo') || '').trim()

    if (!githubRepo.includes('/')) return

    const payload = {
      name: formData.get('name') || '',
      email: formData.get('email') || '',
      github_repo: githubRepo,
      topic: formData.get('topic') || '',
    }

    try {
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      })
    } catch {
      // Fail silently — Web3Forms already handles the actual message
    }
  })
})()
