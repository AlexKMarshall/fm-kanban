import { LoaderFunctionArgs } from '@remix-run/node'
import { requireAuthCookie } from '~/auth'

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuthCookie(request)

  return null
}

export default function Home() {
  return (
    <div>
      <h1>Home</h1>
      <p>You should be logged in here</p>
    </div>
  )
}
