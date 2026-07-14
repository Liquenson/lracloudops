// Animated counters — stat values count up from 0 when scrolled into view
;(function () {
  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count') || '0')
    const duration = 1200
    const start = performance.now()

    const tick = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      el.textContent = Math.round(eased * target).toString()
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target)
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.5 }
  )

  document.querySelectorAll('[data-count]').forEach((el) => observer.observe(el))
})()
