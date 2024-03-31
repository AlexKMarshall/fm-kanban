import { ComponentPropsWithoutRef } from 'react'
import { ModalOverlay, Modal as RACModal } from 'react-aria-components'
import { tv } from 'tailwind-variants'

export function Modal({
  children,
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof ModalOverlay>, 'className'> & {
  className?: string
}) {
  return (
    <ModalOverlay
      {...props}
      className={tv({
        base: 'fixed inset-0 z-50 flex items-center justify-center',
      })({ className })}
    >
      <RACModal>{children}</RACModal>
    </ModalOverlay>
  )
}
