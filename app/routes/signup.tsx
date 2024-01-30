import { ActionFunctionArgs } from "@remix-run/node";
import { Form } from "@remix-run/react";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  console.log(formData.get("email"));
  console.log(formData.get("password"));
  return null;
}

export default function Signup() {
  return (
    <Form method="post">
      <div>
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          required
          autoComplete="new-password"
        />
      </div>
      <button type="submit">Sign up</button>
    </Form>
  );
}
