// Mobile navigation menu toggle — Header.astro
;(function () {
  const btn = document.getElementById('mobile-menu-btn')
  const overlay = document.getElementById('mobile-overlay')
  const close = document.getElementById('mobile-close')

  btn?.addEventListener('click', () => {
    if (overlay) overlay.style.display = 'block'
    document.body.style.overflow = 'hidden'
    btn.setAttribute('aria-expanded', 'true')
  })

  const closeFn = () => {
    if (overlay) overlay.style.display = 'none'
    document.body.style.overflow = ''
    btn?.setAttribute('aria-expanded', 'false')
  }

  close?.addEventListener('click', closeFn)
  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) closeFn()
  })
})()
