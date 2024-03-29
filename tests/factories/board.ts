import { faker } from '@faker-js/faker'
import { PartialDeep } from 'type-fest'

export type Board = {
  name: string
  columns: Array<Column>
}

export function makeBoard(overrides?: PartialDeep<Board>) {
  const name = overrides?.name ?? faker.word.words()
  const columns =
    overrides?.columns?.map((columnOverrides) => makeColumn(columnOverrides)) ??
    faker.helpers.multiple(makeColumn, { count: { min: 1, max: 5 } })

  return {
    name,
    columns,
  }
}

type Column = {
  name: string
}

function makeColumn(overrides?: PartialDeep<Column>) {
  return {
    name: faker.word.adjective(),
    ...overrides,
  }
}

type Task = {
  title: string
  description: string | null
  subtasks: Array<Subtask>
}

export function makeTask(
  overrides?: PartialDeep<Task, { recurseIntoArrays: true }>,
) {
  const title = overrides?.title ?? faker.word.words()
  const description =
    overrides?.description === undefined
      ? faker.helpers.maybe(() => faker.lorem.paragraphs()) ?? null
      : overrides.description
  const subtasks =
    overrides?.subtasks?.map((subtaskOverrides) =>
      makeSubtask(subtaskOverrides),
    ) ?? faker.helpers.multiple(makeSubtask, { count: { min: 0, max: 5 } })

  return {
    title,
    description,
    subtasks,
  }
}

type Subtask = {
  title: string
  isCompleted: boolean
}

export function makeSubtask(overrides?: PartialDeep<Subtask>) {
  return {
    title: faker.word.words(),
    isCompleted: faker.datatype.boolean(),
    ...overrides,
  }
}
