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
        base: 'inline-flex items-center justify-center gap-3 rounded-full px-4 py-2 text-sm font-bold leading-relaxed',
      })({ className })}
      ref={ref}
    />
  )
})

export const IconButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<'button'>
>(function IconButton({ className, ...props }, ref) {
  return (
    <button
      {...props}
      className={tv({
        // Create a pseudo element with a minimum tap target size of 48px
        base: 'relative inline-flex items-center justify-center rounded-full p-2 after:absolute after:left-1/2 after:top-1/2 after:h-12 after:w-12 after:-translate-x-1/2 after:-translate-y-1/2',
      })({ className })}
      ref={ref}
    />
  )
})
