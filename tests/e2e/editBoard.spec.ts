import { faker } from '@faker-js/faker'

import { expect, test } from '../playwright-utils'

test('edit board title', async ({ page, createBoard }) => {
  const board = await createBoard()

  await page.goto('/')
  await page.getByRole('link', { name: board.name }).click()

  await expect(page.getByRole('heading', { name: board.name })).toBeVisible()

  await page.getByRole('button', { name: /board menu/i }).click()
  await page.getByRole('menuitem', { name: /edit board/i }).click()

  const dialog = page.getByRole('dialog', { name: /edit board/i })
  await expect(dialog).toBeVisible()

  const newName = faker.lorem.words()
  await dialog.getByRole('textbox', { name: /^name/i }).fill(newName)
  await dialog.getByRole('button', { name: /save changes/i }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByRole('link', { name: newName })).toBeVisible()
  await expect(page.getByRole('heading', { name: newName })).toBeVisible()
  await expect(page.getByRole('link', { name: board.name })).toBeHidden()
})
