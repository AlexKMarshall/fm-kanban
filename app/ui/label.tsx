import { LabelHTMLAttributes, forwardRef } from 'react'

export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(function Label({ htmlFor, ...props }, ref) {
  return <label htmlFor={htmlFor} {...props} ref={ref} />
})
