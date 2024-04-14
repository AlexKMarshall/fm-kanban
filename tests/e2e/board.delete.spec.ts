import { expect, test } from '../playwright-utils'

test('delete board', async ({ kanbanPage, createBoard }) => {
  const board = await createBoard()

  const boardPage = await kanbanPage.gotoBoard(board.name)

  const confirmationDialog = await boardPage.openDeleteBoardDialog()
  await expect(confirmationDialog).toBeVisible()
  await confirmationDialog.getByRole('button', { name: /delete/i }).click()
  await expect(confirmationDialog).toBeHidden()

  await expect(
    kanbanPage._page.getByText(/please select or create a board/i),
  ).toBeVisible()
  const boardNav = await kanbanPage.getBoardNav()
  await expect(boardNav.getByRole('link', { name: board.name })).toBeHidden()
})
