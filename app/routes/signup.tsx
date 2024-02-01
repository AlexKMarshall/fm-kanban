import { ActionFunctionArgs, redirect, json } from '@remix-run/node'
import { Form, Link, useActionData, useNavigation } from '@remix-run/react'
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
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useForm } from '@conform-to/react'

export const loader = redirectIfLoggedInLoader

const signupSchema = z.object({
  email: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string({ required_error: 'Email is required' }).email('Email is invalid'),
  ),
  password: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z
      .string({ required_error: 'Password is required' })
      .min(10, 'Must be at least 10 characters')
      .regex(/[a-z]/i, 'Must contain at least one letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
  ),
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

  const submission = await parseWithZod(formData, {
    schema: signupServerSchema,
    async: true,
  })

  if (submission.status !== 'success') {
    return json(submission.reply(), { status: 400 })
  }

  const { email, password } = submission.value

  const user = await createAccount({ email, password })
  const redirectHome = redirect('/home')
  await setAuthOnResponse(redirectHome, user.id)
  return redirectHome
}

const INTENTS = {
  signUp: {
    value: 'signUp',
    fieldName: 'intent',
  },
} as const

export default function Signup() {
  const lastResult = useActionData<typeof action>()
  const [form, fields] = useForm<z.infer<typeof signupSchema>>({
    shouldValidate: 'onSubmit',
    lastResult,
    constraint: getZodConstraint(signupSchema),
  })
  const navigation = useNavigation()
  const isSigningUp =
    navigation.formData?.get(INTENTS.signUp.fieldName) === INTENTS.signUp.value

  return (
    <div>
      <h1>Sign up</h1>
      <Form
        method="post"
        className="max-w-[40ch]"
        id={form.id}
        aria-invalid={form.errors?.length ? true : undefined}
        onSubmit={form.onSubmit}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={fields.email.id}>Email</Label>
          <Input
            type="email"
            id={fields.email.id}
            name={fields.email.name}
            defaultValue={fields.email.initialValue}
            required={fields.email.required}
            autoComplete="email"
            aria-invalid={fields.email.errors?.length ? true : undefined}
            aria-describedby={
              fields.email.errors?.length ? fields.email.errorId : undefined
            }
          />
          <FieldError
            id={fields.email.errorId}
            className="min-h-[1rlh] text-red-700"
            aria-live="polite"
            errors={fields.email.errors}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={fields.password.id}>Password</Label>
          <Input
            type="password"
            id={fields.password.id}
            name={fields.password.name}
            required
            autoComplete="new-password"
            aria-invalid={fields.password.errors?.length ? true : undefined}
            aria-describedby={
              fields.password.errors?.length
                ? fields.password.errorId
                : undefined
            }
          />
          <FieldError
            id="password-error"
            className="min-h-[1rlh] text-red-700"
            aria-live="polite"
            errors={fields.password.errors}
          />
        </div>
        <FieldError id={form.errorId} aria-live="polite" errors={form.errors} />
        <button
          type="submit"
          name={INTENTS.signUp.fieldName}
          value={INTENTS.signUp.value}
          className="flex gap-4"
        >
          Sign up
          <span
            className={isSigningUp ? 'animate-pulse' : 'hidden'}
            aria-hidden
          >
            🐡
          </span>
        </button>
      </Form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
      <h2>Privacy notice</h2>
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
