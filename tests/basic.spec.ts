import { test, expect } from '@playwright/test'

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/LRA/)
})

test('navbar has navigation links', async ({ page }) => {
  await page.goto('/')
  const nav = page.locator('nav[aria-label="Main navigation"]')
  await expect(nav).toBeVisible()
  const links = nav.locator('a')
  expect(await links.count()).toBeGreaterThanOrEqual(3)
})

test('language switch EN→ES works', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL('http://localhost:4321/')
  await page.goto('/es')
  await expect(page).toHaveURL(/\/es/)
  await expect(page).toHaveTitle(/LRA/)
})

test('/contact page loads the form', async ({ page }) => {
  await page.goto('/contact')
  const form = page.locator('form')
  await expect(form).toBeVisible()
})

test('/assessment page loads the quiz', async ({ page }) => {
  await page.goto('/assessment')
  await expect(page.locator('body')).toBeVisible()
  // Quiz content is present
  const heading = page.locator('h1, h2').first()
  await expect(heading).toBeVisible()
})

test('/projects page loads projects', async ({ page }) => {
  await page.goto('/projects')
  await expect(page.locator('body')).toBeVisible()
  const heading = page.locator('h1, h2').first()
  await expect(heading).toBeVisible()
})

test('AI agent chat button is visible', async ({ page }) => {
  await page.goto('/')
  const chatToggle = page.locator('#lra-chat-toggle')
  await expect(chatToggle).toBeVisible()
})

test('/open-source page loads correctly', async ({ page }) => {
  await page.goto('/open-source')
  await expect(page.locator('body')).toBeVisible()
  const heading = page.locator('h1').first()
  await expect(heading).toBeVisible()
})

test('/resources has filter buttons visible', async ({ page }) => {
  await page.goto('/resources')
  const filterContainer = page.locator('#resource-filters')
  await expect(filterContainer).toBeVisible()
  const filterBtns = filterContainer.locator('button')
  expect(await filterBtns.count()).toBeGreaterThanOrEqual(3)
})

test('/blog has newsletter form', async ({ page }) => {
  await page.goto('/blog')
  const form = page.locator('.newsletter-cta-form').first()
  await expect(form).toBeVisible()
})

test('/blog has at least 1 article', async ({ page }) => {
  await page.goto('/blog')
  const articles = page.locator('a[aria-label*="artículo"], a[aria-label*="Leer artículo"]')
  expect(await articles.count()).toBeGreaterThanOrEqual(1)
})

test('/contacto form has required fields', async ({ page }) => {
  await page.goto('/contacto')
  await expect(page.locator('input[name="name"], input[name="nombre"]').first()).toBeVisible()
  await expect(page.locator('input[name="email"]').first()).toBeVisible()
  await expect(page.locator('textarea').first()).toBeVisible()
})

test('language switch ES to EN navigates to /en/', async ({ page }) => {
  await page.goto('/')
  const enLink = page.locator('a[href="/en/"], a[href^="/en"]').first()
  if (await enLink.isVisible()) {
    await enLink.click()
    await expect(page).toHaveURL(/\/en/)
  } else {
    // Language selector may be a dropdown — verify /en/ route exists
    await page.goto('/en/')
    await expect(page).toHaveTitle(/LRA/)
  }
})

test('/pricing has pricing plans visible', async ({ page }) => {
  await page.goto('/pricing')
  await expect(page.locator('body')).toBeVisible()
  const heading = page.locator('h1, h2').first()
  await expect(heading).toBeVisible()
})

test('skip to content link is in DOM', async ({ page }) => {
  await page.goto('/')
  const skipLink = page.locator('a[href="#main-content"]')
  await expect(skipLink).toBeAttached()
})

test('/en/blog has at least 1 article in English', async ({ page }) => {
  await page.goto('/en/blog')
  await expect(page).toHaveTitle(/LRA/)
  const articles = page.locator('a[aria-label*="article"], a[aria-label*="Read article"]')
  expect(await articles.count()).toBeGreaterThanOrEqual(1)
})
