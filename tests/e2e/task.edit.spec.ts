import { faker } from '@faker-js/faker'

import { makeColumn, makeTask } from 'tests/factories/board'

import { expect, test } from '../playwright-utils'

test('edit task', async ({ page, createBoard, createTasks }) => {
  const column = makeColumn()
  const board = await createBoard({ columns: [column] })
  const task = makeTask()
  await createTasks({ boardId: board.id, columnId: column.id, ...task })

  await page.goto('/')
  await page.getByRole('link', { name: board.name }).click()

  // Open task card
  await page.getByRole('link', { name: task.title }).click()

  let taskViewDialog = page.getByRole('dialog', { name: task.title })
  const taskEditDialog = page.getByRole('dialog', { name: /edit task/i })

  await expect(taskViewDialog).toBeVisible()
  await expect(taskEditDialog).toBeHidden()

  // Open edit dialog
  await taskViewDialog.getByRole('button', { name: /task menu/i }).click()
  await page.getByRole('menuitem', { name: /edit task/i }).click()

  // Opening the edit dialog replaces the view dialog, rather than stacking on top of it
  await expect(taskViewDialog).toBeHidden()
  await expect(taskEditDialog).toBeVisible()

  // Update the task title
  // -- Check the current value
  const titleInput = taskEditDialog.getByRole('textbox', { name: /^title/i })
  await expect(titleInput).toHaveValue(task.title)
  // -- Update the value
  const newTitle = faker.lorem.words()
  await titleInput.fill(newTitle)

  // Save the changes
  await taskEditDialog.getByRole('button', { name: /save changes/i }).click()

  // the task view dialog now has a new name
  taskViewDialog = page.getByRole('dialog', { name: newTitle })

  // The edit dialog closes and the view dialog is shown again
  await expect(taskEditDialog).toBeHidden()
  await expect(taskViewDialog).toBeVisible()

  // The task title is updated
  await expect(
    taskViewDialog.getByRole('heading', { name: newTitle }),
  ).toBeVisible()
})
