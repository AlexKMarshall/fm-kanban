import { Page } from '@playwright/test'

import { makeBoard } from 'tests/factories/board'

import { expect, test } from '../playwright-utils'

class KanbanPageObject {
  constructor(private page: Page) {}

  #isSmallScreen() {
    const viewportWidth = this.page.viewportSize()?.width
    if (!viewportWidth) {
      throw new Error('Viewport width is not set')
    }

    // Ideally we'd get this from the tailwind config somehow
    return viewportWidth < 640
  }

  async gotoHome() {
    await this.page.goto('/')
  }

  async openCreateBoardDialog() {
    // On small screens, the create board button is nested inside the select a board mobile nav dialog
    if (this.#isSmallScreen()) {
      await this.page.getByRole('button', { name: /select a board/i }).click()
    }
    await this.page.getByRole('button', { name: /create new board/i }).click()

    return this.page.getByRole('dialog', { name: /add new board/i })
  }
}

test('create board', { tag: '@mobile-ready' }, async ({ page, login }) => {
  const board = makeBoard()
  await login()

  const kanbanPage = new KanbanPageObject(page)

  await kanbanPage.gotoHome()

  const createBoardDialog = await kanbanPage.openCreateBoardDialog()

  // const createBoardDialog = page.getByRole('dialog').filter({
  //   has: page.getByRole('button', { name: /create new board/i }),
  // })

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

test(
  'create board with no columns',
  { tag: '@mobile-ready' },
  async ({ page, login }) => {
    const boardWithoutColumns = makeBoard({ columns: [] })
    await login()
    const kanbanPage = new KanbanPageObject(page)

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
  async ({ page, login }) => {
    await login()

    const kanbanPage = new KanbanPageObject(page)

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
