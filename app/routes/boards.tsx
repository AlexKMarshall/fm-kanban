import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Cross2Icon, TableIcon } from '@radix-ui/react-icons'
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from '@remix-run/node'
import {
  Form,
  Link,
  Outlet,
  useActionData,
  useLoaderData,
  useNavigation,
} from '@remix-run/react'
import { ComponentPropsWithoutRef, useEffect, useRef } from 'react'
import { z } from 'zod'

import { requireAuthCookie } from '~/auth'
import { prisma } from '~/db/prisma.server'
import { Button, IconButton } from '~/ui/button'
import { FieldError } from '~/ui/field-error'
import { Input } from '~/ui/input'
import { Label, Legend } from '~/ui/label'

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireAuthCookie(request)

  const boards = await getBoards(userId)
  return json({ boards })
}

const createBoardSchema = z.object({
  name: z.string({ required_error: "Can't be empty" }),
  columns: z
    .array(z.string().optional())
    .superRefine((columns, ctx) => {
      columns.forEach((column, index) => {
        const isLastColumn = index === columns.length - 1
        if (!column && !isLastColumn) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Can't be empty",
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

  return redirect(`/boards/${board.id}`)
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
      <h1>Kanban</h1>
      <div className="px-8">
        <h2 className="text-xs font-bold uppercase text-gray-700">
          All boards ({boards.length})
        </h2>
        <ul>
          {boards.map((board) => (
            <li key={board.id}>
              <Link
                to={`/boards/${board.id}`}
                className="flex items-center gap-3 py-3 font-bold text-gray-700 aria-[current]:bg-indigo-700 aria-[current]:text-white"
              >
                <TableIcon aria-hidden />
                {board.name}
              </Link>
            </li>
          ))}
        </ul>
        <button
          onClick={() => {
            createBoardModalRef.current?.showModal()
          }}
          className="flex items-center gap-3 py-3 font-bold text-indigo-700"
        >
          <TableIcon aria-hidden /> + Create New Board
        </button>
      </div>
      <Outlet />
      {/* We don't need a keyboard handler for dialog click outside close as dialog natively handles Esc key close */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={createBoardModalRef}
        className="w-[30rem] max-w-full bg-transparent p-4 backdrop:bg-gray-700/50"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            event.currentTarget.close()
          }
        }}
        aria-labelledby="create-board-dialog-title"
      >
        <div className="rounded-md bg-white p-6 sm:p-8">
          <h2 id="create-board-dialog-title" className="mb-6 text-lg font-bold">
            Add New Board
          </h2>
          <Form
            method="post"
            {...getFormProps(form)}
            className="flex flex-col gap-6"
          >
            {/* We need this button first in the form to be the default onEnter submission */}
            <Button
              type="submit"
              className="hidden"
              name={INTENTS.createBoard.fieldName}
              value={INTENTS.createBoard.value}
              tabIndex={-1}
            >
              Create new board
            </Button>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap justify-between gap-2">
                <Label htmlFor={fields.name.id}>Name</Label>
                <FieldError
                  id={fields.name.errorId}
                  aria-live="polite"
                  errors={fields.name.errors}
                />
              </div>
              <Input
                {...getInputProps(fields.name, { type: 'text' })}
                placeholder="e.g. Web Design"
                autoComplete="off"
              />
            </div>
            <fieldset className="flex flex-col gap-3">
              <Legend>Columns</Legend>
              <ul className="flex flex-col gap-3">
                {columns.map((column, index) => (
                  <li key={column.key} className="flex flex-col gap-2">
                    <div className="flex gap-2 has-[[aria-invalid]]:text-red-700">
                      <ColumnInput
                        {...getInputProps(column, { type: 'text' })}
                        className="w-0 flex-1"
                      />
                      <IconButton
                        {...form.remove.getButtonProps({
                          name: fields.columns.name,
                          index,
                        })}
                        aria-label="Remove"
                        className="self-center"
                      >
                        <Cross2Icon aria-hidden />
                      </IconButton>
                    </div>
                    <FieldError
                      id={column.errorId}
                      aria-live="polite"
                      errors={column.errors}
                    />
                  </li>
                ))}
              </ul>
              <Button
                {...form.insert.getButtonProps({ name: fields.columns.name })}
                className="bg-indigo-700/10 text-indigo-700"
              >
                + Add New Column
              </Button>
            </fieldset>
            <Button
              type="submit"
              name={INTENTS.createBoard.fieldName}
              value={INTENTS.createBoard.value}
              className="bg-indigo-700 text-white"
            >
              {isCreatingBoard ? 'Creating New Board...' : 'Create New Board'}
            </Button>
          </Form>
        </div>
      </dialog>
    </div>
  )
}

/** An input that autofocuses when it mounts. Ideal for use in a field list */
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
