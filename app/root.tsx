import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react'

import './tailwind.css'
import { LoaderFunctionArgs } from '@remix-run/node'
import { authCookie } from './auth'
import { z } from 'zod'

const authCookieSchema = z.coerce.string().min(1).nullable()

export async function loader({ request }: LoaderFunctionArgs) {
  const cookieString = request.headers.get('Cookie')
  const userId = authCookieSchema.parse(await authCookie.parse(cookieString))
  return { userId }
}

export default function App() {
  const { userId } = useLoaderData<typeof loader>()
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <header>
          <nav>
            {userId ? <button>Logout</button> : <Link to="/login">Login</Link>}
          </nav>
        </header>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}
