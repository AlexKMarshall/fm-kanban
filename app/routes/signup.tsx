import { ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { HTMLAttributes } from "react";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(10, "Must be at least 10 characters")
    .regex(/[a-z]/i, "Must contain at least one letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  const result = signupSchema.safeParse({ email, password });

  if (!result.success) {
    return result.error.flatten();
  }
  return null;
}

export default function Signup() {
  const actionData = useActionData<typeof action>();
  const emailErrors = actionData?.fieldErrors.email;
  const passwordErrors = actionData?.fieldErrors.password;
  return (
    <Form method="post" className="max-w-[40ch]">
      <div className="flex flex-col gap-2">
        <label htmlFor="email">Email</label>
        <input
          className="border border-gray-700 aria-[invalid]:border-red-700"
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
          className="text-red-700 min-h-[1rlh]"
          aria-live="polite"
          errors={emailErrors}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password">Password</label>
        <input
          className="border border-gray-700 aria-[invalid]:border-red-700"
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
          className="text-red-700 min-h-[1rlh]"
          aria-live="polite"
          errors={passwordErrors}
        />
      </div>
      <button type="submit">Sign up</button>
    </Form>
  );
}

function FieldError({
  errors = [],
  ...props
}: { errors: string[] | undefined } & Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
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
  );
}
