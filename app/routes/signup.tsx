import { ActionFunctionArgs, redirect, json } from '@remix-run/node'
import { Form, Link, useActionData } from '@remix-run/react'
import { z } from 'zod'
import {
  getNewSalt,
  hashPassword,
  redirectIfLoggedInLoader,
  setAuthOnResponse,
} from '~/auth'
import { Input } from '~/ui/input'
import { Label } from '~/ui/label'
import { FieldError } from '~/ui/field-error'
import { prisma } from '~/db/prisma.server'

export const loader = redirectIfLoggedInLoader

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
    return json(result.error.flatten(), { status: 400 })
  }

  const { email, password } = result.data

  const user = await createAccount({ email, password })
  const redirectHome = redirect('/home')
  await setAuthOnResponse(redirectHome, user.id)
  return redirectHome
}

export default function Signup() {
  const actionData = useActionData<typeof action>()
  const emailErrors = actionData?.fieldErrors.email
  const passwordErrors = actionData?.fieldErrors.password
  return (
    <div>
      <h1>Sign up</h1>
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
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
      <h2>Privacy notice</h2>
      <p>
        <p>
          We won&apos;t use your email address for anything other than
          authenticating with this demo application. This app doesn&apos;t send
          email anyway, so you can put whatever fake email address you want.
        </p>
        <h2>Terms of service</h2>
        <p>
          This is a demo app, there are no terms of service. Don&apos;t be
          surprised if your data disappears.
        </p>
      </p>
    </div>
  )
}

async function accountExists(email: string) {
  const account = await prisma.account.findUnique({
    where: { email },
  })

  return Boolean(account)
}

async function createAccount({
  email,
  password,
}: {
  email: string
  password: string
}) {
  const salt = getNewSalt()
  const hash = hashPassword({ password, salt })

  return prisma.account.create({
    data: {
      email,
      Password: {
        create: {
          hash,
          salt,
        },
      },
    },
  })
}
