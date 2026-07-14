// Calculadora de servicio — es/precios.astro
;(function () {
  const needEl = document.getElementById('calc-need')
  const reposEl = document.getElementById('calc-repos')
  const planEl = document.getElementById('calc-plan')
  const ctaEl = document.getElementById('calc-cta')

  const recommendations = {
    'audit-1': { plan: 'Auditoría de Infraestructura — Gratis', cta: 'Empezar auditoría gratuita →', href: '/es/auditoria' },
    'audit-2-5': { plan: 'Auditoría de Infraestructura — Gratis (todos los repos)', cta: 'Empezar auditoría gratuita →', href: '/es/auditoria' },
    'audit-6+': { plan: 'Retención de Plataforma — €699/mes (escaneos ilimitados)', cta: 'Ver retención →', href: '/es/precios#retainer' },
    'cicd-1': { plan: 'Proyecto de Ingeniería — desde €800', cta: 'Ver precios de proyecto →', href: '/es/precios' },
    'cicd-2-5': { plan: 'Proyecto de Ingeniería — desde €1.000', cta: 'Ver precios de proyecto →', href: '/es/precios' },
    'cicd-6+': { plan: 'Retención de Plataforma — €699/mes', cta: 'Ver retención →', href: '/es/precios#retainer' },
    'aws-1': { plan: 'Proyecto de Ingeniería — €1.500-3.000', cta: 'Ver precios de proyecto →', href: '/es/precios' },
    'aws-2-5': { plan: 'Proyecto de Ingeniería — €1.500-3.000', cta: 'Ver precios de proyecto →', href: '/es/precios' },
    'aws-6+': { plan: 'Retención de Plataforma — €699/mes', cta: 'Ver retención →', href: '/es/precios#retainer' },
    'k8s-1': { plan: 'Proyecto de Ingeniería — €2.000-4.000', cta: 'Ver precios de proyecto →', href: '/es/precios' },
    'k8s-2-5': { plan: 'Proyecto de Ingeniería — €2.000-4.000', cta: 'Ver precios de proyecto →', href: '/es/precios' },
    'k8s-6+': { plan: 'Retención de Plataforma — €699/mes', cta: 'Ver retención →', href: '/es/precios#retainer' },
    'ongoing-1': { plan: 'Retención de Plataforma — €699/mes', cta: 'Ver retención →', href: '/es/precios#retainer' },
    'ongoing-2-5': { plan: 'Retención de Plataforma — €699/mes', cta: 'Ver retención →', href: '/es/precios#retainer' },
    'ongoing-6+': { plan: 'Retención de Plataforma — €699/mes', cta: 'Ver retención →', href: '/es/precios#retainer' },
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
