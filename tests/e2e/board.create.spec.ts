import { makeBoard } from 'tests/factories/board'

import { expect, test } from '../playwright-utils'

test('create board', async ({ page, login }) => {
  const board = makeBoard()
  await login()

  await page.goto('/')

  await page.getByRole('button', { name: /create new board/i }).click()
  const createBoardDialog = page.getByRole('dialog').filter({
    has: page.getByRole('button', { name: /create new board/i }),
  })

  await createBoardDialog
    .getByRole('textbox', { name: /^name/i })
    .fill(board.name)

  for (let i = 0; i < board.columns.length; i++) {
    const column = board.columns[i]
    if (i > 0) {
      await createBoardDialog
        .getByRole('button', { name: /add new column/i })
        .click()
    }
    await createBoardDialog
      .getByRole('textbox', { name: /column name/i })
      .last()
      .fill(column.name)
  }

  await createBoardDialog
    .getByRole('button', { name: /create new board/i })
    .click()

  await expect(page.getByRole('heading', { name: board.name })).toBeVisible()
  for (const column of board.columns) {
    await expect(page.getByRole('heading', { name: column.name })).toBeVisible()
  }
})

test('create board with no columns', async ({ page, login }) => {
  const boardWithoutColumns = makeBoard({ columns: [] })
  await login()

  await page.goto('/')
  await page.getByRole('button', { name: /create new board/i }).click()
  const createBoardDialog = page.getByRole('dialog').filter({
    has: page.getByRole('button', { name: /create new board/i }),
  })

  await createBoardDialog
    .getByRole('textbox', { name: /^name/i })
    .fill(boardWithoutColumns.name)

  await createBoardDialog
    .getByRole('button', { name: /create new board/i })
    .click()

  await expect(
    page.getByRole('heading', { name: boardWithoutColumns.name }),
  ).toBeVisible()
})

test('board name is required', async ({ page, login }) => {
  await login()

  await page.goto('/')
  await page.getByRole('button', { name: /create new board/i }).click()
  const createBoardDialog = page.getByRole('dialog').filter({
    has: page.getByRole('button', { name: /create new board/i }),
  })

  await createBoardDialog
    .getByRole('button', { name: /create new board/i })
    .click()

  const nameField = createBoardDialog.getByRole('textbox', { name: /^name/i })
  await expect(nameField).toBeAriaInvalid()
  await expect(nameField).toBeDescribedBy("Can't be empty")
})
