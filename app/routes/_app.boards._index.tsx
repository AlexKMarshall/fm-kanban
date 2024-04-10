import { LoaderFunctionArgs, SerializeFrom, json } from '@remix-run/node'
import { Link, useSearchParams } from '@remix-run/react'

import { requireAuthCookie } from '~/auth'
import { prisma } from '~/db/prisma.server'
import { Dialog, DialogTitle, Modal } from '~/ui/dialog'
import { BoardIcon } from '~/ui/icons/BoardIcon'
import { ChevronDownIcon } from '~/ui/icons/ChevronDownIcon'

import { useCreateBoardModal } from './_app.boards'

export async function loader({ request }: LoaderFunctionArgs) {
  const accountId = await requireAuthCookie(request)

  const allBoards = await getBoards(accountId)

  return json({ allBoards })
}

export default function BoardsIndexPage() {
  return <p>Please select or create a board</p>
}

function Header({
  loaderData: { allBoards },
}: {
  loaderData: SerializeFrom<typeof loader>
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const createBoardModal = useCreateBoardModal()
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
          Select a board
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
                createBoardModal.open()
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
      <h1 className="hidden text-xl font-bold sm:block">Select a board</h1>
    </div>
  )
}

export const handle = {
  Header,
}

function getBoards(userId: string) {
  return prisma.board.findMany({
    where: {
      ownerId: userId,
    },
  })
}
