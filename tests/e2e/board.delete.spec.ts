import { expect, test } from '../playwright-utils'

test(
  'delete board',
  { tag: '@mobile-ready' },
  async ({ page, kanbanPage, createBoard }) => {
    const board = await createBoard()

    await kanbanPage.gotoBoard(board.name)

    await page.getByRole('button', { name: /board menu/i }).click()
    await page.getByRole('menuitem', { name: /delete board/i }).click()
    const confirmationDialog = page.getByRole('alertdialog', {
      name: /delete this board/i,
    })
    await expect(confirmationDialog).toBeVisible()
    await confirmationDialog.getByRole('button', { name: /delete/i }).click()
    await expect(confirmationDialog).toBeHidden()

    await expect(
      page.getByText(/please select or create a board/i),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: board.name })).toBeHidden()
  },
)
