import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from '@remix-run/node'
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from '@remix-run/react'
import { useRef } from 'react'
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
  const submission = await parseWithZod(formData, {
    schema: createBoardSchema,
    async: true,
  })

  if (submission.status !== 'success') {
    return json(submission.reply(), { status: 400 })
  }

  const { name } = submission.value

  const board = await createBoard({ name, userId })

  return redirect(`/board/${board.id}`)
}

const INTENTS = {
  createBoard: {
    value: 'createBoard',
    fieldName: 'intent',
  },
} as const

export default function Home() {
  const createBoardModalRef = useRef<HTMLDialogElement>(null)
  const lastResult = useActionData<typeof action>()
  const [form, fields] = useForm<z.infer<typeof createBoardSchema>>({
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    lastResult,
    constraint: getZodConstraint(createBoardSchema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: createBoardSchema })
    },
  })
  const { boards } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isCreatingBoard =
    navigation.formData?.get(INTENTS.createBoard.fieldName) ===
    INTENTS.createBoard.value

  return (
    <div>
      <h1>Home</h1>
      <ul>
        {boards.map((board) => (
          <li key={board.id}>
            <Link to={`/board/${board.id}`}>{board.name}</Link>
          </li>
        ))}
      </ul>
      <button
        className="border bg-slate-300 p-2"
        onClick={() => {
          createBoardModalRef.current?.showModal()
        }}
      >
        + Create New Board
      </button>
      <dialog ref={createBoardModalRef} className="p-4 backdrop:bg-gray-700/50">
        <h2>Add New Board</h2>
        <Form method="post" className="max-w-80" {...getFormProps(form)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor={fields.name.id}>Name</Label>
            <Input
              {...getInputProps(fields.name, { type: 'text' })}
              autoComplete="off"
            />
            <FieldError
              id={fields.name.errorId}
              className="min-h-[1rlh] text-red-700"
              aria-live="polite"
              errors={fields.name.errors}
            />
          </div>
          <button
            type="submit"
            name={INTENTS.createBoard.fieldName}
            value={INTENTS.createBoard.value}
          >
            {isCreatingBoard ? 'Creating New Board...' : 'Create New Board'}
          </button>
        </Form>
      </dialog>
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
