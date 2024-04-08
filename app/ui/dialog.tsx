import { ComponentPropsWithoutRef, useContext } from 'react'
import {
  Heading,
  ModalOverlay,
  OverlayTriggerStateContext,
  Dialog as RACDialog,
  Modal as RACModal,
} from 'react-aria-components'
import { tv } from 'tailwind-variants'

import { Button } from './button'

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

export function DialogTitle(
  {
    children,
    className,
    ...props
  }: Omit<ComponentPropsWithoutRef<typeof Heading>, 'slot' | 'id'>, // We have to omit `id` because if we override it, it will break the aria-labelledby association
) {
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

export function CloseButton({
  onPress,
  ...props
}: ComponentPropsWithoutRef<typeof Button>) {
  const state = useContext(OverlayTriggerStateContext)

  return (
    <Button
      {...props}
      onPress={(event) => {
        onPress?.(event)
        state.close()
      }}
    />
  )
}
