import { randomUUID } from 'crypto'

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
  useFetcher,
  useLoaderData,
  useRouteLoaderData,
  useSearchParams,
} from '@remix-run/react'
import { useEffect } from 'react'
import { Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components'
import { z } from 'zod'

import { requireAuthCookie } from '~/auth'
import { prisma } from '~/db/prisma.server'
import { Button, IconButton } from '~/ui/button'
import { CloseButton, Dialog, DialogTitle, Modal } from '~/ui/dialog'
import { FieldError } from '~/ui/field-error'
import { BoardIcon } from '~/ui/icons/BoardIcon'
import { ChevronDownIcon } from '~/ui/icons/ChevronDownIcon'
import { VerticalEllipsisIcon } from '~/ui/icons/VerticalEllipsisIcon'
import { Input } from '~/ui/input'
import { Label, Legend } from '~/ui/label'
import { ButtonLink } from '~/ui/link'

const ROUTE_ID = 'routes/boards.$id'

const paramsSchema = z.object({
  id: z.string(),
})

export async function loader({ request, params }: LoaderFunctionArgs) {
  const accountId = await requireAuthCookie(request)
  const { id } = paramsSchema.parse(params)

  const [board, allBoards] = await Promise.all([
    getBoard({ id, accountId }),
    getBoards(accountId),
  ])
  if (!board) {
    throw new Response('Board not found', {
      status: 404,
      statusText: 'Not found',
    })
  }

  return json({ board, allBoards })
}

const INTENTS = {
  delete: 'delete',
  edit: 'edit',
} as const

const deleteBoardSchema = z.object({
  intent: z.literal('delete'),
})

const editBoardSchema = z.object({
  intent: z.literal('edit'),
  name: z.string({ required_error: "Can't be empty" }),
  columns: z
    .array(
      z.object({
        name: z.string().optional(),
        id: z.string().optional(),
      }),
    )
    .superRefine((columns, ctx) => {
      columns.forEach((column, index) => {
        const isLastColumn = index === columns.length - 1
        if (!column.name && !isLastColumn) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Can't be empty",
            path: [index, 'name'],
          })
        }
      })
    })
    .transform((columns) =>
      columns.filter((column): column is { name: string; id?: string } =>
        Boolean(column.name),
      ),
    ),
})

const actionSchema = z.union([deleteBoardSchema, editBoardSchema])

export async function action({ request, params }: ActionFunctionArgs) {
  const accountId = await requireAuthCookie(request)
  const { id } = paramsSchema.parse(params)

  const formData = await request.formData()

  const submission = await parseWithZod(formData, {
    schema: actionSchema,
    async: true,
  })

  if (submission.status !== 'success') {
    return json(submission.reply(), { status: 400 })
  }

  if (submission.value.intent === INTENTS.delete) {
    await prisma.board.delete({
      where: { id, ownerId: accountId },
    })

    return redirect('/boards')
  }

  const { name, columns } = submission.value

  await prisma.board.update({
    where: { id, ownerId: accountId },
    data: {
      name,
      columns: {
        deleteMany: {
          id: {
            notIn: columns
              .map(({ id }) => id)
              .filter((id): id is string => id !== undefined),
          },
        },
        upsert: columns.map(({ id, name }) => ({
          // Prisma requires an id for upsert
          where: { id: id ?? randomUUID() },
          create: { name },
          update: { name },
        })),
      },
    },
  })

  return json(submission.reply())
}

export function useBoardLoaderData() {
  return useRouteLoaderData<typeof loader>(ROUTE_ID)
}

const modalTypes = {
  delete: 'delete',
  edit: 'edit',
} as const
type ModalType = keyof typeof modalTypes

