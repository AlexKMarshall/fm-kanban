import { expect, test } from '../playwright-utils'

test('App loads', { tag: '@mobile-ready' }, async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /kanban app/i })).toBeVisible()
})
