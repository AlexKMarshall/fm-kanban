import { ComponentPropsWithoutRef, forwardRef } from 'react'
import { tv } from 'tailwind-variants'

export const Button = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<'button'>
>(function Button({ className, ...props }, ref) {
  return (
    <button
      {...props}
      className={tv({
        base: 'rounded-full px-4 py-2 text-sm font-bold leading-relaxed',
      })({ className })}
      ref={ref}
    />
  )
})
