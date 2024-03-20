import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'

test('sign up', async ({ page }) => {
  const user = {
    email: faker.internet.email(),
    password: faker.internet.password({ prefix: 'aA1' }),
  }
  await page.goto('/')

  await page.getByRole('link', { name: /signup/i }).click()

  // Fill out the form
  await page.getByRole('textbox', { name: /email/i }).fill(user.email)
  await page.getByRole('textbox', { name: /password/i }).fill(user.password)
  await page.getByRole('button', { name: /sign up/i }).click()

  // Check that the user is redirected to the home page
  await expect(page.getByRole('link', { name: /login/i })).toBeVisible()
  // await expect(
  //   page.getByRole('button', { name: /create new board/i }),
  // ).toBeVisible()
})
