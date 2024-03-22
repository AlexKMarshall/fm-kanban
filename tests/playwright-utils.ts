/* eslint-disable no-empty-pattern */

import { test as base } from '@playwright/test'
import * as setCookieParser from 'set-cookie-parser'
import { PartialDeep } from 'type-fest'

import { authCookie, getNewSalt, hashPassword } from '~/auth'
import { prisma } from '~/db/prisma.server'

import { makeAccount } from './factories/account'
import { Board, makeBoard } from './factories/board'

type Account = {
  id: string
  email: string
  password: string
}

export const test = base.extend<{
  signUp: (options?: Partial<Account>) => Promise<Account>
  login: (options?: Partial<Account>) => Promise<Omit<Account, 'password'>>
  createBoard: (options?: PartialDeep<Board>) => Promise<Board>
}>({
  signUp: async ({}, use) => {
    let accountId = ''
    await use(async (options) => {
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
      accountId = savedAccount.id
      console.log('signed up accountID', accountId)
      return { email, password, id: accountId }
    })
    await prisma.account.delete({
      where: { id: accountId },
    })
  },

  login: async ({ signUp, page }, use) => {
    await use(async (options) => {
      const { id, email } = await signUp(options)
      const serializedAuthCookie = await authCookie.serialize(id)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const cookieConfig = setCookieParser.parseString(
        serializedAuthCookie,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any

      await page
        .context()
        .addCookies([{ ...cookieConfig, domain: 'localhost' }])

      console.log('logged in accountID', id)

      return { id, email }
    })
  },

  createBoard: async ({ login }, use) => {
    await use(async (options) => {
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

      console.log('created board', savedBoard.name)

      return savedBoard
    })
  },
})

export const { expect } = test
