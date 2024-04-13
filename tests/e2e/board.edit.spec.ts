import { faker } from '@faker-js/faker'

import { makeColumn, makeTask } from 'tests/factories/board'

import { expect, test } from '../playwright-utils'

test(
  'edit board title',
  { tag: '@mobile-ready' },
  async ({ page, kanbanPage, createBoard }) => {
    const board = await createBoard()
    const originalName = board.name

    const boardPage = await kanbanPage.gotoBoard(originalName)

    await expect(
      page.getByRole('heading', { name: originalName }),
    ).toBeVisible()

    const editBoardDialog = await boardPage.openEditBoardDialog()

    await expect(editBoardDialog).toBeVisible()

    const newName = faker.lorem.words()
    await editBoardDialog.getByRole('textbox', { name: /^name/i }).fill(newName)
    await editBoardDialog.getByRole('button', { name: /save changes/i }).click()

    await expect(editBoardDialog).toBeHidden()
    await expect(page.getByRole('heading', { name: newName })).toBeVisible()

    const boardNav = await kanbanPage.getBoardNav()

    await expect(
      boardNav.getByRole('link', { name: originalName }),
    ).toBeHidden()
    await expect(boardNav.getByRole('link', { name: newName })).toBeVisible()
  },
)

test(
  'add a column',
  { tag: '@mobile-ready' },
  async ({ page, kanbanPage, createBoard }) => {
    const board = await createBoard()

    const boardPage = await kanbanPage.gotoBoard(board.name)

    const editBoardDialog = await boardPage.openEditBoardDialog()
    await expect(editBoardDialog).toBeVisible()

    await editBoardDialog
      .getByRole('button', { name: /add new column/i })
      .click()

    const newColumnName = faker.lorem.words()
    await editBoardDialog
      .getByRole('textbox', { name: /column name/i })
      .last()
      .fill(newColumnName)
    await editBoardDialog.getByRole('button', { name: /save changes/i }).click()

    await expect(editBoardDialog).toBeHidden()

    await expect(
      page.getByRole('heading', { name: newColumnName }),
    ).toBeVisible()
  },
)

test(
  'update existing column name',
  { tag: '@mobile-ready' },
  async ({ page, createBoard, createTasks, kanbanPage }) => {
    const column = makeColumn()
    const board = await createBoard({ columns: [column] })
    const task = makeTask()
    await createTasks({ boardId: board.id, columnId: column.id, ...task })

    const boardPage = await kanbanPage.gotoBoard(board.name)

    // Task is in the column with the original name
    await expect(
      page
        .getByRole('listitem')
        .filter({ has: page.getByRole('heading', { name: column.name }) })
        .getByRole('listitem')
        .filter({ has: page.getByRole('heading', { name: task.title }) }),
    ).toBeVisible()

    const editBoardDialog = await boardPage.openEditBoardDialog()
    await expect(editBoardDialog).toBeVisible()

    // Update the name
    const newColumnName = faker.lorem.words()
    await editBoardDialog
      .getByRole('textbox', { name: /column name/i })
      .fill(newColumnName)
    await editBoardDialog.getByRole('button', { name: /save changes/i }).click()

    await expect(editBoardDialog).toBeHidden()

    // Task is still visible, in column with new name
    await expect(
      page
        .getByRole('listitem')
        .filter({ has: page.getByRole('heading', { name: newColumnName }) })
        .getByRole('listitem')
        .filter({ has: page.getByRole('heading', { name: task.title }) }),
    ).toBeVisible()
  },
)

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
