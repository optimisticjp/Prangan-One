import { expect, test } from '@playwright/test'

test('a visitor can create and edit a quotation without signing in', async ({ page }) => {
  await page.goto('/tools/quote')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('textbox', { name: 'આપના વ્યવસાયનું નામ' }).fill('Alpha Repairs')
  await page.getByRole('textbox', { name: 'ગ્રાહકનું નામ' }).fill('Ravi')
  await page.getByRole('textbox', { name: 'સેવા / કામ' }).fill('AC servicing')
  await page.getByRole('textbox', { name: 'કામની વિગતો (વૈકલ્પિક)' }).fill('Three AC units')
  await page.getByRole('spinbutton', { name: 'કુલ કિંમત (INR)' }).fill('4500')
  await page.getByRole('button', { name: 'ડ્રાફ્ટ બનાવો' }).click()
  const draft = page.getByTestId('quote-preview')
  await expect(draft).toHaveValue(/Alpha Repairs/)
  await expect(draft).toHaveValue(/₹/)
  await draft.fill('Edited quotation')
  await expect(draft).toHaveValue('Edited quotation')
  await expect(page.getByText(/Claude હાલમાં ચાલુ નથી/)).toBeVisible()
})
