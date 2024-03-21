import { faker } from '@faker-js/faker'

type Account = {
  id: string
  email: string
  password: string
}

export function makeAccount(overrides?: Partial<Account>): Account {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    password: faker.internet.password({ prefix: 'Aa1' }),
    ...overrides,
  }
}
