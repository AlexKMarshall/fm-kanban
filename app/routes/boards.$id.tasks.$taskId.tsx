import { randomUUID } from 'crypto'

import {
  getFormProps,
  getInputProps,
  getSelectProps,
  getTextareaProps,
  useForm,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Cross2Icon } from '@radix-ui/react-icons'
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from '@remix-run/node'
import { Form, useFetcher, useLoaderData, useNavigate } from '@remix-run/react'
import { useEffect, useId, useState } from 'react'
import { Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components'
import { z } from 'zod'

import { requireAuthCookie } from '~/auth'
import { prisma } from '~/db/prisma.server'
import { Button, IconButton } from '~/ui/button'
import { CloseButton, Dialog, DialogTitle, Modal } from '~/ui/dialog'
import { FieldError } from '~/ui/field-error'
import { VerticalEllipsisIcon } from '~/ui/icons/VerticalEllipsisIcon'
import { Input } from '~/ui/input'
import { Label, Legend } from '~/ui/label'

const paramsSchema = z.object({
  id: z.string(),
  taskId: z.string(),
})

export async function loader({ request, params }: LoaderFunctionArgs) {
  const accountId = await requireAuthCookie(request)
  const { id: boardId, taskId } = paramsSchema.parse(params)

  const [task, columns] = await Promise.all([
    getTask({ taskId, accountId }),
    getColumns({ accountId, boardId }),
  ])

  if (!task) {
    throw new Response('Task not found', {
      status: 404,
      statusText: 'Not found',
    })
  }

  return json({ task, columns })
}

const INTENTS = {
  updateSubtask: {
    value: 'updateSubtask',
    fieldName: 'intent',
  },
  updateColumn: {
    value: 'updateColumn',
    fieldName: 'intent',
  },
  editTask: {
    value: 'editTask',
    fieldName: 'intent',
  },
  deleteTask: {
    value: 'deleteTask',
    fieldName: 'intent',
  },
} as const

const updateSubtaskFormSchema = z.object({
  intent: z.literal(INTENTS.updateSubtask.value),
  subtaskId: z.string(),
  isCompleted: z.coerce.boolean().default(false),
})
const updateColumnFormSchema = z.object({
  intent: z.literal(INTENTS.updateColumn.value),
  columnId: z.string(),
})
const deleteTaskFormSchema = z.object({
  intent: z.literal(INTENTS.deleteTask.value),
})
const editTaskFormSchema = z.object({
  intent: z.literal(INTENTS.editTask.value),
  title: z.string({ required_error: "Can't be empty" }),
  description: z.string().optional(),
  // TODO: validate the column id
  columnId: z.string({ required_error: 'Select a status' }),
  subtasks: z
    .array(
      z.object({
        title: z.string().optional(),
        id: z.string().optional(),
      }),
    )
    .superRefine((subtasks, ctx) => {
      subtasks.forEach((subtask, index) => {
        const isLastSubtask = index === subtasks.length - 1
        if (!subtask.title && !isLastSubtask) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Can't be empty",
            path: [index, 'title'],
          })
        }
      })
    })
    .transform((subtasks) =>
      subtasks.filter((subtask): subtask is { title: string; id?: string } =>
        Boolean(subtask.title),
      ),
    ),
})

const actionFormSchema = z.union([
  updateSubtaskFormSchema,
  updateColumnFormSchema,
  editTaskFormSchema,
  deleteTaskFormSchema,
])

export async function action({ request, params }: ActionFunctionArgs) {
  const { taskId, id: boardId } = paramsSchema.parse(params)
  const accountId = await requireAuthCookie(request)
  const formData = await request.formData()
  const submission = await parseWithZod(formData, {
    schema: actionFormSchema,
    async: true,
  })

  if (submission.status !== 'success') {
    return json(submission.reply(), { status: 400 })
  }

  switch (submission.value.intent) {
    case INTENTS.updateSubtask.value:
      await prisma.subtask.update({
        where: {
          id: submission.value.subtaskId,
          Task: { Board: { ownerId: accountId } },
        },
        data: { isCompleted: submission.value.isCompleted },
      })
      return json(submission.reply())
    case INTENTS.updateColumn.value:
      await prisma.task.update({
        where: {
          id: taskId,
          Board: { ownerId: accountId },
        },
        data: {
          columnId: submission.value.columnId,
        },
      })
      return json(submission.reply())
    case INTENTS.editTask.value:
      await prisma.task.update({
        where: {
          id: taskId,
          Board: { ownerId: accountId },
        },
        data: {
          title: submission.value.title,
          description: submission.value.description,
          columnId: submission.value.columnId,
          subtasks: {
            deleteMany: {
              id: {
                notIn: submission.value.subtasks
                  .map((subtask) => subtask.id)
                  .filter((id): id is string => id !== undefined),
              },
            },
            upsert: submission.value.subtasks.map(({ id, title }) => ({
              where: { id: id ?? randomUUID() },
              create: { title },
              update: { title },
            })),
          },
        },
      })
      return json(submission.reply())
    case INTENTS.deleteTask.value:
      await prisma.task.delete({
        where: {
          id: taskId,
          Board: { ownerId: accountId },
        },
      })
      return redirect(`/boards/${boardId}`)
  }
}

