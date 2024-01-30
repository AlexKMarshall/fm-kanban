import { createCookie } from '@remix-run/node'
import { z } from 'zod'

const secret = z.string().min(12).parse(process.env.COOKIE_SECRET)

export const authCookie = createCookie('auth', {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secrets: [secret],
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 30, // 30 days
})

export function createAccount({
  email,
  password,
}: {
  email: string
  password: string
}) {
  return { id: 1 }
}
