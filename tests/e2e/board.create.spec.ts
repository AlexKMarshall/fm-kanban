import { makeBoard } from 'tests/factories/board'

import { expect, test } from '../playwright-utils'

test(
  'create board',
  { tag: '@mobile-ready' },
  async ({ kanbanPage, page, login }) => {
    const board = makeBoard()
    await login()

    await kanbanPage.gotoHome()

    const createBoardDialog = await kanbanPage.openCreateBoardDialog()

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
      await expect(
        page.getByRole('heading', { name: column.name }),
      ).toBeVisible()
    }
  },
)

test(
  'create board with no columns',
  { tag: '@mobile-ready' },
  async ({ page, kanbanPage, login }) => {
    const boardWithoutColumns = makeBoard({ columns: [] })
    await login()

    await kanbanPage.gotoHome()
    const createBoardDialog = await kanbanPage.openCreateBoardDialog()

    await createBoardDialog
      .getByRole('textbox', { name: /^name/i })
      .fill(boardWithoutColumns.name)

    await createBoardDialog
      .getByRole('button', { name: /create new board/i })
      .click()

    await expect(
      page.getByRole('heading', { name: boardWithoutColumns.name }),
    ).toBeVisible()
  },
)

test(
  'board name is required',
  { tag: '@mobile-ready' },
  async ({ login, kanbanPage }) => {
    await login()

    await kanbanPage.gotoHome()
    const createBoardDialog = await kanbanPage.openCreateBoardDialog()

    await createBoardDialog
      .getByRole('button', { name: /create new board/i })
      .click()

    const nameField = createBoardDialog.getByRole('textbox', { name: /^name/i })
    await expect(nameField).toBeAriaInvalid()
    await expect(nameField).toBeDescribedBy("Can't be empty")
  },
)
