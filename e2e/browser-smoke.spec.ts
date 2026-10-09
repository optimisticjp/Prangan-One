import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
})

test.describe('public homepage', () => {
  test('defaults to Gujarati and presents the early-access conversion path', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('lang', 'gu')
    await expect(page.getByRole('heading', { level: 1, name: /ઓછું કાગળકામ.*વધુ વ્યવસાય/i })).toBeVisible()

    const demoActions = page.getByRole('link', { name: /અર્લી એક્સેસ માટે સંપર્ક કરો/i })
    await expect(demoActions).toHaveCount(1)
    await expect(demoActions.first()).toHaveAttribute('href', '/contact')
    await expect(page.getByRole('link', { name: /અર્લી એક્સેસ/i }).first()).toBeVisible()

    await expect(page.getByRole('heading', { name: /ગ્રાહકના મેસેજથી તૈયાર ક્વોટેશન સુધી/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /સૌપ્રથમ બનાવવાના ટૂલ્સ/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /નાના વ્યવસાયની રોજની જરૂરિયાત/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /એક ઉપયોગી કામથી શરૂઆત/i })).toBeVisible()
  })

  test('switches to English and persists the public language preference', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'EN' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1, name: /Less busywork. More business./i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Join early access/i })).toHaveAttribute('href', '/contact')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1, name: /Less busywork. More business./i })).toBeVisible()
  })

  test('supports the mobile menu without horizontal page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/')

    const menuButton = page.getByRole('button', { name: /મેનુ ખોલો/i })
    const menuToggle = page.locator('button[aria-controls]').first()
    await menuButton.click()
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('link', { name: /સોસાયટી લોગિન/i }).first()).toBeVisible()
    await expect(page.getByRole('banner').getByRole('link', { name: /હાલનો સોસાયટી ડેમો/i })).toBeVisible()
    await expect(page.getByRole('banner').getByRole('link', { name: /કિંમત/i })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'false')

    await menuButton.click()
    await page.getByRole('banner').getByRole('link', { name: /હાલનો સોસાયટી ડેમો/i }).click()
    await expect(page).toHaveURL(/\/demo$/)

    await page.goto('/')
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(hasOverflow).toBe(false)
  })
})

test.describe('demo journeys', () => {
  test('opens the committee maintenance collection journey in the admin demo', async ({ page }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /મેન્ટેનન્સ ઝડપથી ઉઘરાવો/i }).click()

    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByText(/ડેમો સોસાયટી/).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /કમિટી ડેશબોર્ડ/i })).toBeVisible()
    await expect(page.getByText(/કુલ બાકી/i)).toBeVisible()
  })

  test('starts a resident demo for a seeded flat', async ({ page }) => {
    await page.goto('/demo')
    const flatSelect = page.getByLabel('ફ્લેટ પસંદ કરો')
    await expect(flatSelect).toHaveValue(/\S+/)
    await expect(flatSelect.locator('option:checked')).toContainText(/ફ્લેટ/)
    await page.getByRole('button', { name: /શરૂ કરો/i }).click()

    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByText(/ડેમો સોસાયટી/).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /નમસ્તે/i })).toBeVisible()
    await expect(page.getByText(/બાકી રકમ|તમારી ક્રેડિટ/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /રસીદ જુઓ/i })).toBeVisible()
  })
})
