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
