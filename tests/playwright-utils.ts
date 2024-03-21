/* eslint-disable no-empty-pattern */

import { test as base } from '@playwright/test'
import * as setCookieParser from 'set-cookie-parser'

import { authCookie, getNewSalt, hashPassword } from '~/auth'
import { prisma } from '~/db/prisma.server'

import { makeAccount } from './factories/account'

type Account = {
  id: string
  email: string
  password: string
}

export const test = base.extend<{
  signUp: (options?: Partial<Account>) => Promise<Account>
  login: (options?: Partial<Account>) => Promise<Omit<Account, 'password'>>
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

      return { id, email }
    })
  },
})

export const { expect } = test
