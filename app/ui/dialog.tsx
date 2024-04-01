import { ComponentPropsWithoutRef } from 'react'
import {
  Heading,
  ModalOverlay,
  Dialog as RACDialog,
  Modal as RACModal,
} from 'react-aria-components'
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
        base: 'fixed inset-0 z-50 flex items-center justify-center bg-gray-700/50',
      })({ className })}
    >
      <RACModal>{children}</RACModal>
    </ModalOverlay>
  )
}

export function Dialog({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RACDialog>) {
  return (
    <RACDialog
      {...props}
      className={tv({
        base: 'm-4 w-[30rem] max-w-full rounded-md bg-white p-6 sm:p-8',
      })({ className })}
    >
      {children}
    </RACDialog>
  )
}

export function DialogTitle({
  children,
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof Heading>, 'slot'>) {
  return (
    <Heading
      {...props}
      className={tv({ base: 'text-lg font-bold' })({ className })}
      slot="title"
    >
      {children}
    </Heading>
  )
}

export {
  DialogTrigger,
  Button as DialogTriggerButton,
} from 'react-aria-components'
