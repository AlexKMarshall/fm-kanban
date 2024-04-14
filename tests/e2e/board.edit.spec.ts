import { faker } from '@faker-js/faker'

import { makeColumn, makeTask } from 'tests/factories/board'

import { expect, test } from '../playwright-utils'

test('edit board title', async ({ kanbanPage, createBoard }) => {
  const board = await createBoard()
  const originalName = board.name

  const boardPage = await kanbanPage.gotoBoard(originalName)

  await expect(boardPage.getBoardHeading(originalName)).toBeVisible()

  const editBoardDialog = await boardPage.openEditBoardDialog()

  const newName = faker.lorem.words()
  await editBoardDialog.nameField.fill(newName)
  await editBoardDialog.save()

  await expect(editBoardDialog._dialog).toBeHidden()
  await expect(boardPage.getBoardHeading(newName)).toBeVisible()

  const boardNav = await kanbanPage.getBoardNav()

  await expect(boardNav.getByRole('link', { name: originalName })).toBeHidden()
  await expect(boardNav.getByRole('link', { name: newName })).toBeVisible()
})

test('add a column', async ({ page, kanbanPage, createBoard }) => {
  const board = await createBoard()

  const boardPage = await kanbanPage.gotoBoard(board.name)

  const editBoardDialog = await boardPage.openEditBoardDialog()

  await editBoardDialog.addNewColumn()

  const newColumnName = faker.lorem.words()
  await editBoardDialog.columnFields.last().fill(newColumnName)
  await editBoardDialog.save()

  await expect(editBoardDialog._dialog).toBeHidden()

  await expect(page.getByRole('heading', { name: newColumnName })).toBeVisible()
})

test('update existing column name', async ({
  page,
  createBoard,
  createTasks,
  kanbanPage,
}) => {
  const column = makeColumn()
  const board = await createBoard({ columns: [column] })
  const task = makeTask()
  await createTasks({ boardId: board.id, columnId: column.id, ...task })

  const boardPage = await kanbanPage.gotoBoard(board.name)

  // Task is in the column with the original name
  await expect(
    boardPage
      .getColumn(column.name)
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: task.title }) }),
  ).toBeVisible()

  const editBoardDialog = await boardPage.openEditBoardDialog()

  // Update the name
  const newColumnName = faker.lorem.words()
  await editBoardDialog.columnFields.first().fill(newColumnName)
  await editBoardDialog.save()

  await expect(editBoardDialog._dialog).toBeHidden()

  // Task is still visible, in column with new name
  await expect(
    boardPage
      .getColumn(newColumnName)
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: task.title }) }),
  ).toBeVisible()
})

test('remove a column', async ({
  page,
  createBoard,
  createTasks,
  kanbanPage,
}) => {
  // Deleting a column also deletes any tasks inside it
  const column = makeColumn()
  const board = await createBoard({ columns: [column] })
  const task = makeTask()
  await createTasks({ boardId: board.id, columnId: column.id, ...task })

  const boardPage = await kanbanPage.gotoBoard(board.name)

  // Task is in the column
  await expect(
    boardPage
      .getColumn(column.name)
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: task.title }) }),
  ).toBeVisible()

  const editBoardDialog = await boardPage.openEditBoardDialog()

  // Remove the column
  await editBoardDialog._dialog.getByRole('button', { name: /remove/i }).click()

  await editBoardDialog.save()
  await expect(editBoardDialog._dialog).toBeHidden()

  // Column is no longer visible
  await expect(boardPage.getColumn(column.name)).toBeHidden()
  // Task is no longer visible
  await expect(page.getByRole('heading', { name: task.title })).toBeHidden()
})
