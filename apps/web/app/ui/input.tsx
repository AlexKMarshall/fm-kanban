import { InputHTMLAttributes, forwardRef } from 'react'
import { tv } from 'tailwind-variants'

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      className={tv({
        base: 'rounded border border-gray-300 px-4 py-2 text-sm placeholder:text-gray-400 aria-[invalid]:border-red-700',
      })({ className })}
      {...props}
      ref={ref}
    />
  )
})
