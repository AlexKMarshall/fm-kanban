import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Cross2Icon } from '@radix-ui/react-icons'
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  SerializeFrom,
  json,
  redirect,
} from '@remix-run/node'
import {
  Form,
  Link,
  Outlet,
  useActionData,
  useNavigation,
  useSearchParams,
} from '@remix-run/react'
import { z } from 'zod'

import { requireAuthCookie } from '~/auth'
import { prisma } from '~/db/prisma.server'
import { useModalState } from '~/hooks/useModalState'
import { Button, IconButton } from '~/ui/button'
import { Dialog, DialogTitle, Modal } from '~/ui/dialog'
import { FieldError } from '~/ui/field-error'
import { BoardIcon } from '~/ui/icons/BoardIcon'
import { Input } from '~/ui/input'
import { Label, Legend } from '~/ui/label'

import logoDark from '../assets/logo-dark.svg'

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

type BoardsLoaderData = SerializeFrom<typeof loader>

const INTENTS = {
  createBoard: {
    value: 'createBoard',
    fieldName: 'intent',
  },
} as const

export function useCreateBoardModal() {
  return useModalState('create-board')
}

export default function Home() {
  const actionData = useActionData<typeof action>()
  const [form, fields] = useForm<z.infer<typeof createBoardSchema>>({
    defaultValue: {
      name: '',
      columns: [''],
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    lastResult: actionData,
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
  const createBoardModal = useCreateBoardModal()

  return (
    <>
      <Modal
        isDismissable
        isOpen={createBoardModal.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            createBoardModal.close()
          }
        }}
      >
        <Dialog>
          <DialogTitle>Add New Board</DialogTitle>
          <Form
            method="post"
            {...getFormProps(form)}
            className="flex flex-col gap-6"
          >
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
                      <Input
                        focusOnMount={index !== 0}
                        aria-label="Column name"
                        {...getInputProps(column, { type: 'text' })}
                        className="w-0 flex-1"
                      />
                      <IconButton
                        {...form.remove.getButtonProps({
                          name: fields.columns.name,
                          index,
                        })}
                        type="submit"
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
                {...form.insert.getButtonProps({
                  name: fields.columns.name,
                })}
                className="bg-indigo-700/10 text-indigo-700"
                type="submit"
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
        </Dialog>
      </Modal>
      <Outlet />
    </>
  )
}

export const handle = {
  renderSidebar: (data: SerializeFrom<typeof loader>) => (
    <>
      <div className="flex items-start gap-4 text-lg sm:mb-14">
        <Link to="/" aria-label="Kanban home">
          <span className="flex shrink-0 items-center justify-center before:invisible before:w-0 before:content-['A']">
            <img src={logoDark} alt="Kanban" />
          </span>
        </Link>
      </div>
      <BoardsNav boards={data.boards} />
    </>
  ),
}

function BoardsNav({
  boards,
  className,
}: {
  boards: BoardsLoaderData['boards']
  className?: string
}) {
  const [, setSearchParams] = useSearchParams()

  return (
    <nav className={className}>
      <p className="mb-5 text-xs font-bold uppercase text-gray-700">
        All boards ({boards.length})
      </p>
      <ul>
        {boards.map((board) => (
          <li key={board.id}>
            <Link
              to={`/boards/${board.id}`}
              className="flex items-start gap-3 py-3 font-bold text-gray-700 aria-[current]:bg-indigo-700 aria-[current]:text-white"
            >
              <span className="flex shrink-0 items-center justify-center before:invisible before:w-0 before:content-['A']">
                <BoardIcon />
              </span>
              {board.name}
            </Link>
          </li>
        ))}
      </ul>

      <button
        onClick={() => {
          setSearchParams((prev) => {
            const updated = new URLSearchParams(prev)
            updated.set('modal', 'create-board')
            return updated
          })
        }}
        className="flex items-start gap-3 py-3 text-left font-bold text-indigo-700"
      >
        <span className="flex shrink-0 items-center justify-center before:invisible before:w-0 before:content-['A']">
          <BoardIcon />{' '}
        </span>
        +&nbsp;Create New Board
      </button>
    </nav>
  )
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
