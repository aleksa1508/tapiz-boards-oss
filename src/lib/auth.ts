import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import {
  clearLoginFailures,
  clientIp,
  isLoginThrottled,
  recordLoginFailure,
} from "./login-throttle";
import { loginSchema } from "@/domain/validation/user.schema";
import { usersRepo } from "@/infrastructure/repositories/users.repo";
import { fullName } from "@/domain/types";

/** Too many failed logins for this email/IP — see login-throttle.ts. */
export class LoginThrottledError extends CredentialsSignin {
  code = "throttled";
}

export const { handlers, auth, signIn, signOut, unstable_update: updateSession } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const ip = clientIp(request.headers);
        if (isLoginThrottled(email, ip)) throw new LoginThrottledError();
        const user = await usersRepo.findByEmail(email);
        const valid =
          user !== null &&
          user.isActive !== false &&
          (await bcrypt.compare(password, user.passwordHash));
        if (!user || !valid) {
          recordLoginFailure(email, ip);
          return null;
        }
        clearLoginFailures(email);
        return {
          id: user.id,
          email: user.email,
          name: fullName(user),
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
  },
});
