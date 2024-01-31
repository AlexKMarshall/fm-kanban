import { prisma } from '~/db/prisma.server'
import { hashPassword } from '~/auth'

export async function login({
  email,
  password,
}: {
  email: string
  password: string
}) {
  const account = await prisma.account.findUnique({
    where: { email },
    include: { Password: true },
  })
  if (!account || !account.Password) return false

  const hash = hashPassword({ password, salt: account.Password.salt })

  if (hash !== account.Password.hash) return false

  return account.id
}
