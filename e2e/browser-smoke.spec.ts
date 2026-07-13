import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
})

test.describe('public homepage', () => {
  test('defaults to Gujarati and presents the primary demo conversion path', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('lang', 'gu')
    await expect(page.getByRole('heading', { level: 1, name: /હાઉસિંગ સોસાયટી.*કમિટી ડેશબોર્ડ/i })).toBeVisible()

    const demoActions = page.getByRole('link', { name: /ડેમો ખોલો/i })
    await expect(demoActions).toHaveCount(1)
    await expect(demoActions.first()).toHaveAttribute('href', '/demo')
    await expect(page.getByRole('link', { name: /લોગિન/i }).first()).toBeVisible()

    await expect(page.getByRole('heading', { name: /કમિટી માટે કંટ્રોલ/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /કેવી રીતે ચાલે છે/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /વાસ્તવિક અપેક્ષા/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /ખરેખર જે વપરાય/i })).toBeVisible()
  })

  test('switches to English and persists the public language preference', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'EN' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1, name: /Run your housing society from one clear committee dashboard/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Open the demo/i })).toHaveAttribute('href', '/demo')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1, name: /Run your housing society from one clear committee dashboard/i })).toBeVisible()
  })

  test('supports the mobile menu without horizontal page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/')

    const menuButton = page.getByRole('button', { name: /મેનુ ખોલો/i })
    const menuToggle = page.locator('button[aria-controls]').first()
    await menuButton.click()
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('link', { name: /લોગિન/i }).first()).toBeVisible()
    await expect(page.getByRole('banner').getByRole('link', { name: /^ડેમો$/i })).toBeVisible()
    await expect(page.getByRole('banner').getByRole('link', { name: /કિંમત/i })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'false')

    await menuButton.click()
    await page.getByRole('banner').getByRole('link', { name: /^ડેમો$/i }).click()
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
    await expect(page.getByLabel('ફ્લેટ પસંદ કરો')).toHaveValue('demo-flat-101')
    await page.getByRole('button', { name: /શરૂ કરો/i }).click()

    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByText(/ડેમો સોસાયટી/).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /નમસ્તે/i })).toBeVisible()
    await expect(page.getByText(/બાકી રકમ|તમારી ક્રેડિટ/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /રસીદ જુઓ/i })).toBeVisible()
  })
})
