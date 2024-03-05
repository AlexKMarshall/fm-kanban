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
import { ComponentPropsWithoutRef, useEffect, useRef } from 'react'
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
  columns: z
    .array(z.string().optional())
    .superRefine((columns, ctx) => {
      columns.forEach((column, index) => {
        const isLastColumn = index === columns.length - 1
        if (!column && !isLastColumn) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Required',
            path: [index],
          })
        }
      })
    })
    .transform((columns) => columns.filter(Boolean)),
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

  const { name, columns } = submission.value

  const board = await createBoard({ name, userId, columns })

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
    defaultValue: {
      name: '',
      columns: [''],
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    lastResult,
    constraint: getZodConstraint(createBoardSchema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: createBoardSchema })
    },
  })
  const columns = fields.columns.getFieldList()
  const navigation = useNavigation()
  const isCreatingBoard =
    navigation.formData?.get(INTENTS.createBoard.fieldName) ===
    INTENTS.createBoard.value

  const { boards } = useLoaderData<typeof loader>()
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
      {/* We don't need a keyboard handler for dialog click outside close as dialog natively handles Esc key close */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={createBoardModalRef}
        className="backdrop:bg-gray-700/50"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            event.currentTarget.close()
          }
        }}
        aria-labelledby="create-board-dialog-title"
      >
        <div className="p-4">
          <h2 id="create-board-dialog-title">Add New Board</h2>
          <Form method="post" className="max-w-80" {...getFormProps(form)}>
            {/* We need this button first in the form to be the default onEnter submission */}
            <button
              type="submit"
              className="hidden"
              name={INTENTS.createBoard.fieldName}
              value={INTENTS.createBoard.value}
              tabIndex={-1}
            >
              Create new board
            </button>
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
            <fieldset>
              <legend>Columns</legend>
              <ul className="flex flex-col gap-3">
                {columns.map((column, index) => (
                  <li key={column.key} className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <ColumnInput
                        {...getInputProps(column, { type: 'text' })}
                      />
                      <button
                        {...form.remove.getButtonProps({
                          name: fields.columns.name,
                          index,
                        })}
                        aria-label="Remove"
                      >
                        X
                      </button>
                    </div>
                    <FieldError
                      id={column.errorId}
                      className="min-h-[1rlh] text-red-700"
                      aria-live="polite"
                      errors={column.errors}
                    />
                  </li>
                ))}
              </ul>
              <button
                {...form.insert.getButtonProps({ name: fields.columns.name })}
              >
                + Add New Column
              </button>
            </fieldset>
            <button
              type="submit"
              name={INTENTS.createBoard.fieldName}
              value={INTENTS.createBoard.value}
            >
              {isCreatingBoard ? 'Creating New Board...' : 'Create New Board'}
            </button>
          </Form>
        </div>
      </dialog>
    </div>
  )
}

function ColumnInput(props: ComponentPropsWithoutRef<typeof Input>) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return <Input {...props} ref={ref} />
}

function createBoard({
  name,
  userId,
  columns,
}: {
  name: string
  userId: string
  columns: string[]
}) {
  return prisma.board.create({
    data: {
      name,
      owner: {
        connect: {
          id: userId,
        },
      },
      columns: {
        create: columns.map((name) => ({
          name,
        })),
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
