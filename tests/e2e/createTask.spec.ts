import { expect, test } from '../playwright-utils'

test('create task', async ({ page, createBoard }) => {
  const column1 = { name: 'column 1' }
  const column2 = { name: 'column 2' }
  const task1 = {
    title: 'task 1',
    description: 'description 1',
  }
  const task2 = {
    title: 'task 2',
    description: 'description 2',
    subtasks: ['subtask 1', 'subtask 2'],
  }
  const boardWithTwoColumns = await createBoard({ columns: [column1, column2] })

  await page.goto('/')
  await page.getByRole('link', { name: boardWithTwoColumns.name }).click()

  // Create first card in first column
  await page.getByRole('link', { name: /add new task/i }).click()

  const addNewTaskForm = page.getByRole('form', { name: /add new task/i })

  await addNewTaskForm
    .getByRole('textbox', { name: /^title/i })
    .fill(task1.title)
  await addNewTaskForm
    .getByRole('textbox', { name: /description/i })
    .fill(task1.description)
  await addNewTaskForm
    .getByRole('combobox', { name: /status/i })
    .selectOption(column1.name)
  await addNewTaskForm.getByRole('button', { name: /create task/i }).click()

  const columnOneElement = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: column1.name }) })
  const card1 = columnOneElement
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: task1.title }) })
  await expect(card1).toBeVisible()
  // View the details of the task
  await card1.getByRole('link', { name: task1.title }).click()
  const taskDialog = page.getByRole('dialog', { name: task1.title })
  await expect(taskDialog).toBeVisible()
  await expect(taskDialog).toContainText(task1.description)
  // Ideally we'd also verify that the status select has the correct value
  // But playwright currently doesn't let you check by the visible text of an option, only its value
  // And we don't want to check the column id directly as it's an implementation detail
  // https://github.com/microsoft/playwright/issues/27146

  // Close the dialog
  await page.keyboard.press('Escape')

  // Create second card in second column
  await page.getByRole('link', { name: /add new task/i }).click()

  await addNewTaskForm
    .getByRole('textbox', { name: /^title/i })
    .fill(task2.title)
  await addNewTaskForm
    .getByRole('textbox', { name: /description/i })
    .fill(task2.description)
  await addNewTaskForm
    .getByRole('combobox', { name: /status/i })
    .selectOption(column2.name)

  for (let i = 0; i < task2.subtasks.length; i++) {
    const subtask = task2.subtasks[i]
    if (i > 0) {
      await addNewTaskForm
        .getByRole('button', { name: /add new subtask/i })
        .click()
    }
    await addNewTaskForm
      .getByRole('textbox', { name: /subtask title/i })
      .last()
      .fill(subtask)
  }

  await addNewTaskForm.getByRole('button', { name: /create task/i }).click()

  const columnTwoElement = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: column2.name }) })
  const card2 = columnTwoElement
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: task2.title }) })
  await expect(card2).toBeVisible()
  await expect(card2).toContainText(`0 of ${task2.subtasks.length} subtasks`)

  // View the details of the task
  await card2.getByRole('link', { name: task2.title }).click()
  const task2Dialog = page.getByRole('dialog', { name: task2.title })
  await expect(task2Dialog).toBeVisible()
  await expect(task2Dialog).toContainText(task2.description)
})
