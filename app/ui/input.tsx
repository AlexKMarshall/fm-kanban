import { InputHTMLAttributes, forwardRef } from 'react'

import { tv } from 'tailwind-variants'

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      className={tv({
        base: 'border border-gray-700 aria-[invalid]:border-red-700',
      })({ className })}
      {...props}
      ref={ref}
    />
  )
})
