/**
 * LRA CloudOps — Premium Animation System v2
 *
 * SAFETY RULE: Always use gsap.from() — content is visible by default.
 * Animations are progressive enhancement, never a requirement.
 *
 * Stack: Lenis (smooth scroll) + GSAP ScrollTrigger (animations)
 * GPU-only: transform + opacity + filter
 * prefers-reduced-motion: fully respected
 */

import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches

// ============================================================
// SMOOTH SCROLL — Lenis with natural inertia
// ============================================================
export function initSmoothScroll(): Lenis | undefined {
  if (prefersReducedMotion) return undefined

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 0.85,
    touchMultiplier: 1.5,
  })

  gsap.ticker.add((time: number) => {
    lenis.raf(time * 1000)
  })

  gsap.ticker.lagSmoothing(0)
  lenis.on('scroll', ScrollTrigger.update)

  return lenis
}

// ============================================================
// SECTION ANIMATIONS — fade-up on scroll entry
// Content always visible — gsap.from() only
// ============================================================
export function initSectionAnimations(): void {
  if (prefersReducedMotion) return

  // Simple fade-up for sections
  gsap.utils.toArray<HTMLElement>('[data-animate="fade-up"]').forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      y: 28,
      duration: 0.65,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        once: true,
      },
    })
  })

  // Stagger for grids — children animate in sequence
  gsap.utils
    .toArray<HTMLElement>('[data-animate="stagger"]')
    .forEach((container) => {
      const children = Array.from(
        container.querySelectorAll<HTMLElement>('[data-animate-child]')
      )
      if (!children.length) return

      gsap.from(children, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.07,
        scrollTrigger: {
          trigger: container,
          start: 'top 88%',
          once: true,
        },
      })
    })

  // Progressive logos
  gsap.utils
    .toArray<HTMLElement>('[data-animate="logos"]')
    .forEach((container) => {
      const logos = Array.from(
        container.querySelectorAll<HTMLElement>('[data-logo]')
      )
      if (!logos.length) return

      gsap.from(logos, {
        opacity: 0,
        y: 10,
        duration: 0.4,
        ease: 'power2.out',
        stagger: 0.1,
        scrollTrigger: {
          trigger: container,
          start: 'top 90%',
          once: true,
        },
      })
    })
}

// ============================================================
// HERO PARALLAX — subtle depth on scroll
// ============================================================
export function initHeroParallax(): void {
  if (prefersReducedMotion) return

  const hero = document.querySelector<HTMLElement>('[data-hero]')
  if (!hero) return

  const heroContent = hero.querySelector<HTMLElement>('[data-hero-content]')
  const heroBg = hero.querySelector<HTMLElement>('[data-hero-bg]')

  if (heroContent) {
    gsap.to(heroContent, {
      y: -30,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.8,
      },
    })
  }

  if (heroBg) {
    gsap.to(heroBg, {
      y: 50,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 2.5,
      },
    })
  }
}

// ============================================================
// NAVBAR — blur + background on scroll
// ============================================================
export function initNavbar(): void {
  const header = document.querySelector<HTMLElement>('header')
  if (!header) return

  let ticking = false

  const updateHeader = () => {
    const scrolled = window.scrollY > 60

    if (scrolled) {
      header.style.backgroundColor = 'rgba(255, 255, 255, 0.92)'
      header.style.backdropFilter = 'blur(16px)'
      header.style.setProperty('-webkit-backdrop-filter', 'blur(16px)')
      header.style.boxShadow = '0 1px 0 rgba(0,0,0,0.08)'
    } else {
      header.style.backgroundColor = 'rgba(255, 255, 255, 1)'
      header.style.backdropFilter = 'blur(0px)'
      header.style.setProperty('-webkit-backdrop-filter', 'blur(0px)')
      header.style.boxShadow = 'none'
    }

    ticking = false
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(updateHeader)
        ticking = true
      }
    },
    { passive: true }
  )
}

// ============================================================
// SVG DIAGRAM ANIMATIONS — lines and nodes on entry
// ============================================================
export function initDiagramAnimations(): void {
  if (prefersReducedMotion) return

  const diagrams = document.querySelectorAll<SVGElement>('[data-diagram]')

  diagrams.forEach((diagram) => {
    const lines = Array.from(diagram.querySelectorAll<SVGLineElement>('line'))
    const rects = Array.from(
      diagram.querySelectorAll<SVGRectElement>('rect:not(:first-child)')
    )
    const circles = Array.from(
      diagram.querySelectorAll<SVGCircleElement>('circle')
    )
    const texts = Array.from(diagram.querySelectorAll<SVGTextElement>('text'))

    ScrollTrigger.create({
      trigger: diagram,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        // Animate rects first
        gsap.from(rects, {
          opacity: 0,
          scale: 0.92,
          transformOrigin: 'center center',
          duration: 0.4,
          ease: 'power2.out',
          stagger: 0.03,
        })

        // Then lines
        gsap.from(lines, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out',
          stagger: 0.04,
          delay: 0.15,
        })

        // Then texts
        gsap.from(texts, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out',
          stagger: 0.02,
          delay: 0.25,
        })

        // Circles
        gsap.from(circles, {
          opacity: 0,
          scale: 0,
          transformOrigin: 'center center',
          duration: 0.3,
          ease: 'back.out(1.5)',
          stagger: 0.05,
          delay: 0.1,
        })
      },
    })
  })
}

// ============================================================
// INIT ALL
// ============================================================
export function initAnimations(): void {
  const run = () => {
    initSmoothScroll()
    initSectionAnimations()
    initHeroParallax()
    initNavbar()
    initDiagramAnimations()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run)
  } else {
    run()
  }
}
