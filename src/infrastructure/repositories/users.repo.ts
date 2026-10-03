import { cache } from "react";
import { and, asc, count, eq, ne } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { users } from "@/infrastructure/db/schema";
import type { NewUser, UserRecord, UsersRepo } from "@/application/ports";
import type { UserDto } from "@/domain/types";

const dtoColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  role: users.role,
  isActive: users.isActive,
};

/** Dedupe identical calls within the same request — layout, dashboard and actions
 * on the same page often look up the same user (see guards.ts, page.tsx). */
const findByIdCached = cache(async (id: string): Promise<UserDto | null> => {
  const rows = await db.select(dtoColumns).from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
});

export const usersRepo: UsersRepo = {
  async listAll(): Promise<UserDto[]> {
    return db
      .select(dtoColumns)
      .from(users)
      .orderBy(asc(users.lastName), asc(users.firstName));
  },

  async countActiveAdmins(): Promise<number> {
    const [row] = await db
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
    return row?.n ?? 0;
  },

  findById: findByIdCached,

  async findRecordById(id: string): Promise<UserRecord | null> {
    const rows = await db
      .select({ ...dtoColumns, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    const rows = await db
      .select({ ...dtoColumns, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows[0] ?? null;
  },

  async create(user: NewUser): Promise<UserDto> {
    const id = crypto.randomUUID();
    await db.insert(users).values({ ...user, id });
    return {
      id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive ?? true,
    };
  },

  async update(id: string, patch: Partial<NewUser>): Promise<void> {
    await db.update(users).set(patch).where(eq(users.id, id));
  },

  async delete(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  },
};

/** Excludes `excludeUserId` — used by the last-active-admin check when evaluating
 * whether deactivating/deleting a specific admin would leave zero admins. */
export async function countActiveAdminsExcluding(excludeUserId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true), ne(users.id, excludeUserId)));
  return row?.n ?? 0;
}