const modalType = {
  view: 'view',
  edit: 'edit',
  delete: 'delete',
} as const
type ModalType = (typeof modalType)[keyof typeof modalType]

export default function Task() {
  const { task, columns } = useLoaderData<typeof loader>()
  const itemTitleId = useId()

  const navigate = useNavigate()

  const completedSubtaskCount = task.subtasks.filter(
    (subtask) => subtask.isCompleted,
  ).length
  const totalSubtaskCount = task.subtasks.length

  const fetcher = useFetcher<typeof action>()

  const [modal, setModal] = useState<ModalType | null>('view')

  const [editForm, fields] = useForm<z.infer<typeof editTaskFormSchema>>({
    defaultValue: {
      title: task.title,
      description: task.description,
      columnId: task.Column.id,
      subtasks: task.subtasks.map((subtask) => ({
        title: subtask.title,
        id: subtask.id,
      })),
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    lastResult: fetcher.data,
    constraint: getZodConstraint(editTaskFormSchema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: editTaskFormSchema })
    },
  })

  const subtasksFieldList = fields.subtasks.getFieldList()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.status === 'success') {
      setModal('view')
    }
  }, [fetcher.data?.status, fetcher.state])

  return (
    <>
      <Modal
        isDismissable
        isOpen={modal === 'view'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            navigate(-1)
          }
        }}
      >
        <Dialog>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle id={itemTitleId}>{task.title}</DialogTitle>
            <MenuTrigger>
              <IconButton aria-label="Task menu">
                <VerticalEllipsisIcon />
              </IconButton>
              <Popover placement="bottom" offset={24}>
                <Menu
                  onAction={(key) => {
                    if (Object.values(modalType).includes(key as ModalType)) {
                      setModal(key as ModalType)
                    }
                  }}
                  className="flex min-w-48 flex-col gap-4 rounded-lg bg-white p-4"
                >
                  <MenuItem
                    id={modalType.edit}
                    className="cursor-pointer rounded text-sm text-gray-500 outline-none ring-offset-2 data-[focus-visible]:ring data-[focus-visible]:ring-red-700"
                  >
                    Edit Task
                  </MenuItem>
                  <MenuItem
                    id={modalType.delete}
                    className="cursor-pointer rounded text-sm text-red-700 outline-none ring-offset-2 data-[focus-visible]:ring data-[focus-visible]:ring-red-700"
                  >
                    Delete Task
                  </MenuItem>
                </Menu>
              </Popover>
            </MenuTrigger>
          </div>
          {task.description ? (
            <p className="text-sm text-gray-500">{task.description}</p>
          ) : null}
          {task.subtasks.length > 0 ? (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-gray-500">
                Subtasks ({completedSubtaskCount} of {totalSubtaskCount})
              </h3>
              <ul className="flex flex-col gap-2">
                {task.subtasks.map((subtask) => (
                  <Subtask
                    key={subtask.id}
                    subtaskId={subtask.id}
                    title={subtask.title}
                    isCompleted={subtask.isCompleted}
                  />
                ))}
              </ul>
            </div>
          ) : null}
          <fetcher.Form
            method="post"
            onChange={(event) => fetcher.submit(event.currentTarget)}
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap justify-between gap-2">
                <Label htmlFor="column">Current Status</Label>
              </div>
              <select name="columnId" id="column" defaultValue={task.Column.id}>
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="hidden"
              name={INTENTS.updateColumn.fieldName}
              value={INTENTS.updateColumn.value}
            />
          </fetcher.Form>
        </Dialog>
      </Modal>
      <Modal
        isDismissable
        isOpen={modal === 'edit'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setModal('view')
          }
        }}
      >
        <Dialog>
          <DialogTitle>Edit Task</DialogTitle>
          <fetcher.Form
            method="post"
            {...getFormProps(editForm)}
            className="flex flex-col gap-6"
          >
            {/* We need this button first in the form to be the default onEnter submission */}
            <button
              type="submit"
              className="hidden"
              name={INTENTS.editTask.fieldName}
              value={INTENTS.editTask.value}
              tabIndex={-1}
            >
              Save Changes
            </button>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap justify-between gap-2">
                <Label htmlFor={fields.title.id}>Title</Label>
                <FieldError
                  id={fields.title.errorId}
                  aria-live="polite"
                  errors={fields.title.errors}
                />
              </div>
              <Input
                {...getInputProps(fields.title, { type: 'text' })}
                placeholder="e.g. Take coffee break"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap justify-between gap-2">
                <Label htmlFor={fields.description.id}>Description</Label>
                <FieldError
                  id={fields.description.errorId}
                  aria-live="polite"
                  errors={fields.description.errors}
                />
              </div>
              <textarea
                {...getTextareaProps(fields.description)}
                placeholder="e.g. It’s always good to take a break. This 15 minute break will recharge the batteries a little."
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap justify-between gap-2">
                <Label htmlFor={fields.columnId.id}>Status</Label>
                <FieldError
                  id={fields.columnId.errorId}
                  aria-live="polite"
                  errors={fields.columnId.errors}
                />
              </div>
              <select {...getSelectProps(fields.columnId)}>
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
            </div>
            <fieldset className="flex flex-col gap-3">
              <Legend>Subtasks</Legend>
              <ul className="flex flex-col gap-3">
                {subtasksFieldList.map((subtask, index) => {
                  const { title, id } = subtask.getFieldset()
                  return (
                    <li key={subtask.key} className="flex flex-col gap-2">
                      <input {...getInputProps(id, { type: 'hidden' })} />
                      <div className="flex gap-2 has-[[aria-invalid]]:text-red-700">
                        <Input
                          focusOnMount={index !== 0}
                          aria-label="Subtask title"
                          {...getInputProps(title, { type: 'text' })}
                          className="w-0 flex-1"
                        />
                        <IconButton
                          {...editForm.remove.getButtonProps({
                            name: fields.subtasks.name,
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
                        id={subtask.errorId}
                        aria-live="polite"
                        errors={subtask.errors}
                      />
                    </li>
                  )
                })}
              </ul>
              <Button
                {...editForm.insert.getButtonProps({
                  name: fields.subtasks.name,
                })}
                className="bg-indigo-700/10 text-indigo-700"
                type="submit"
              >
                + Add New Subtask
              </Button>
            </fieldset>
            <Button
              type="submit"
              name={INTENTS.editTask.fieldName}
              value={INTENTS.editTask.value}
              className="bg-indigo-700 text-white"
            >
              {fetcher.state === 'idle' ? 'Save Changes' : 'Saving Changes...'}
            </Button>
          </fetcher.Form>
        </Dialog>
      </Modal>
      <Modal
        isOpen={modal === 'delete'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setModal('view')
          }
        }}
      >
        <Dialog role="alertdialog">
          <DialogTitle className="text-red-700">Delete this task?</DialogTitle>
          <p>
            Are you sure you want to delete the &lsquo;{task.title}&rsquo; task
            and its subtasks? This action cannot be reversed.
          </p>
          <Form method="post">
            <div className="flex gap-4">
              <Button
                type="submit"
                name="intent"
                value={INTENTS.deleteTask.value}
                className="grow bg-red-700 text-white"
              >
                Delete
              </Button>
              <CloseButton className="grow bg-indigo-200 text-indigo-700">
                Cancel
              </CloseButton>
            </div>
          </Form>
        </Dialog>
      </Modal>
    </>
  )
}

