import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData, Link } from '@remix-run/react'
import { z } from 'zod'
import { requireAuthCookie } from '~/auth'
import { prisma } from '~/db/prisma.server'
import { FieldError } from '~/ui/field-error'
import { Input } from '~/ui/input'
import { Label } from '~/ui/label'

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireAuthCookie(request)

  const boards = await getBoards(userId)
  return json({ boards })
}

const createBoardSchema = z.object({
  name: z.string().min(1),
})

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireAuthCookie(request)

  const formData = await request.formData()
  const rawName = formData.get('name')

  const result = await createBoardSchema.safeParseAsync({
    name: rawName,
  })

  if (!result.success) {
    return json(result.error.flatten(), { status: 400 })
  }

  const { name } = result.data

  const board = await createBoard({ name, userId })

  return redirect(`/board/${board.id}`)
}

export default function Home() {
  const actionData = useActionData<typeof action>()
  const nameErrors = actionData?.fieldErrors.name
  const { boards } = useLoaderData<typeof loader>()
  return (
    <div>
      <h1>Home</h1>
      <h2>Add New Board</h2>
      <Form method="post" className="max-w-80">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            aria-invalid={nameErrors?.length ? true : undefined}
            aria-describedby="name-error"
          />
          <FieldError
            id="name-error"
            className="min-h-[1rlh] text-red-700"
            aria-live="polite"
            errors={nameErrors}
          />
        </div>
        <button type="submit">Create New Board</button>
      </Form>
      <ul>
        {boards.map((board) => (
          <li key={board.id}>
            <Link to={`/board/${board.id}`}>{board.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function createBoard({ name, userId }: { name: string; userId: string }) {
  return prisma.board.create({
    data: {
      name,
      owner: {
        connect: {
          id: userId,
        },
      },
    },
  })
}

function getBoards(userId: string) {
  return prisma.board.findMany({
    where: {
      ownerId: userId,
    },
  })
}
