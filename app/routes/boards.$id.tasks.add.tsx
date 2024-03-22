import {
  getFormProps,
  getInputProps,
  getSelectProps,
  getTextareaProps,
  useForm,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { useActionData, useFetcher } from '@remix-run/react'
import { useEffect, useRef } from 'react'
import invariant from 'tiny-invariant'
import { z } from 'zod'

import { requireAuthCookie } from '~/auth'
import { prisma } from '~/db/prisma.server'
import { Button } from '~/ui/button'
import { FieldError } from '~/ui/field-error'
import { Input } from '~/ui/input'
import { Label } from '~/ui/label'

import { useBoardLoaderData } from './boards.$id'

const paramsSchema = z.object({
  id: z.string(),
})

const createTaskSchema = z.object({
  title: z.string({ required_error: "Can't be empty" }),
  description: z.string().optional(),
  // TODO: validate the column id
  columnId: z.string({ required_error: 'Select a status' }),
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

  const { title, description, columnId } = submission.value

  await prisma.item.create({
    data: {
      title,
      description,
      columnId,
      boardId,
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
  const createTaskModalRef = useRef<HTMLDialogElement>(null)
  const lastResult = useActionData<typeof action>()
  const fetcher = useFetcher()
  const [form, fields] = useForm<z.infer<typeof createTaskSchema>>({
    defaultValue: {
      title: '',
      description: '',
      columnId: '',
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    lastResult,
    constraint: getZodConstraint(createTaskSchema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: createTaskSchema })
    },
  })

  useEffect(function openModal() {
    invariant(createTaskModalRef.current, 'createTaskModal ref is not set')
    createTaskModalRef.current.showModal()
  }, [])

  return (
    /* We don't need a keyboard handler for dialog click outside close as dialog natively handles Esc key close */
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */
    <dialog
      ref={createTaskModalRef}
      className="w-[30rem] max-w-full bg-transparent p-4 backdrop:bg-gray-700/50"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          event.currentTarget.close()
        }
      }}
      aria-labelledby="create-task-modal-title"
    >
      <div className="rounded-md bg-white p-6 sm:p-8">
        <h2 id="create-task-modal-title" className="text-lg font-bold">
          Add New Task
        </h2>
        <fetcher.Form
          method="post"
          {...getFormProps(form)}
          className="flex flex-col gap-6"
          aria-labelledby="create-task-modal-title"
        >
          {/* We need this button first in the form to be the default onEnter submission */}
          <Button
            type="submit"
            className="hidden"
            name={INTENTS.createTask.fieldName}
            value={INTENTS.createTask.value}
            tabIndex={-1}
          >
            Create Task
          </Button>
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
      </div>
    </dialog>
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
