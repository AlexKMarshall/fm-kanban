import { redirect, createCookie } from '@remix-run/node'
import crypto from 'node:crypto'
import { z } from 'zod'

const secret = z.string().min(12).parse(process.env.COOKIE_SECRET)

// The auth cookie is the user Id, but if the user isn't logged in it'll be null
const authCookieSchema = z.string().min(1).nullable()

const authCookie = createCookie('auth', {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secrets: [secret],
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 30, // 30 days
})

export async function setAuthOnResponse(response: Response, userId: string) {
  response.headers.append('Set-Cookie', await authCookie.serialize(userId))
}

export async function getAuthFromRequest(request: Request) {
  const cookieString = request.headers.get('Cookie')

  const authCookieResult = authCookieSchema.safeParse(
    await authCookie.parse(cookieString),
  )
  if (authCookieResult.success) return authCookieResult.data

  // We have a malformed cookie, so we'll clear it and redirect home
  console.error('Malformed auth cookie', authCookieResult.error)
  return redirectWithClearedCookie()
}

export async function redirectWithClearedCookie() {
  return redirect('/', {
    headers: {
      'Set-Cookie': await authCookie.serialize(null, {
        expires: new Date(0),
      }),
    },
  })
}

export function hashPassword({
  password,
  salt,
}: {
  password: string
  salt: string
}) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
}

export function getNewSalt() {
  return crypto.randomBytes(32).toString('hex')
}
