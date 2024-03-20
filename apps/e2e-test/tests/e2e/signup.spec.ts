import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'

test('Sign up', async ({ page }) => {
  const user = {
    email: faker.internet.email(),
    password: faker.internet.password({ prefix: 'a1' }),
  }
  await page.goto('/')
  await page.getByRole('link', { name: /signup/i }).click()
  await page.getByRole('textbox', { name: /email/i }).fill(user.email)
  await page.getByRole('textbox', { name: /password/i }).fill(user.password)
  await page.getByRole('button', { name: /sign up/i }).click()

  await expect(
    page.getByRole('button', { name: /create new board/i }),
  ).toBeVisible()
})
