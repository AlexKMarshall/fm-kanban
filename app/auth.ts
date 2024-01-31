import { createCookie } from '@remix-run/node'
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
  return authCookieSchema.parse(await authCookie.parse(cookieString))
}
