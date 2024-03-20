import { HTMLAttributes } from 'react'
import { tv } from 'tailwind-variants'

export function FieldError({
  errors = [],
  className,
  ...props
}: { errors: string[] | undefined } & Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
>) {
  return (
    <div
      {...props}
      className={tv({ base: 'text-xs text-red-700' })({ className })}
    >
      {errors.length > 1 ? (
        <ul>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : errors.length === 1 ? (
        <p>{errors[0]}</p>
      ) : null}
    </div>
  )
}
