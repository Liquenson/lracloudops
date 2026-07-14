// Industries tab slider — index.astro / es/index.astro
;(function () {
  const isES = document.documentElement.lang === 'es'
  const tabBtns = Array.from(document.querySelectorAll('#industries [data-tab]'))
  const tabPanels = Array.from(document.querySelectorAll('#industries [data-panel]'))

  if (!tabBtns.length || !tabPanels.length) return

  let current = 0
  let autoplay = null
  let isPaused = false

  // Setup panel container for slide effect
  const panelContainer = tabPanels[0]?.parentElement
  if (panelContainer) {
    panelContainer.style.position = 'relative'
    panelContainer.style.overflow = 'hidden'
  }

  // Initialize panels
  tabPanels.forEach((panel, i) => {
    panel.style.position = i === 0 ? 'relative' : 'absolute'
    panel.style.top = '0'
    panel.style.left = '0'
    panel.style.width = '100%'
    panel.style.opacity = i === 0 ? '1' : '0'
    panel.style.transform = i === 0 ? 'translateX(0)' : 'translateX(100%)'
    panel.style.transition =
      'opacity 600ms cubic-bezier(0.4, 0, 0.2, 1), transform 600ms cubic-bezier(0.4, 0, 0.2, 1)'
    panel.style.pointerEvents = i === 0 ? 'auto' : 'none'
  })

  function goTo(next, direction) {
    if (direction === undefined) direction = 'left'
    if (next === current) return

    const prev = current
    const prevPanel = tabPanels[prev]
    const nextPanel = tabPanels[next]

    // Position next panel off screen
    nextPanel.style.transition = 'none'
    nextPanel.style.transform =
      direction === 'left' ? 'translateX(100%)' : 'translateX(-100%)'
    nextPanel.style.opacity = '0'
    nextPanel.style.position = 'absolute'
    nextPanel.style.pointerEvents = 'none'

    // Force reflow
    nextPanel.getBoundingClientRect()

    // Animate
    requestAnimationFrame(() => {
      nextPanel.style.transition =
        'opacity 600ms cubic-bezier(0.4, 0, 0.2, 1), transform 600ms cubic-bezier(0.4, 0, 0.2, 1)'
      nextPanel.style.transform = 'translateX(0)'
      nextPanel.style.opacity = '1'
      nextPanel.style.pointerEvents = 'auto'

      prevPanel.style.transition =
        'opacity 600ms cubic-bezier(0.4, 0, 0.2, 1), transform 600ms cubic-bezier(0.4, 0, 0.2, 1)'
      prevPanel.style.transform =
        direction === 'left' ? 'translateX(-100%)' : 'translateX(100%)'
      prevPanel.style.opacity = '0'
      prevPanel.style.pointerEvents = 'none'

      setTimeout(() => {
        prevPanel.style.position = 'absolute'
        nextPanel.style.position = 'relative'
      }, 620)
    })

    // Update buttons
    tabBtns.forEach((btn, i) => {
      const isActive = i === next
      btn.style.borderBottomColor = isActive ? '#1A73E8' : 'transparent'
      btn.style.color = isActive ? '#1A73E8' : '#5F6368'
      btn.style.fontWeight = isActive ? '600' : '500'
    })

    current = next
  }

  function next() {
    goTo((current + 1) % tabBtns.length, 'left')
  }

  function startAutoplay() {
    if (autoplay) clearInterval(autoplay)
    autoplay = setInterval(() => {
      if (!isPaused) next()
    }, 2000)
  }

  // Manual tab click
  tabBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const dir = i > current ? 'left' : 'right'
      goTo(i, dir)
      // Reset autoplay timer on manual click
      startAutoplay()
    })
  })

  // Pause on hover
  const section = tabBtns[0]?.closest('section')
  if (section) {
    section.addEventListener('mouseenter', () => {
      isPaused = true
    })
    section.addEventListener('mouseleave', () => {
      isPaused = false
    })
  }

  // Progress indicator dots
  const dotsContainer = document.querySelector('#industries [data-tab-dots]')
  if (dotsContainer) {
    tabBtns.forEach((btn, i) => {
      const dot = document.createElement('button')
      const label = isES
        ? `Mostrar diapositiva ${btn.textContent?.trim()}`
        : `Show ${btn.textContent?.trim()} slide`
      dot.setAttribute('aria-label', label)
      dot.style.cssText = `
        width: 6px; height: 6px; border-radius: 50%;
        background: ${i === 0 ? '#1A73E8' : '#DADCE0'};
        border: none; cursor: pointer; padding: 0;
        transition: background 300ms ease, transform 300ms ease;
      `
      dot.addEventListener('click', () => {
        const dir = i > current ? 'left' : 'right'
        goTo(i, dir)
        startAutoplay()
      })
      dotsContainer.appendChild(dot)
    })

    // Update dots
    function updateDots() {
      const dots = Array.from(dotsContainer.querySelectorAll('button'))
      dots.forEach((dot, i) => {
        dot.style.background = i === current ? '#1A73E8' : '#DADCE0'
        dot.style.transform = i === current ? 'scale(1.4)' : 'scale(1)'
      })
    }

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', updateDots)
    })

    setInterval(updateDots, 100)
  }

  // Start autoplay
  startAutoplay()
})()
