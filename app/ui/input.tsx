import { InputHTMLAttributes, forwardRef } from 'react'

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      className={[
        'border border-gray-700 aria-[invalid]:border-red-700',
        className,
      ].join(' ')}
      {...props}
      ref={ref}
    />
  )
})
