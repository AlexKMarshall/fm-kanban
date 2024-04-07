import { faker } from '@faker-js/faker'

import { makeColumn, makeSubtask, makeTask } from 'tests/factories/board'

import { expect, test } from '../playwright-utils'

test('edit task', async ({ page, createBoard, createTasks }) => {
  const column1 = makeColumn()
  const column2 = makeColumn()
  const board = await createBoard({ columns: [column1, column2] })
  const task = makeTask()
  await createTasks({ boardId: board.id, columnId: column1.id, ...task })

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

  // Validate the current values
  const titleInput = taskEditDialog.getByRole('textbox', { name: /^title/i })
  await expect(titleInput).toHaveValue(task.title)
  const descriptionInput = taskEditDialog.getByRole('textbox', {
    name: /description/i,
  })
  // Ideally we'd also verify that the status select has the correct value
  // But playwright currently doesn't let you check by the visible text of an option, only its value
  // And we don't want to check the column id directly as it's an implementation detail

  // Make Edits
  const newTitle = faker.lorem.words()
  await titleInput.fill(newTitle)
  const newDescription = faker.lorem.paragraph()
  await descriptionInput.fill(newDescription)
  await taskEditDialog
    .getByRole('combobox', { name: /status/i })
    .selectOption(column2.name)

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
  // The task description is updated
  await expect(taskViewDialog.getByText(newDescription)).toBeVisible()
  // The task status is updated
  // Ideally we'd also verify that the status select has the correct value
  // But playwright currently doesn't let you check by the visible text of an option, only its value
  // And we don't want to check the column id directly as it's an implementation detail

  // Close the task view dialog, so we can check the card is in the updated and in the new column
  await page.keyboard.press('Escape')

  // The task card is now in the new column
  const columnTwoElement = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: column2.name }) })
  const card = columnTwoElement
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: newTitle }) })
  await expect(card).toBeVisible()
})

test('add a subtask', async ({ page, createBoard, createTasks }) => {
  const column = makeColumn()
  const board = await createBoard({ columns: [column] })
  const task = makeTask()
  await createTasks({ boardId: board.id, columnId: column.id, ...task })

  await page.goto('/')
  await page.getByRole('link', { name: board.name }).click()

  // Open task card
  await page.getByRole('link', { name: task.title }).click()

  // Edit the task
  const taskViewDialog = page.getByRole('dialog', { name: task.title })
  await taskViewDialog.getByRole('button', { name: /task menu/i }).click()
  await page.getByRole('menuitem', { name: /edit task/i }).click()
  const taskEditDialog = page.getByRole('dialog', { name: /edit task/i })

  // Add a subtask
  await taskEditDialog.getByRole('button', { name: /add new subtask/i }).click()
  const subtaskInput = taskEditDialog
    .getByRole('textbox', { name: /subtask title/i })
    .last()
  const subtaskTitle = faker.lorem.sentence()
  await subtaskInput.fill(subtaskTitle)

  // Save the changes
  await taskEditDialog.getByRole('button', { name: /save changes/i }).click()

  // The subtask is displayed in the task view dialog
  await expect(
    taskViewDialog.getByRole('checkbox', { name: subtaskTitle }),
  ).toBeVisible()
})

test('edit a subtask', async ({ page, createBoard, createTasks }) => {
  const column = makeColumn()
  const board = await createBoard({ columns: [column] })
  const incompleteSubtask = makeSubtask({ isCompleted: false })
  const completeSubtask = makeSubtask({ isCompleted: true })
  const task = makeTask({ subtasks: [incompleteSubtask, completeSubtask] })
  await createTasks({ boardId: board.id, columnId: column.id, ...task })

  await page.goto('/')
  await page.getByRole('link', { name: board.name }).click()

  // Open task card
  await page.getByRole('link', { name: task.title }).click()

  // Edit the task
  const taskViewDialog = page.getByRole('dialog', { name: task.title })
  await taskViewDialog.getByRole('button', { name: /task menu/i }).click()
  await page.getByRole('menuitem', { name: /edit task/i }).click()
  const taskEditDialog = page.getByRole('dialog', { name: /edit task/i })

  // Edit the subtask titles
  const incompleteSubtaskNewTitle = faker.lorem.sentence()
  await taskEditDialog
    .getByRole('textbox', { name: /subtask title/i })
    .first()
    .fill(incompleteSubtaskNewTitle)
  const completeSubtaskNewTitle = faker.lorem.sentence()
  await taskEditDialog
    .getByRole('textbox', { name: /subtask title/i })
    .last()
    .fill(completeSubtaskNewTitle)

  // Save the changes
  await taskEditDialog.getByRole('button', { name: /save changes/i }).click()

  // The subtasks are displayed in the task view dialog with the new titles
  await expect(
    taskViewDialog.getByRole('checkbox', { name: incompleteSubtaskNewTitle }),
  ).not.toBeChecked()
  await expect(
    taskViewDialog.getByRole('checkbox', { name: completeSubtaskNewTitle }),
  ).toBeChecked()
})

test('remove a subtask', async ({ page, createBoard, createTasks }) => {
  const column = makeColumn()
  const board = await createBoard({ columns: [column] })
  const subtask = makeSubtask()
  const task = makeTask({ subtasks: [subtask] })
  await createTasks({ boardId: board.id, columnId: column.id, ...task })

  await page.goto('/')
  await page.getByRole('link', { name: board.name }).click()

  // Open task card
  await page.getByRole('link', { name: task.title }).click()

  // Edit the task
  const taskViewDialog = page.getByRole('dialog', { name: task.title })
  await taskViewDialog.getByRole('button', { name: /task menu/i }).click()
  await page.getByRole('menuitem', { name: /edit task/i }).click()
  const taskEditDialog = page.getByRole('dialog', { name: /edit task/i })

  // Remove the subtask
  await taskEditDialog
    .getByRole('listitem')
    .filter({
      has: page.getByRole('textbox', { name: /subtask title/i }),
    })
    .getByRole('button', { name: /remove/i })
    .click()

  // Save the changes
  await taskEditDialog.getByRole('button', { name: /save changes/i }).click()

  // The subtask is no longer displayed in the task view dialog
  await expect(taskViewDialog).toBeVisible()
  await expect(
    taskViewDialog.getByRole('checkbox', { name: subtask.title }),
  ).toBeHidden()
})
