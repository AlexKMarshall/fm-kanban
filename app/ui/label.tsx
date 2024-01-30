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
        base: 'font-bold text-gray-700',
      })({ className })}
      {...props}
      ref={ref}
    />
  )
})
