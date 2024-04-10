import { expect, test } from '../playwright-utils'

test('Login flow', { tag: '@mobile-ready' }, async ({ page, signUp }) => {
  const { email, password } = await signUp()

  await page.goto('/')
  await page.getByRole('link', { name: /login/i }).click()

  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.getByRole('textbox', { name: /password/i }).fill(password)
  await page.getByRole('button', { name: /login/i }).click()

  await expect(page.getByText(/please select or create a board/i)).toBeVisible()
})
