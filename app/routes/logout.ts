import { redirectWithClearedCookie } from '~/auth'

export async function action() {
  return redirectWithClearedCookie()
}
