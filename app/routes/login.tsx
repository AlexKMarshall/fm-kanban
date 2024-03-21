import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { Form, Link, useActionData, useNavigation } from '@remix-run/react'
import { z } from 'zod'

import { hashPassword } from '~/auth'
import { redirectIfLoggedInLoader, setAuthOnResponse } from '~/auth-old'
import { prisma } from '~/db/prisma.server'
import { FieldError } from '~/ui/field-error'
import { Input } from '~/ui/input'
import { Label } from '~/ui/label'

export const loader = redirectIfLoggedInLoader

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const loginServerSchema = loginSchema.transform(async (data, ctx) => {
  const userId = await loginUser({
    email: data.email,
    password: data.password,
  })
  if (!userId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid email or password',
      path: ['email'],
    })
    return z.NEVER
  }

  return { ...data, userId }
})

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()

  const submission = await parseWithZod(formData, {
    schema: loginServerSchema,
    async: true,
  })

  if (submission.status !== 'success') {
    return json(submission.reply({ hideFields: ['password'] }), { status: 400 })
  }

  const { userId } = submission.value

  const redirectHome = redirect('/')
  await setAuthOnResponse(redirectHome, userId)
  return redirectHome
}

const INTENTS = {
  login: {
    value: 'login',
    fieldName: 'intent',
  },
} as const

export default function Login() {
  const lastResult = useActionData<typeof action>()
  const [form, fields] = useForm<z.infer<typeof loginSchema>>({
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    lastResult,
    constraint: getZodConstraint(loginSchema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: loginSchema })
    },
  })
  const navigation = useNavigation()
  const isLoggingIn =
    navigation.formData?.get(INTENTS.login.fieldName) === INTENTS.login.value

  return (
    <div>
      <h1>Login</h1>
      <Form method="post" className="max-w-[40ch]" {...getFormProps(form)}>
        <div className="flex flex-col gap-2">
          <Label htmlFor={fields.email.id}>Email</Label>
          <Input
            {...getInputProps(fields.email, { type: 'email' })}
            autoComplete="email"
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
            {...getInputProps(fields.password, { type: 'password' })}
            autoComplete="password"
          />
          <FieldError
            id={fields.password.errorId}
            className="min-h-[1rlh] text-red-700"
            aria-live="polite"
            errors={fields.password.errors}
          />
        </div>
        <FieldError id={form.errorId} aria-live="polite" errors={form.errors} />
        <button
          type="submit"
          name={INTENTS.login.fieldName}
          value={INTENTS.login.value}
        >
          Login
          <span className={isLoggingIn ? 'animate-pulse' : 'hidden'}>🌀</span>
        </button>
        <p>
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
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
