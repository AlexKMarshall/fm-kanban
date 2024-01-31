import { ActionFunctionArgs, redirect } from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { HTMLAttributes } from 'react'
import { z } from 'zod'
import { setAuthOnResponse } from '~/auth'
import { Input } from '~/ui/input'
import { Label } from '~/ui/label'
import { accountExists, createAccount } from './account.server'

const signupSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(10, 'Must be at least 10 characters')
    .regex(/[a-z]/i, 'Must contain at least one letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
})

const signupServerSchema = signupSchema.refine(
  async ({ email }) => !(await accountExists(email)),
  {
    message: 'An account with this email already exists',
    path: ['email'],
  },
)

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const rawEmail = formData.get('email')
  const rawPassword = formData.get('password')

  const result = await signupServerSchema.safeParseAsync({
    email: rawEmail,
    password: rawPassword,
  })

  if (!result.success) {
    return result.error.flatten()
  }

  const { email, password } = result.data

  const user = await createAccount({ email, password })
  const redirectHome = redirect('/')
  await setAuthOnResponse(redirectHome, user.id)
  return redirectHome
}

export default function Signup() {
  const actionData = useActionData<typeof action>()
  const emailErrors = actionData?.fieldErrors.email
  const passwordErrors = actionData?.fieldErrors.password
  return (
    <Form method="post" className="max-w-[40ch]">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          type="email"
          id="email"
          name="email"
          required
          autoComplete="email"
          aria-invalid={emailErrors?.length ? true : undefined}
          aria-describedby="email-error"
        />
        <FieldError
          id="email-error"
          className="min-h-[1rlh] text-red-700"
          aria-live="polite"
          errors={emailErrors}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          type="password"
          id="password"
          name="password"
          required
          autoComplete="new-password"
          aria-invalid={passwordErrors?.length ? true : undefined}
          aria-describedby="password-error"
        />
        <FieldError
          id="password-error"
          className="min-h-[1rlh] text-red-700"
          aria-live="polite"
          errors={passwordErrors}
        />
      </div>
      <button type="submit">Sign up</button>
    </Form>
  )
}

function FieldError({
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
