import { HTMLAttributes } from 'react'

export function FieldError({
  errors = [],
  ...props
}: { errors: string[] | undefined } & Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
>) {
  return (
    <div {...props}>
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
