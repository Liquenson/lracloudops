// Language auto-redirect — runs only on home page, before paint
;(function () {
  const path = window.location.pathname
  if (path !== '/') return
  if (sessionStorage.getItem('lang-chosen')) return
  const lang = navigator.language || navigator.userLanguage || 'en'
  const isSpanish = lang.toLowerCase().startsWith('es')
  if (isSpanish) {
    sessionStorage.setItem('lang-chosen', 'es')
    window.location.replace('/es/')
  } else {
    sessionStorage.setItem('lang-chosen', 'en')
  }
})()
