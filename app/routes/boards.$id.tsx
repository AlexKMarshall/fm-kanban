import { LoaderFunctionArgs, json } from '@remix-run/node'
import {
  Link,
  Outlet,
  useLoaderData,
  useRouteLoaderData,
} from '@remix-run/react'
import { z } from 'zod'

import { requireAuthCookie } from '~/auth'
import { prisma } from '~/db/prisma.server'

const ROUTE_ID = 'routes/boards.$id'

const paramsSchema = z.object({
  id: z.string(),
})

export async function loader({ request, params }: LoaderFunctionArgs) {
  const accountId = await requireAuthCookie(request)
  const { id } = paramsSchema.parse(params)

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

  const columnsWithItems = board.columns.map((column) => ({
    ...column,
    items: board.items.filter((item) => item.columnId === column.id),
  }))

  return (
    <div className="flex flex-grow flex-col border-l border-l-gray-200 bg-gray-50">
      <div className="flex items-center gap-8 border-b border-b-gray-200 bg-white p-4">
        <h1 className="text-xl font-bold">{board.name}</h1>
        <Link
          aria-disabled={board.columns.length === 0}
          to="tasks/add"
          className="text-default ml-auto bg-indigo-700 text-white aria-disabled:bg-indigo-300"
        >
          + Add New Task
        </Link>
        <Outlet />
      </div>
      {columnsWithItems.length ? (
        <ul className="flex flex-grow gap-6 overflow-auto px-4 py-6 *:shrink-0 *:grow-0 *:basis-72 sm:p-6">
          {columnsWithItems.map((column) => (
            <li key={column.id} className="flex flex-col gap-6">
              <h2 className="text-xs font-bold uppercase tracking-widest">
                {column.name}
              </h2>
              {column.items.length ? (
                <ul className="flex flex-col gap-5">
                  {column.items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg bg-white px-4 py-6 shadow"
                    >
                      {item.title}
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
      {board.items.map((item) => (
        <p key={item.id}>{item.title}</p>
      ))}
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
      items: {
        select: { id: true, title: true, description: true, columnId: true },
      },
    },
  })
}
