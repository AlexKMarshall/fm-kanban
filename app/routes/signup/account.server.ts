import crypto from 'node:crypto'
import { prisma } from '~/db/prisma.server'

export async function accountExists(email: string) {
  const account = await prisma.account.findUnique({
    where: { email },
  })

  return Boolean(account)
}

export async function createAccount({
  email,
  password,
}: {
  email: string
  password: string
}) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex')

  return prisma.account.create({
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
}
