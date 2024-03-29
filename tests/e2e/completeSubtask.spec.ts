import { faker } from '@faker-js/faker'

import { makeSubtask, makeTask } from 'tests/factories/board'

import { expect, test } from '../playwright-utils'

test('Complete and uncomplete subtasks', async ({
  page,
  createBoard,
  createTasks,
}) => {
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

  await page.goto('/')
  await page.getByRole('link', { name: board.name }).click()

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
})
