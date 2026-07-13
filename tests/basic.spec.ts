import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const BASE_URL = 'http://localhost:4321'

test.describe('LRA CloudOps — Core pages', () => {

  test('Home EN — loads and has correct title', async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(page).toHaveTitle(/LRA CloudOps/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Home ES — loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/es/`)
    await expect(page).toHaveTitle(/LRA CloudOps/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Projects page — loads and shows projects', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects`)
    await expect(page).toHaveTitle(/LRA CloudOps/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Services page — loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/services`)
    await expect(page).toHaveTitle(/LRA CloudOps/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Pricing page — loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`)
    await expect(page).toHaveTitle(/LRA CloudOps/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Audit page — loads and has form', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`)
    await expect(page).toHaveTitle(/LRA CloudOps/)
    await expect(page.locator('form')).toBeVisible()
    await expect(page.locator('input[name="github_repo"]')).toBeVisible()
  })

  test('About page — loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/about`)
    await expect(page).toHaveTitle(/LRA CloudOps/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Contact page — loads and has form', async ({ page }) => {
    await page.goto(`${BASE_URL}/contact`)
    await expect(page).toHaveTitle(/LRA CloudOps/)
    await expect(page.locator('form')).toBeVisible()
  })

  test('Open Source page — loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/open-source`)
    await expect(page).toHaveTitle(/LRA CloudOps/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Case Studies page — loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/case-studies`)
    await expect(page).toHaveTitle(/LRA CloudOps/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Privacy Policy — loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`)
    await expect(page).toHaveTitle(/LRA CloudOps/)
  })

  test('Terms of Service — loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/terms`)
    await expect(page).toHaveTitle(/LRA CloudOps/)
  })

  test('404 page — shows error page', async ({ page }) => {
    await page.goto(`${BASE_URL}/nonexistent-page-xyz`)
    await expect(page.locator('body')).toBeVisible()
  })

  test('Chat widget — toggle button exists', async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(page.locator('#chat-toggle')).toBeVisible()
  })

  test('Navigation — all main links work', async ({ page }) => {
    await page.goto(BASE_URL)
    const navLinks = ['/projects', '/services', '/pricing', '/about']
    for (const link of navLinks) {
      const response = await page.request.get(`${BASE_URL}${link}`)
      expect(response.status()).toBe(200)
    }
  })
})

test.describe('Accessibility — WCAG AA', () => {

  test('Home — no critical accessibility violations', async ({ page }) => {
    await page.goto(BASE_URL)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(critical).toHaveLength(0)
  })

  test('Audit page — no critical accessibility violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(critical).toHaveLength(0)
  })

  test('Services page — no critical accessibility violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/services`)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(critical).toHaveLength(0)
  })

})
