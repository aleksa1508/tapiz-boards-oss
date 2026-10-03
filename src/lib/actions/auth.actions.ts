"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn, signOut } from "@/lib/auth";
import { loginSchema } from "@/domain/validation/user.schema";
import { ok, fail, type ActionResult } from "@/lib/action-result";

export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
    return ok(undefined);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    // Code set by LoginThrottledError in auth.ts.
    if (err instanceof CredentialsSignin && err.code === "throttled") {
      return fail("Previše neuspelih pokušaja prijave. Pokušajte ponovo za 15 minuta.");
    }
    if (err instanceof AuthError) return fail("Pogrešan email ili lozinka");
    throw err;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
