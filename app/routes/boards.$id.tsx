import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData, useRouteLoaderData } from '@remix-run/react'
import { z } from 'zod'

import { requireAuthCookie } from '~/auth'
import { prisma } from '~/db/prisma.server'

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
    <div>
      <h1>{board.name}</h1>
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
