import { faker } from '@faker-js/faker'

import { makeColumn, makeTask } from 'tests/factories/board'

import { expect, test } from '../playwright-utils'

test(
  'create task',
  { tag: '@mobile-ready' },
  async ({ page, createBoard, kanbanPage }) => {
    const column1 = makeColumn()
    const column2 = makeColumn()
    const task1Description = faker.lorem.paragraph()
    const task2Description = faker.lorem.paragraph()
    const task1 = makeTask({
      description: task1Description,
      subtasks: [],
    })
    const task2 = makeTask({
      description: task2Description,
    })
    const boardWithTwoColumns = await createBoard({
      columns: [column1, column2],
    })

    await kanbanPage.gotoBoard(boardWithTwoColumns.name)

    // Create first card in first column
    await page.getByRole('link', { name: /add new task/i }).click()

    const addNewTaskDialog = page.getByRole('dialog', { name: /add new task/i })

    await addNewTaskDialog
      .getByRole('textbox', { name: /^title/i })
      .fill(task1.title)
    await addNewTaskDialog
      .getByRole('textbox', { name: /description/i })
      .fill(task1Description)
    await addNewTaskDialog
      .getByRole('combobox', { name: /status/i })
      .selectOption(column1.name)
    await addNewTaskDialog.getByRole('button', { name: /create task/i }).click()

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
    await expect(taskDialog.getByText(task1Description)).toBeVisible()
    // Ideally we'd also verify that the status select has the correct value
    // But playwright currently doesn't let you check by the visible text of an option, only its value
    // And we don't want to check the column id directly as it's an implementation detail
    // https://github.com/microsoft/playwright/issues/27146

    // Close the dialog
    await page.keyboard.press('Escape')

    // Create second card in second column
    await page.getByRole('link', { name: /add new task/i }).click()

    await addNewTaskDialog
      .getByRole('textbox', { name: /^title/i })
      .fill(task2.title)
    await addNewTaskDialog
      .getByRole('textbox', { name: /description/i })
      .fill(task2Description)
    await addNewTaskDialog
      .getByRole('combobox', { name: /status/i })
      .selectOption(column2.name)

    for (let i = 0; i < task2.subtasks.length; i++) {
      const subtask = task2.subtasks[i]
      if (i > 0) {
        await addNewTaskDialog
          .getByRole('button', { name: /add new subtask/i })
          .click()
      }
      await addNewTaskDialog
        .getByRole('textbox', { name: /subtask title/i })
        .last()
        .fill(subtask.title)
    }

    await addNewTaskDialog.getByRole('button', { name: /create task/i }).click()

    const columnTwoElement = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: column2.name }) })
    const card2 = columnTwoElement
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: task2.title }) })
    await expect(card2).toBeVisible()
    await expect(
      card2.getByText(`0 of ${task2.subtasks.length} subtasks`),
    ).toBeVisible()

    // View the details of the task
    await card2.getByRole('link', { name: task2.title }).click()
    const task2Dialog = page.getByRole('dialog', { name: task2.title })
    await expect(task2Dialog).toBeVisible()
    await expect(task2Dialog.getByText(task2Description)).toBeVisible()
    await expect(
      task2Dialog.getByRole('heading', {
        name: `Subtasks (0 of ${task2.subtasks.length})`,
      }),
    ).toBeVisible()
    for (const subtask of task2.subtasks) {
      await expect(task2Dialog.getByText(subtask.title)).toBeVisible()
    }
  },
)
