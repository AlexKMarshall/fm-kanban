import { ActionFunctionArgs, redirect } from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { z } from 'zod'
import { hashPassword, setAuthOnResponse } from '~/auth'
import { prisma } from '~/db/prisma.server'
import { FieldError } from '~/ui/field-error'
import { Input } from '~/ui/input'
import { Label } from '~/ui/label'

const loginSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(10, 'Must be at least 10 characters')
    .regex(/[a-z]/i, 'Must contain at least one letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
})

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const rawEmail = formData.get('email')
  const rawPassword = formData.get('password')

  const result = await loginSchema.safeParseAsync({
    email: rawEmail,
    password: rawPassword,
  })

  if (!result.success) {
    return result.error.flatten()
  }

  const { email, password } = result.data

  const userId = await loginUser({ email, password })
  const redirectHome = redirect('/')
  await setAuthOnResponse(redirectHome, userId)
  return redirectHome
}

export default function Login() {
  const actionData = useActionData<typeof action>()
  const emailErrors = actionData?.fieldErrors.email
  const passwordErrors = actionData?.fieldErrors.password
  return (
    <div>
      <h1>Login</h1>
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
        <button type="submit">Login</button>
      </Form>
    </div>
  )
}

async function loginUser({
  email,
  password,
}: {
  email: string
  password: string
}) {
  const account = await prisma.account.findUnique({
    where: { email },
    include: { Password: true },
  })
  if (!account || !account.Password) return false

  const hash = hashPassword({ password, salt: account.Password.salt })

  if (hash !== account.Password.hash) return false

  return account.id
}
