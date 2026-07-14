// Footer language dropdown + back-to-top — Footer.astro
;(function () {
  const btn = document.getElementById('footer-lang-btn')
  const dropdown = document.getElementById('footer-lang-dropdown')
  const chevron = document.getElementById('footer-lang-chevron')
  const scrollTopBtn = document.getElementById('footer-scroll-top')

  scrollTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  btn?.addEventListener('click', () => {
    const isOpen = dropdown?.style.display === 'block'
    if (dropdown) dropdown.style.display = isOpen ? 'none' : 'block'
    if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)'
    if (btn) {
      btn.setAttribute('aria-expanded', String(!isOpen))
      if (isOpen) {
        btn.removeAttribute('data-open')
      } else {
        btn.setAttribute('data-open', 'true')
      }
    }
  })

  document.addEventListener('click', (e) => {
    if (!btn?.contains(e.target) && !dropdown?.contains(e.target)) {
      if (dropdown) dropdown.style.display = 'none'
      if (chevron) chevron.style.transform = 'rotate(0deg)'
      if (btn) {
        btn.setAttribute('aria-expanded', 'false')
        btn.removeAttribute('data-open')
      }
    }
  })
})()
