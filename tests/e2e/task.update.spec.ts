import { faker } from '@faker-js/faker'

import { makeColumn, makeSubtask, makeTask } from 'tests/factories/board'

import { expect, test } from '../playwright-utils'

test(
  'Complete and uncomplete subtasks',
  { tag: '@mobile-ready' },
  async ({ page, createBoard, createTasks, kanbanPage }) => {
    const board = await createBoard()
    const subtask1 = makeSubtask({ isCompleted: false })
    const subtask2 = makeSubtask({ isCompleted: false })
    const subtask3 = makeSubtask({ isCompleted: false })
    const task = makeTask({ subtasks: [subtask1, subtask2, subtask3] })
    const column = faker.helpers.arrayElement(board.columns)

    await createTasks({
      boardId: board.id,
      columnId: column.id,
      ...task,
    })

    await kanbanPage.gotoBoard(board.name)

    const taskCard = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: column.name }) })
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: task.title }) })
    await expect(taskCard).toContainText('0 of 3 subtasks')

    // Open card
    await taskCard.getByRole('link', { name: task.title }).click()
    const subTasksHeading = page.getByRole('heading', { name: 'Subtasks' })
    await expect(subTasksHeading).toContainText('(0 of 3)')
    // Complete first subtask
    await page.getByRole('checkbox', { name: subtask1.title }).check()
    await expect(subTasksHeading).toContainText('(1 of 3)')

    // Complete second subtask
    await page.getByRole('checkbox', { name: subtask2.title }).check()
    await expect(subTasksHeading).toContainText('(2 of 3)')

    // Uncomplete first subtask
    await page.getByRole('checkbox', { name: subtask1.title }).uncheck()
    await expect(subTasksHeading).toContainText('(1 of 3)')

    // Close the dialog
    await page.keyboard.press('Escape')

    await expect(taskCard).toContainText('1 of 3 subtasks')
  },
)

test(
  'Update task column',
  { tag: '@mobile-ready' },
  async ({ page, createBoard, createTasks, kanbanPage }) => {
    const column1 = makeColumn()
    const column2 = makeColumn()
    const board = await createBoard({ columns: [column1, column2] })
    const task = makeTask()
    await createTasks({ boardId: board.id, columnId: column1.id, ...task })

    await kanbanPage.gotoBoard(board.name)

    const column1Element = page.getByRole('listitem').filter({
      has: page.getByRole('heading', { name: column1.name }),
    })
    const column2Element = page.getByRole('listitem').filter({
      has: page.getByRole('heading', { name: column2.name }),
    })
    const taskCardInColumn1 = column1Element.getByRole('listitem').filter({
      has: page.getByRole('heading', { name: task.title }),
    })
    const taskCardInColumn2 = column2Element.getByRole('listitem').filter({
      has: page.getByRole('heading', { name: task.title }),
    })

    await expect(taskCardInColumn1).toBeVisible()
    await expect(taskCardInColumn2).toBeHidden()

    // Open card
    await taskCardInColumn1.getByRole('link', { name: task.title }).click()
    const taskDialog = page.getByRole('dialog', { name: task.title })
    await expect(taskDialog).toBeVisible()

    await page
      .getByRole('combobox', { name: 'Current Status' })
      .selectOption(column2.name)
    // Close card
    await page.keyboard.press('Escape')
    await expect(taskDialog).toBeHidden()

    await expect(taskCardInColumn1).toBeHidden()
    await expect(taskCardInColumn2).toBeVisible()
  },
)
