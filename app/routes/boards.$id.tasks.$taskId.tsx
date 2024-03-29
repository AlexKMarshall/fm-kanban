import { ActionFunctionArgs, LoaderFunctionArgs, json } from '@remix-run/node'
import { useFetcher, useLoaderData, useNavigate } from '@remix-run/react'
import { useEffect, useId, useRef } from 'react'
import invariant from 'tiny-invariant'
import { z } from 'zod'

import { requireAuthCookie } from '~/auth'
import { prisma } from '~/db/prisma.server'
import { Label } from '~/ui/label'

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

const actionFormSchema = z.union([
  updateSubtaskFormSchema,
  updateColumnFormSchema,
])

export async function action({ request, params }: ActionFunctionArgs) {
  const { taskId } = paramsSchema.parse(params)
  const accountId = await requireAuthCookie(request)
  const formData = await request.formData()
  const parsed = actionFormSchema.parse(Object.fromEntries(formData))

  switch (parsed.intent) {
    case INTENTS.updateSubtask.value:
      await prisma.subtask.update({
        where: {
          id: parsed.subtaskId,
          Task: { Board: { ownerId: accountId } },
        },
        data: { isCompleted: parsed.isCompleted },
      })
      return null
    case INTENTS.updateColumn.value:
      await prisma.task.update({
        where: {
          id: taskId,
        },
        data: {
          columnId: parsed.columnId,
        },
      })
      return null
  }
}

export default function Task() {
  const { task, columns } = useLoaderData<typeof loader>()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const itemTitleId = useId()

  useEffect(function openModal() {
    invariant(dialogRef.current, 'createTaskModal ref is not set')
    dialogRef.current.showModal()
  }, [])
  const navigate = useNavigate()

  const completedSubtaskCount = task.subtasks.filter(
    (subtask) => subtask.isCompleted,
  ).length
  const totalSubtaskCount = task.subtasks.length

  const fetcher = useFetcher()

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      onClose={() => navigate(-1)}
      className="w-[30rem] max-w-full bg-transparent p-4 backdrop:bg-gray-700/50"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          event.currentTarget.close()
        }
      }}
      aria-labelledby={itemTitleId}
    >
      <div className="flex flex-col gap-6 rounded-md bg-white p-6 sm:p-8">
        <h2 id={itemTitleId} className="text-lg font-bold">
          {task.title}
        </h2>
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
      </div>
    </dialog>
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
