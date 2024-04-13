import { makeColumn, makeTask } from 'tests/factories/board'

import { expect, test } from '../playwright-utils'

test(
  'delete task',
  { tag: '@mobile-ready' },
  async ({ page, createBoard, createTasks, kanbanPage }) => {
    const column = makeColumn()
    const board = await createBoard({ columns: [column] })
    const task = makeTask()
    await createTasks({ boardId: board.id, columnId: column.id, ...task })

    await kanbanPage.gotoBoard(board.name)

    const taskCardLink = page.getByRole('link', { name: task.title })
    await expect(taskCardLink).toBeVisible()

    // Open task card
    await taskCardLink.click()
    const taskDetail = page.getByRole('dialog', { name: task.title })
    await expect(taskDetail).toBeVisible()

    await taskDetail.getByRole('button', { name: /task menu/i }).click()
    await page.getByRole('menuitem', { name: /delete task/i }).click()

    // Opening the confirmation dialog replaces the task detail dialog, rather than stacking on top of it
    await expect(taskDetail).toBeHidden()
    const confirmationDialog = page.getByRole('alertdialog', {
      name: /delete this task/i,
    })
    await expect(confirmationDialog).toBeVisible()
    await confirmationDialog.getByRole('button', { name: /delete/i }).click()

    // All dialogs close and task is removed from the board
    await expect(confirmationDialog).toBeHidden()
    await expect(taskDetail).toBeHidden()
    await expect(taskCardLink).toBeHidden()
  },
)
