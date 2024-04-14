import { makeBoard } from 'tests/factories/board'

import { expect, test } from '../playwright-utils'

test('create board', async ({ kanbanPage, login }) => {
  const board = makeBoard()
  await login()

  await kanbanPage.gotoHome()

  const createBoardDialog = await kanbanPage.openCreateBoardDialog()

  await createBoardDialog.nameField.fill(board.name)

  for (let i = 0; i < board.columns.length; i++) {
    const column = board.columns[i]
    if (i > 0) {
      await createBoardDialog.addNewColumn()
    }
    await createBoardDialog.columnFields.last().fill(column.name)
  }

  const boardPage = await createBoardDialog.save()

  await expect(boardPage.getBoardHeading(board.name)).toBeVisible()
  for (const column of board.columns) {
    await expect(boardPage.getColumn(column.name)).toBeVisible()
  }
})

test('create board with no columns', async ({ kanbanPage, login }) => {
  const boardWithoutColumns = makeBoard({ columns: [] })
  await login()

  await kanbanPage.gotoHome()
  const createBoardDialog = await kanbanPage.openCreateBoardDialog()

  await createBoardDialog.nameField.fill(boardWithoutColumns.name)

  const boardPage = await createBoardDialog.save()

  await expect(
    boardPage.getBoardHeading(boardWithoutColumns.name),
  ).toBeVisible()
})

test('board name is required', async ({ login, kanbanPage }) => {
  await login()
  await kanbanPage.gotoHome()
  const createBoardDialog = await kanbanPage.openCreateBoardDialog()

  await createBoardDialog.save()

  const nameField = createBoardDialog.nameField
  await expect(nameField).toBeAriaInvalid()
  await expect(nameField).toBeDescribedBy("Can't be empty")
})
