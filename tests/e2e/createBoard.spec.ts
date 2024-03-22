import { makeBoard } from 'tests/factories/board'

import { expect, test } from '../playwright-utils'

test('create board', async ({ page, login }) => {
  const board = makeBoard()
  await login()

  await page.goto('/')

  await page.getByRole('button', { name: /create new board/i }).click()
  const createBoardForm = page.getByRole('form').filter({
    has: page.getByRole('button', { name: /create new board/i }),
  })

  await createBoardForm
    .getByRole('textbox', { name: /^name/i })
    .fill(board.name)

  for (let i = 0; i < board.columns.length; i++) {
    const column = board.columns[i]
    if (i > 0) {
      await createBoardForm
        .getByRole('button', { name: /add new column/i })
        .click()
    }
    await createBoardForm
      .getByRole('textbox', { name: /column name/i })
      .last()
      .fill(column.name)
  }

  await createBoardForm
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
  const createBoardForm = page.getByRole('form').filter({
    has: page.getByRole('button', { name: /create new board/i }),
  })

  await createBoardForm
    .getByRole('textbox', { name: /^name/i })
    .fill(boardWithoutColumns.name)

  await createBoardForm
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
  const createBoardForm = page.getByRole('form').filter({
    has: page.getByRole('button', { name: /create new board/i }),
  })

  await createBoardForm
    .getByRole('button', { name: /create new board/i })
    .click()

  const nameField = createBoardForm.getByRole('textbox', { name: /^name/i })
  await expect(nameField).toHaveAttribute('aria-invalid', 'true')
  const describedById = await nameField.getAttribute('aria-describedby')
  if (!describedById) throw new Error('aria-describedby is not set')
  const errorMessage = page.locator(`#${describedById}`)
  await expect(errorMessage).toBeVisible()
  await expect(errorMessage).toHaveText("Can't be empty")
})
