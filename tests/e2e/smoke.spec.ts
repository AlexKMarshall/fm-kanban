import { expect, test } from '../playwright-utils'

test('App loads', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /kanban app/i })).toBeVisible()
})
