import { redirectWithClearedCookie } from '~/auth-old'

export async function action() {
  return redirectWithClearedCookie()
}
