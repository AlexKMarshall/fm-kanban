import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData, useNavigate } from '@remix-run/react'
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

  const [item, columns] = await Promise.all([
    getTask({ taskId, accountId }),
    getColumns({ accountId, boardId }),
  ])

  if (!item) {
    throw new Response('Item not found', {
      status: 404,
      statusText: 'Not found',
    })
  }

  return json({ item, columns })
}

export default function Task() {
  const { item, columns } = useLoaderData<typeof loader>()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const itemTitleId = useId()

  useEffect(function openModal() {
    invariant(dialogRef.current, 'createTaskModal ref is not set')
    dialogRef.current.showModal()
  }, [])
  const navigate = useNavigate()

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
          {item.title}
        </h2>
        <p className="text-sm text-gray-500">{item.description}</p>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap justify-between gap-2">
            <Label htmlFor="column">Current Status</Label>
          </div>
          <select defaultValue={item.Column.id}>
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </dialog>
  )
}

function getTask({ taskId, accountId }: { taskId: string; accountId: string }) {
  return prisma.item.findFirst({
    select: {
      id: true,
      title: true,
      description: true,
      Column: { select: { name: true, id: true } },
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
