import { faker } from '@faker-js/faker'

import { makeColumn, makeTask } from 'tests/factories/board'

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

test('add a column', async ({ page, createBoard }) => {
  const board = await createBoard()

  await page.goto('/')
  await page.getByRole('link', { name: board.name }).click()

  await page.getByRole('button', { name: /board menu/i }).click()
  await page.getByRole('menuitem', { name: /edit board/i }).click()

  const dialog = page.getByRole('dialog', { name: /edit board/i })
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: /add new column/i }).click()

  const newColumnName = faker.lorem.words()
  await dialog
    .getByRole('textbox', { name: /column name/i })
    .last()
    .fill(newColumnName)
  await dialog.getByRole('button', { name: /save changes/i }).click()

  await expect(dialog).toBeHidden()

  await expect(page.getByRole('heading', { name: newColumnName })).toBeVisible()
})

test('update existing column name', async ({
  page,
  createBoard,
  createTasks,
}) => {
  const column = makeColumn()
  const board = await createBoard({ columns: [column] })
  const task = makeTask()
  await createTasks({ boardId: board.id, columnId: column.id, ...task })

  await page.goto('/')
  await page.getByRole('link', { name: board.name }).click()

  // Task is in the column with the original name
  await expect(
    page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: column.name }) })
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: task.title }) }),
  ).toBeVisible()

  await page.getByRole('button', { name: /board menu/i }).click()
  await page.getByRole('menuitem', { name: /edit board/i }).click()

  const dialog = page.getByRole('dialog', { name: /edit board/i })
  await expect(dialog).toBeVisible()

  // Update the name
  const newColumnName = faker.lorem.words()
  await dialog
    .getByRole('textbox', { name: /column name/i })
    .fill(newColumnName)
  await dialog.getByRole('button', { name: /save changes/i }).click()

  await expect(dialog).toBeHidden()

  // Task is still visible, in column with new name
  await expect(
    page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: newColumnName }) })
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: task.title }) }),
  ).toBeVisible()
})

test('remove a column', async ({ page, createBoard, createTasks }) => {
  // Deleting a column also deletes any tasks inside it
  const column = makeColumn()
  const board = await createBoard({ columns: [column] })
  const task = makeTask()
  await createTasks({ boardId: board.id, columnId: column.id, ...task })

  await page.goto('/')
  await page.getByRole('link', { name: board.name }).click()

  // Task is in the column
  await expect(
    page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: column.name }) })
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: task.title }) }),
  ).toBeVisible()

  await page.getByRole('button', { name: /board menu/i }).click()
  await page.getByRole('menuitem', { name: /edit board/i }).click()

  const dialog = page.getByRole('dialog', { name: /edit board/i })
  await expect(dialog).toBeVisible()

  // Remove the column
  await dialog.getByRole('button', { name: /remove/i }).click()

  await dialog.getByRole('button', { name: /save changes/i }).click()

  await expect(dialog).toBeHidden()

  // Column is no longer visible
  await expect(page.getByRole('heading', { name: column.name })).toBeHidden()
  // Task is no longer visible
  await expect(page.getByRole('heading', { name: task.title })).toBeHidden()
})
