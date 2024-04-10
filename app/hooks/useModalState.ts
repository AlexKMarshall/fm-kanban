import { useSearchParams } from '@remix-run/react'
import { useCallback } from 'react'
const modalSearchParam = 'modal'

function getIsOpen(searchParams: URLSearchParams, modalId: string) {
  const openModals = searchParams.getAll(modalSearchParam)
  return openModals.includes(modalId)
}

/**
 * Hook to manage the open and closed state of a modal using url search params
 *
 *
 * @param modalId unique identifier for the modal
 */
export function useModalState(
  modalId: string,
  {
    keepPrevious,
  }: {
    /** Set true to keep existing modal open, this one will stack on top */
    keepPrevious?: boolean
  } = {},
) {
  const modalSearchParam = 'modal'
  const [searchParams, setSearchParams] = useSearchParams()

  const isOpen = getIsOpen(searchParams, modalId)

  const open = useCallback(() => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev)
      if (!getIsOpen(updated, modalId)) {
        if (!keepPrevious) {
          updated.delete(modalSearchParam)
        }
        updated.append(modalSearchParam, modalId)
      }
      return updated
    })
  }, [keepPrevious, modalId, setSearchParams])

  const close = useCallback(() => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev)
      const openModals = updated.getAll(modalSearchParam)
      updated.delete(modalSearchParam)
      openModals
        .filter((id) => id !== modalId)
        .forEach((id) => {
          updated.append(modalSearchParam, id)
        })
      return updated
    })
  }, [modalId, setSearchParams])

  return { isOpen, open, close }
}