function Subtask({
  subtaskId,
  title,
  isCompleted,
}: {
  subtaskId: string
  title: string
  isCompleted: boolean
}) {
  const id = useId()
  const labelId = `${id}-label`
  const titleId = `${id}-title`

  const fetcher = useFetcher()

  return (
    <li className="has-[:checked] flex items-center gap-4 rounded bg-blue-50 p-4 text-xs font-bold has-[:checked]:text-gray-500 has-[:checked]:line-through">
      <fetcher.Form
        method="post"
        onChange={(event) => {
          fetcher.submit(event.currentTarget)
        }}
      >
        <input
          type="checkbox"
          name="isCompleted"
          value="true"
          defaultChecked={isCompleted}
          aria-labelledby={[labelId, titleId].join(' ')}
        />
        <input type="hidden" name="subtaskId" value={subtaskId} />
        <input
          type="hidden"
          name={INTENTS.updateSubtask.fieldName}
          value={INTENTS.updateSubtask.value}
        />
      </fetcher.Form>
      <span id={labelId} className="sr-only">
        Complete
      </span>
      <span id={titleId}>{title}</span>
    </li>
  )
}

function getTask({ taskId, accountId }: { taskId: string; accountId: string }) {
  return prisma.task.findFirst({
    select: {
      id: true,
      title: true,
      description: true,
      Column: { select: { name: true, id: true } },
      subtasks: { select: { id: true, title: true, isCompleted: true } },
    },
    where: {
      id: taskId,
      Board: {
        ownerId: accountId,
      },
    },
  })
}

function getColumns({
  boardId,
  accountId,
}: {
  boardId: string
  accountId: string
}) {
  return prisma.column.findMany({
    where: {
      boardId,
      Board: {
        ownerId: accountId,
      },
    },
  })
}
