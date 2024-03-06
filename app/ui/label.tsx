import { LabelHTMLAttributes, forwardRef } from 'react'
import { tv } from 'tailwind-variants'

export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(function Label({ htmlFor, className, ...props }, ref) {
  return (
    <label
      htmlFor={htmlFor}
      className={tv({
        base: 'text-xs font-bold text-gray-500',
      })({ className })}
      {...props}
      ref={ref}
    />
  )
})