export default function Board() {
  const { board } = useLoaderData<typeof loader>()

  const columnsWithTasks = board.columns.map((column) => ({
    ...column,
    tasks: board.tasks.filter((task) => task.columnId === column.id),
  }))

  const actionData = useActionData<typeof action>()
  const fetcher = useFetcher<typeof action>()

  const [editForm, fields] = useForm<z.infer<typeof editBoardSchema>>({
    defaultValue: {
      name: board.name,
      columns: board.columns.map((column) => ({
        name: column.name,
        id: column.id,
      })),
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    lastResult: actionData,
    constraint: getZodConstraint(editBoardSchema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: editBoardSchema })
    },
  })
  const columnsFieldList = fields.columns.getFieldList()

  const isEditingBoard = fetcher.state !== 'idle'
  const [searchParams, setSearchParams] = useSearchParams()
  const modalOpen = searchParams.get('boardContextDialog') as ModalType | null

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.status === 'success') {
      setSearchParams((prev) => {
        const updated = new URLSearchParams(prev)
        updated.delete('boardContextDialog')
        return updated
      })
    }
  }, [fetcher.data?.status, fetcher.state, setSearchParams])

  return (
    <div className="flex flex-grow flex-col">
      {columnsWithTasks.length ? (
        <ul className="flex flex-grow gap-6 overflow-auto px-4 py-6 *:shrink-0 *:grow-0 *:basis-72 sm:p-6">
          {columnsWithTasks.map((column) => (
            <li key={column.id} className="flex flex-col gap-6">
              <h2 className="text-xs font-bold uppercase tracking-widest">
                {column.name}
              </h2>
              {column.tasks.length ? (
                <ul className="flex flex-col gap-5">
                  {column.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex flex-col gap-2 rounded-lg bg-white px-4 py-6 shadow"
                    >
                      <h3>
                        <Link to={`tasks/${task.id}`}>{task.title}</Link>
                      </h3>
                      {task.subtasks.length ? (
                        <p className="text-xs font-bold text-gray-500">
                          {
                            task.subtasks.filter(
                              ({ isCompleted }) => isCompleted,
                            ).length
                          }{' '}
                          of {task.subtasks.length} subtasks
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
          <li className="flex flex-col gap-6">
            <h2 className="invisible text-xs font-bold uppercase tracking-widest">
              Placeholder
            </h2>
            <button className="flex-grow rounded-md bg-gray-200 text-2xl font-bold text-gray-700">
              +&nbsp;New Column
            </button>
          </li>
        </ul>
      ) : (
        <div className="grid flex-grow place-content-center">
          <p className="text-lg font-bold text-gray-500">
            This board is empty. Create a new column to get started.
          </p>
        </div>
      )}
      <Modal
        isOpen={modalOpen === modalTypes.edit}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSearchParams(
              (prev) => {
                const updated = new URLSearchParams(prev)
                updated.delete('boardContextDialog')
                return updated
              },
              { replace: true },
            )
          }
        }}
        isDismissable
      >
        <Dialog>
          <DialogTitle>Edit Board</DialogTitle>
          <fetcher.Form
            method="post"
            {...getFormProps(editForm)}
            className="flex flex-col gap-6"
            aria-labelledby="create-board-dialog-title"
          >
            {/* We need this button first in the form to be the default onEnter submission */}
            <button
              type="submit"
              className="hidden"
              name="intent"
              value={INTENTS.edit}
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
                {columnsFieldList.map((column, index) => {
                  const { name, id } = column.getFieldset()
                  return (
                    <li key={column.key} className="flex flex-col gap-2">
                      <input {...getInputProps(id, { type: 'hidden' })} />
                      <div className="flex gap-2 has-[[aria-invalid]]:text-red-700">
                        <Input
                          focusOnMount={index !== 0}
                          aria-label="Column name"
                          {...getInputProps(name, { type: 'text' })}
                          className="w-0 flex-1"
                        />
                        <IconButton
                          {...editForm.remove.getButtonProps({
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
                  )
                })}
              </ul>
              <Button
                {...editForm.insert.getButtonProps({
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
              name="intent"
              value={INTENTS.edit}
              className="bg-indigo-700 text-white"
            >
              {isEditingBoard ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </fetcher.Form>
        </Dialog>
      </Modal>
      <Modal
        isOpen={modalOpen === modalTypes.delete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSearchParams(
              (prev) => {
                const updated = new URLSearchParams(prev)
                updated.delete('boardContextDialog')
                return updated
              },
              { replace: true },
            )
          }
        }}
      >
        <Dialog role="alertdialog">
          <DialogTitle>Delete this board?</DialogTitle>
          <p>
            Are you sure you want to delete the &lsquo;{board.name}&rsquo;
            board? This action will remove all columns and tasks and cannot be
            reversed.
          </p>
          <Form method="post">
            <div className="flex gap-4">
              <Button
                type="submit"
                name="intent"
                value={INTENTS.delete}
                className="grow bg-red-700 text-white"
              >
                Delete
              </Button>
              <CloseButton
                type="button"
                className="grow bg-indigo-200 text-indigo-700"
              >
                Cancel
              </CloseButton>
            </div>
          </Form>
        </Dialog>
      </Modal>

      <Outlet />
    </div>
  )
}

function Header({
  loaderData: { board, allBoards },
}: {
  loaderData: SerializeFrom<typeof loader>
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  return (
    <div className="flex items-center gap-6 ">
      <h1 className="sm:hidden">
        <button
          type="button"
          className="flex items-start gap-2 text-left text-lg font-bold"
          onClick={() => {
            setSearchParams((prev) => {
              const updated = new URLSearchParams(prev)
              updated.set('modal', 'mobile-nav')
              return updated
            })
          }}
        >
          {board.name}{' '}
          <span className={board.name ? 'sr-only' : ''}>Select a board</span>
          <span className="flex shrink-0 items-center justify-center before:invisible before:w-0 before:content-['A']">
            <ChevronDownIcon className="text-indigo-700" />
          </span>
        </button>
      </h1>
      <Modal
        isDismissable
        isOpen={searchParams.get('modal') === 'mobile-nav'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSearchParams((prev) => {
              const updated = new URLSearchParams(prev)
              updated.delete('modal')
              return updated
            })
          }
        }}
      >
        <Dialog>
          <DialogTitle className="sr-only">Select a board</DialogTitle>
          <nav>
            <p className="mb-5 text-xs font-bold uppercase text-gray-700">
              All boards ({allBoards.length})
            </p>
            <ul>
              {allBoards.map((board) => (
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
        </Dialog>
      </Modal>
      <h1 className="hidden text-xl font-bold sm:block">{board.name}</h1>
      <ButtonLink
        aria-disabled={board.columns.length === 0}
        to={`boards/${board.id}/tasks/add`}
        className="text-default ml-auto bg-indigo-700 text-white aria-disabled:bg-indigo-300"
      >
        + <span className="sr-only sm:not-sr-only">Add New Task</span>
      </ButtonLink>
      <MenuTrigger>
        <IconButton aria-label="Board menu">
          <VerticalEllipsisIcon />
        </IconButton>
        <Popover containerPadding={24} offset={24}>
          <Menu
            onAction={(key) => {
              if (Object.values(modalTypes).includes(key as ModalType)) {
                setSearchParams((prev) => {
                  const updated = new URLSearchParams(prev)
                  updated.set('boardContextDialog', key as ModalType)
                  return updated
                })
              }
            }}
            className="flex min-w-48 flex-col gap-4 rounded-lg bg-white p-4"
          >
            <MenuItem
              id={modalTypes.edit}
              className="cursor-pointer rounded text-sm text-gray-500 outline-none ring-offset-2 data-[focus-visible]:ring data-[focus-visible]:ring-indigo-700"
            >
              Edit Board
            </MenuItem>
            <MenuItem
              id={modalTypes.delete}
              className="cursor-pointer rounded text-sm text-red-700 outline-none ring-offset-2 data-[focus-visible]:ring data-[focus-visible]:ring-red-700"
            >
              Delete Board
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>
    </div>
  )
}

export const handle = {
  Header,
}

function getBoard({ id, accountId }: { id: string; accountId: string }) {
  return prisma.board.findFirst({
    where: { id, ownerId: accountId },
    select: {
      id: true,
      name: true,
      columns: {
        select: { id: true, name: true },
      },
      tasks: {
        select: {
          id: true,
          title: true,
          description: true,
          columnId: true,
          subtasks: {
            select: { id: true, title: true, isCompleted: true },
          },
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
