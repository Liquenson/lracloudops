/**
 * LRA CloudOps — Animation System
 * Premium scroll experience inspired by Google Cloud / Vercel / Linear
 *
 * Architecture:
 * - Lenis: smooth scroll with natural inertia
 * - GSAP + ScrollTrigger: scroll-linked animations
 * - CSS: hover micro-interactions
 * - prefers-reduced-motion: fully respected
 */

import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches

/**
 * Initialize Lenis smooth scroll
 */
export function initSmoothScroll() {
  if (prefersReducedMotion) return

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 0.8,
    touchMultiplier: 1.5,
  })

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })

  gsap.ticker.lagSmoothing(0)

  lenis.on('scroll', ScrollTrigger.update)

  return lenis
}

/**
 * Animate sections on scroll entry
 * opacity + translateY + subtle scale
 */
export function initSectionAnimations() {
  if (prefersReducedMotion) return

  gsap.utils.toArray<HTMLElement>('[data-animate="fade-up"]').forEach((el) => {
    gsap.fromTo(
      el,
      {
        opacity: 0,
        y: 40,
        scale: 0.98,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
        },
      }
    )
  })

  gsap.utils.toArray<HTMLElement>('[data-animate="stagger"]').forEach((container) => {
    const children = container.querySelectorAll('[data-animate-child]')
    gsap.fromTo(
      children,
      {
        opacity: 0,
        y: 30,
        scale: 0.97,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.08,
        scrollTrigger: {
          trigger: container,
          start: 'top 85%',
          once: true,
        },
      }
    )
  })

  gsap.utils.toArray<HTMLElement>('[data-animate="counter"]').forEach((el) => {
    const target = parseInt(el.getAttribute('data-value') || '0')
    const suffix = el.getAttribute('data-suffix') || ''

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.fromTo(
          { val: 0 },
          { val: 0 },
          {
            val: target,
            duration: 1.2,
            ease: 'power2.out',
            onUpdate: function () {
              el.textContent = Math.round(this.targets()[0].val) + suffix
            },
          }
        )
      },
    })
  })

  gsap.utils.toArray<HTMLElement>('[data-animate="logos"]').forEach((container) => {
    const logos = container.querySelectorAll('[data-logo]')
    gsap.fromTo(
      logos,
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.12,
        scrollTrigger: {
          trigger: container,
          start: 'top 88%',
          once: true,
        },
      }
    )
  })
}

/**
 * Hero parallax — subtle depth effect
 */
export function initHeroParallax() {
  if (prefersReducedMotion) return

  const hero = document.querySelector('[data-hero]') as HTMLElement
  if (!hero) return

  const heroContent = hero.querySelector('[data-hero-content]') as HTMLElement
  const heroBg = hero.querySelector('[data-hero-bg]') as HTMLElement

  if (heroContent) {
    gsap.to(heroContent, {
      y: -40,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5,
      },
    })
  }

  if (heroBg) {
    gsap.to(heroBg, {
      y: 60,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 2,
      },
    })
  }
}

/**
 * Navbar scroll behavior
 * Adds blur and slight background change on scroll
 */
export function initNavbar() {
  const header = document.querySelector('header') as HTMLElement
  if (!header) return

  let isScrolled = false

  ScrollTrigger.create({
    start: 'top -80px',
    onUpdate: (self) => {
      const scrolled = self.scroll() > 80
      if (scrolled !== isScrolled) {
        isScrolled = scrolled
        if (scrolled) {
          gsap.to(header, {
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 1px 0 rgba(0,0,0,0.08)',
            duration: 0.3,
            ease: 'power2.out',
          })
        } else {
          gsap.to(header, {
            backgroundColor: 'rgba(255, 255, 255, 1)',
            backdropFilter: 'blur(0px)',
            boxShadow: 'none',
            duration: 0.3,
            ease: 'power2.out',
          })
        }
      }
    },
  })
}

/**
 * Initialize all animations
 */
export function initAnimations() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
}

function init() {
  initSmoothScroll()
  initSectionAnimations()
  initHeroParallax()
  initNavbar()
}
