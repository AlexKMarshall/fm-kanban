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
