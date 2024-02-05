import { LoaderFunctionArgs } from '@remix-run/node'
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

import { getAuthFromRequest } from './auth'

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getAuthFromRequest(request)

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
            <Link to="/">Home</Link>
            {userId ? (
              <form action="/logout" method="post">
                <button>Logout</button>
              </form>
            ) : (
              <Link to="/login">Login</Link>
            )}
          </nav>
        </header>
        <main>
          <Outlet />
        </main>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}
