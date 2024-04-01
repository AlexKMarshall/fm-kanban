import { LoaderFunctionArgs, json } from '@remix-run/node'
import {
  Link,
  Outlet,
  useLoaderData,
  useRouteLoaderData,
} from '@remix-run/react'
import { useState } from 'react'
import { Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components'
import { z } from 'zod'

import { requireAuthCookie } from '~/auth'
import { prisma } from '~/db/prisma.server'
import { Button, IconButton } from '~/ui/button'
import { Dialog, DialogTitle, Modal } from '~/ui/dialog'
import { VerticalEllipsisIcon } from '~/ui/icons/VerticalEllipsisIcon'
import { ButtonLink } from '~/ui/link'

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

  const columnsWithTasks = board.columns.map((column) => ({
    ...column,
    tasks: board.tasks.filter((task) => task.columnId === column.id),
  }))

  const [modalOpen, setModalOpen] = useState<'delete' | null>(null)

  return (
    <div className="flex flex-grow flex-col border-l border-l-gray-200 bg-gray-50">
      <div className="flex items-center gap-6 border-b border-b-gray-200 bg-white p-4">
        <h1 className="text-xl font-bold">{board.name}</h1>
        <ButtonLink
          aria-disabled={board.columns.length === 0}
          to="tasks/add"
          className="text-default ml-auto bg-indigo-700 text-white aria-disabled:bg-indigo-300"
        >
          + Add New Task
        </ButtonLink>
        <MenuTrigger>
          <IconButton>
            <VerticalEllipsisIcon />
          </IconButton>
          <Popover containerPadding={24} offset={24}>
            <Menu
              onAction={(key) => {
                if (key === 'delete') {
                  setModalOpen('delete')
                }
              }}
              className="flex min-w-48 flex-col gap-4 rounded-lg bg-white p-4"
            >
              <MenuItem
                id="edit"
                className="cursor-pointer rounded text-sm text-gray-500 outline-none ring-offset-2 data-[focus-visible]:ring data-[focus-visible]:ring-indigo-700"
              >
                Edit Board
              </MenuItem>
              <MenuItem
                id="delete"
                className="cursor-pointer rounded text-sm text-red-700 outline-none ring-offset-2 data-[focus-visible]:ring data-[focus-visible]:ring-red-700"
              >
                Delete Board
              </MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
        <Modal
          isOpen={modalOpen === 'delete'}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setModalOpen(null)
            }
          }}
        >
          <Dialog>
            {({ close }) => (
              <>
                <DialogTitle>Delete this board?</DialogTitle>
                <p>
                  Are you sure you want to delete the ‘Platform Launch’ board?
                  This action will remove all columns and tasks and cannot be
                  reversed.
                </p>
                <div className="flex gap-4">
                  <Button className="grow bg-red-700 text-white">Delete</Button>
                  <Button
                    className="grow bg-indigo-200 text-indigo-700"
                    onClick={close}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
        <Outlet />
      </div>
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
