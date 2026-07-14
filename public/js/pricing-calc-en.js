// Engagement calculator — pricing.astro
;(function () {
  const needEl = document.getElementById('calc-need')
  const reposEl = document.getElementById('calc-repos')
  const planEl = document.getElementById('calc-plan')
  const ctaEl = document.getElementById('calc-cta')

  const recommendations = {
    'audit-1': { plan: 'Infrastructure Audit — Free', cta: 'Start free audit →', href: '/audit' },
    'audit-2-5': { plan: 'Infrastructure Audit — Free (all repos)', cta: 'Start free audit →', href: '/audit' },
    'audit-6+': { plan: 'Platform Retainer — €699/month (unlimited scans)', cta: 'View retainer →', href: '/pricing#retainer' },
    'cicd-1': { plan: 'Engineering Project — from €800', cta: 'View project pricing →', href: '/pricing' },
    'cicd-2-5': { plan: 'Engineering Project — from €1.000', cta: 'View project pricing →', href: '/pricing' },
    'cicd-6+': { plan: 'Platform Retainer — €699/month', cta: 'View retainer →', href: '/pricing#retainer' },
    'aws-1': { plan: 'Engineering Project — €1.500-3.000', cta: 'View project pricing →', href: '/pricing' },
    'aws-2-5': { plan: 'Engineering Project — €1.500-3.000', cta: 'View project pricing →', href: '/pricing' },
    'aws-6+': { plan: 'Platform Retainer — €699/month', cta: 'View retainer →', href: '/pricing#retainer' },
    'k8s-1': { plan: 'Engineering Project — €2.000-4.000', cta: 'View project pricing →', href: '/pricing' },
    'k8s-2-5': { plan: 'Engineering Project — €2.000-4.000', cta: 'View project pricing →', href: '/pricing' },
    'k8s-6+': { plan: 'Platform Retainer — €699/month', cta: 'View retainer →', href: '/pricing#retainer' },
    'ongoing-1': { plan: 'Platform Retainer — €699/month', cta: 'View retainer →', href: '/pricing#retainer' },
    'ongoing-2-5': { plan: 'Platform Retainer — €699/month', cta: 'View retainer →', href: '/pricing#retainer' },
    'ongoing-6+': { plan: 'Platform Retainer — €699/month', cta: 'View retainer →', href: '/pricing#retainer' },
  }

  function update() {
    const key = `${needEl.value}-${reposEl.value}`
    const rec = recommendations[key] || recommendations['audit-1']
    if (planEl) planEl.textContent = rec.plan
    if (ctaEl) {
      ctaEl.textContent = rec.cta
      ctaEl.href = rec.href
    }
  }

  needEl?.addEventListener('change', update)
  reposEl?.addEventListener('change', update)
  update()
})()
