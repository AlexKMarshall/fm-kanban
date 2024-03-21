import type { MetaFunction } from '@remix-run/node'
import { Link } from '@remix-run/react'

import { redirectIfLoggedInLoader } from '~/auth-old'

export const meta: MetaFunction = () => {
  return [
    { title: 'New Remix App' },
    { name: 'description', content: 'Welcome to Remix!' },
  ]
}

export const loader = redirectIfLoggedInLoader

export default function Index() {
  return (
    <div>
      <h1>Kanban app</h1>
      <p>
        This is a Frontend Mentor project similar to trello. To play around with
        it sign up or login.
      </p>
      <div className="flex gap-8">
        <Link to="/signup">Signup</Link>
        <Link to="/login">Login</Link>
      </div>
    </div>
  )
}
