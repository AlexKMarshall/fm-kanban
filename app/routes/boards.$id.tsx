import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData, useRouteLoaderData } from '@remix-run/react'
import { z } from 'zod'

import { requireAuthCookie } from '~/auth'
import { prisma } from '~/db/prisma.server'
import { Button } from '~/ui/button'

const ROUTE_ID = 'routes/boards.$id'

export async function loader({ request, params }: LoaderFunctionArgs) {
  const accountId = await requireAuthCookie(request)
  const id = z.string().min(1).parse(params.id)

  const board = await getBoard({ id, accountId })
  if (!board) {
    throw new Response('Board not found', {
      status: 404,
      statusText: 'Not found',
    })
  }

  return json({ board })
}

export function useBoardLoaderData() {
  return useRouteLoaderData<typeof loader>(ROUTE_ID)
}

export default function Board() {
  const { board } = useLoaderData<typeof loader>()

  return (
    <div className="flex-grow border-l border-l-gray-200 bg-gray-50">
      <div className="flex items-center gap-8 border-b border-b-gray-200 bg-white p-4">
        <h1 className="text-xl font-bold">{board.name}</h1>
        <Button className="text-default ml-auto bg-indigo-300 text-white">
          + Add New Task
        </Button>
      </div>
      <ul>
        {board.columns.map((column) => (
          <li key={column.id}>{column.name}</li>
        ))}
      </ul>
    </div>
  )
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
    },
  })
}
