import { NextResponse, type NextRequest } from "next/server";
import { signOut } from "@/lib/auth";
import { resolveSession } from "@/lib/guards";

export const dynamic = "force-dynamic";

/**
 * Clears the cookie of a session whose account was deactivated or deleted.
 * Pages redirect here because a server component can't modify cookies. An
 * active session is left alone, so a cross-site link can't log anyone out.
 */
export async function GET(req: NextRequest) {
  const state = await resolveSession();
  if (state.kind === "active") return NextResponse.redirect(new URL("/", req.url));
  await signOut({ redirectTo: "/login" });
}
