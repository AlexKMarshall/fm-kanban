/* eslint-disable no-empty-pattern */

import { test as base, expect as baseExpect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import * as setCookieParser from 'set-cookie-parser'
import { PartialDeep } from 'type-fest'
import { z } from 'zod'

import { authCookie, getNewSalt, hashPassword } from '~/auth'
import { prisma } from '~/db/prisma.server'

import { makeAccount } from './factories/account'
import { Board, makeBoard } from './factories/board'

type Account = {
  id: string
  email: string
  password: string
}

function makeSignUpFixture({
  onAccountSaved,
}: {
  onAccountSaved: (accountId: string) => void
}) {
  return async function signUp(options?: Partial<Account>) {
    const { email, password } = makeAccount(options)
    const salt = getNewSalt()
    const hash = hashPassword({ password, salt })
    const savedAccount = await prisma.account.create({
      data: {
        email,
        Password: {
          create: {
            hash,
            salt,
          },
        },
      },
    })
    onAccountSaved(savedAccount.id)
    return { email, password, id: savedAccount.id }
  }
}
type SignUpFixture = ReturnType<typeof makeSignUpFixture>

function makeLoginFixture({
  signUp,
  page,
}: {
  signUp: SignUpFixture
  page: Page
}) {
  return async function login(options?: Partial<Account>) {
    const { id, email } = await signUp(options)
    const serializedAuthCookie = await authCookie.serialize(id)

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cookieConfig = setCookieParser.parseString(
      serializedAuthCookie,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any

    await page.context().addCookies([{ ...cookieConfig, domain: 'localhost' }])

    return { id, email }
  }
}
type LoginFixture = ReturnType<typeof makeLoginFixture>

function makeCreateBoardFixture({ login }: { login: LoginFixture }) {
  return async function createBoard(options?: PartialDeep<Board>) {
    const { id: accountId } = await login()
    const board = makeBoard(options)

    const savedBoard = await prisma.board.create({
      select: { name: true, columns: { select: { name: true } } },
      data: {
        name: board.name,
        owner: {
          connect: {
            id: accountId,
          },
        },
        columns: {
          create: board.columns.map(({ name }) => ({
            name,
          })),
        },
      },
    })
    return savedBoard
  }
}
type CreateBoardFixture = ReturnType<typeof makeCreateBoardFixture>

export const test = base.extend<{
  signUp: SignUpFixture
  login: LoginFixture
  createBoard: CreateBoardFixture
}>({
  signUp: async ({}, use) => {
    let accountId = ''
    await use(makeSignUpFixture({ onAccountSaved: (id) => (accountId = id) }))
    await prisma.account.delete({
      where: { id: accountId },
    })
  },
  login: async ({ signUp, page }, use) => {
    await use(makeLoginFixture({ signUp, page }))
  },
  createBoard: async ({ login }, use) => {
    await use(makeCreateBoardFixture({ login }))
  },
})

const matcherReturnTypeSchema = z.object({
  message: z.function().returns(z.string()),
  pass: z.boolean(),
  name: z.string().optional(),
  expected: z.unknown().optional(),
  actual: z.unknown().optional(),
  log: z.array(z.string()).optional(),
})
type MatcherReturnType = z.infer<typeof matcherReturnTypeSchema>

const matcherErrorSchema = z.object({
  matcherResult: matcherReturnTypeSchema,
})

export const expect = baseExpect.extend({
  async toBeAriaInvalid(locator: Locator, options?: { timeout?: number }) {
    const assertionName = 'toBeAriaInvalid'
    let pass: boolean
    let matcherResult: MatcherReturnType | null = null

    try {
      await baseExpect(locator).toHaveAttribute('aria-invalid', 'true', options)
      pass = true
    } catch (error) {
      const errorResult = matcherErrorSchema.safeParse(error)
      if (!errorResult.success) throw error

      matcherResult = errorResult.data.matcherResult
      pass = false
    }

    const message = pass
      ? () => 'Element is aria-invalid'
      : () => 'Element is not aria-invalid'

    return {
      message,
      pass,
      name: assertionName,
      expected: 'true',
      actual: matcherResult?.actual,
    }
  },
  async toBeDescribedBy(
    locator: Locator,
    expected: string,
    options?: { timeout?: number },
  ) {
    const assertionName = 'toBeDescribedBy'
    let pass: boolean
    let matcherResult: MatcherReturnType | null = null

    try {
      await baseExpect(locator).toHaveAttribute('aria-describedby', options)
      const describedById = await locator.getAttribute('aria-describedby')
      // The assertion above means we shouldn't ever throw here
      if (!describedById) throw new Error('aria-describedby is not set')
      const escapedDescribedById = describedById.replace(/:/g, '\\:')
      const errorMessage = locator.page().locator(`#${escapedDescribedById}`)
      await baseExpect(errorMessage).toHaveText(expected, options)
      await baseExpect(errorMessage).toBeVisible(options)

      pass = true
    } catch (error) {
      const errorResult = matcherErrorSchema.safeParse(error)
      if (!errorResult.success) throw error

      matcherResult = errorResult.data.matcherResult
      pass = false
    }

    const message = pass
      ? () => `Element is described by ${expected}`
      : () => `Element is not described by ${expected}`

    return {
      message,
      pass,
      name: assertionName,
      expected,
      actual: matcherResult?.actual,
    }
  },
})
