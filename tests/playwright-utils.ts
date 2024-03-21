/* eslint-disable no-empty-pattern */

import { test as base } from '@playwright/test'

import { getNewSalt, hashPassword } from '~/auth'
import { prisma } from '~/db/prisma.server'

// import { getNewSalt, hashPassword } from '../app/auth'

import { makeAccount } from './factories/account'

type Account = {
  id: string
  email: string
  password: string
}

export const test = base.extend<{
  signUp: (options?: Partial<Account>) => Promise<Account>
}>({
  signUp: async ({}, use) => {
    let accountId = ''
    await use(async (options) => {
      const { email, password, id } = makeAccount(options)
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
      return { email, password, id }
    })
    await prisma.account.delete({
      where: { id: accountId },
    })
  },
})

export const { expect } = test
