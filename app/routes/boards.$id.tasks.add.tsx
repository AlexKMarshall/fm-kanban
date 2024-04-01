import {
  getFormProps,
  getInputProps,
  getSelectProps,
  getTextareaProps,
  useForm,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Cross2Icon } from '@radix-ui/react-icons'
import { ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { useActionData, useFetcher, useNavigate } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { z } from 'zod'

import { requireAuthCookie } from '~/auth'
import { prisma } from '~/db/prisma.server'
import { Button, IconButton } from '~/ui/button'
import { Dialog, DialogTitle, Modal } from '~/ui/dialog'
import { FieldError } from '~/ui/field-error'
import { Input } from '~/ui/input'
import { Label, Legend } from '~/ui/label'

import { useBoardLoaderData } from './boards.$id'

const paramsSchema = z.object({
  id: z.string(),
})

const createTaskSchema = z.object({
  title: z.string({ required_error: "Can't be empty" }),
  description: z.string().optional(),
  // TODO: validate the column id
  columnId: z.string({ required_error: 'Select a status' }),
  subtasks: z
    .array(z.string().optional())
    .transform((subtasks) => subtasks.filter(Boolean)),
})

const INTENTS = {
  createTask: {
    value: 'createTask',
    fieldName: 'intent',
  },
} as const

export async function action({ request, params }: ActionFunctionArgs) {
  const accountId = await requireAuthCookie(request)
  const { id: boardId } = paramsSchema.parse(params)

  const boardExists = await checkBoardExists({ id: boardId, accountId })
  if (!boardExists) {
    // TODO: should really check whehter user is authorized to view/edit the board
    throw new Response('Board not found', {
      status: 404,
      statusText: 'Not found',
    })
  }

  const formData = await request.formData()
  const submission = await parseWithZod(formData, {
    schema: createTaskSchema,
    async: true,
  })

  if (submission.status !== 'success') {
    return json(submission.reply(), { status: 400 })
  }

  const { title, description, columnId, subtasks } = submission.value

  await prisma.task.create({
    data: {
      title,
      description,
      columnId,
      boardId,
      subtasks: {
        create: subtasks.map((title) => ({ title })),
      },
    },
  })

  return redirect(`/boards/${boardId}`)
}

export default function Board() {
  const boardLoaderData = useBoardLoaderData()
  invariant(
    boardLoaderData,
    'Board loader data is not set, it should be the parent of this route',
  )
  const { board } = boardLoaderData
  const lastResult = useActionData<typeof action>()
  const fetcher = useFetcher()
  const [form, fields] = useForm<z.infer<typeof createTaskSchema>>({
    defaultValue: {
      title: '',
      description: '',
      columnId: '',
      subtasks: [''],
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    lastResult,
    constraint: getZodConstraint(createTaskSchema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: createTaskSchema })
    },
  })
  const subtasks = fields.subtasks.getFieldList()

  const navigate = useNavigate()

  return (
    <Modal
      isDismissable
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          navigate(-1)
        }
      }}
    >
      <Dialog>
        <DialogTitle id="create-task-modal-title">Add New Task</DialogTitle>
        <fetcher.Form
          method="post"
          {...getFormProps(form)}
          className="flex flex-col gap-6"
          aria-labelledby="create-task-modal-title"
        >
          {/* We need this button first in the form to be the default onEnter submission */}
          <button
            type="submit"
            className="hidden"
            name={INTENTS.createTask.fieldName}
            value={INTENTS.createTask.value}
            tabIndex={-1}
          >
            Create Task
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
          <fieldset className="flex flex-col gap-3">
            <Legend>Subtasks</Legend>
            <ul className="flex flex-col gap-3">
              {subtasks.map((subtask, index) => (
                <li key={subtask.key} className="flex flex-col gap-2">
                  <div className="flex gap-2 has-[[aria-invalid]]:text-red-700">
                    <Input
                      aria-label="Subtask title"
                      focusOnMount={index !== 0}
                      {...getInputProps(subtask, { type: 'text' })}
                      className="w-0 flex-1"
                    />
                    <IconButton
                      {...form.remove.getButtonProps({
                        name: fields.subtasks.name,
                        index,
                      })}
                      aria-label="Remove"
                      className="self-center"
                      type="submit"
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
              ))}
            </ul>
            <Button
              {...form.insert.getButtonProps({ name: fields.subtasks.name })}
              type="submit"
              className="bg-indigo-700/10 text-indigo-700"
            >
              + Add New Subtask
            </Button>
          </fieldset>
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
              {board.columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="submit"
            name={INTENTS.createTask.fieldName}
            value={INTENTS.createTask.value}
            className="bg-indigo-700 text-white"
          >
            {fetcher.state === 'idle' ? 'Create Task' : 'Creating Task...'}
          </Button>
        </fetcher.Form>
      </Dialog>
    </Modal>
  )
}

async function checkBoardExists({
  id,
  accountId,
}: {
  id: string
  accountId: string
}) {
  const board = await prisma.board.findFirst({
    where: { id, ownerId: accountId },
    select: { id: true },
  })

  return Boolean(board)
}
