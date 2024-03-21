import { faker } from '@faker-js/faker'

import { expect, test } from '../playwright-utils'

type User = {
  email: string
  password: string
}
function makeUser(overrides?: Partial<User>): User {
  return {
    email: faker.internet.email(),
    password: faker.internet.password(),
    ...overrides,
  }
}

test('Sign up flow', async ({ page }) => {
  await page.goto('/')
  const user = makeUser()

  await page.getByRole('link', { name: /signup/i }).click()
  await page.getByRole('textbox', { name: /email/i }).fill(user.email)
  await page.getByRole('textbox', { name: /password/i }).fill(user.password)
  await page.getByRole('button', { name: /sign up/i }).click()

  await expect(
    page.getByRole('button', { name: /create new board/i }),
  ).toBeVisible()
})
