import { sql } from "drizzle-orm";
import { db } from "../src/infrastructure/db/client";

async function main() {
  await db.execute(sql`
    UPDATE stories s
    JOIN users u ON u.id = s.author_id
    SET s.author_name = CONCAT(u.first_name, ' ', u.last_name), s.author_email = u.email
    WHERE s.author_id IS NOT NULL AND (s.author_name = '' OR s.author_email = '')
  `);
  await db.execute(sql`
    UPDATE comments c
    JOIN users u ON u.id = c.author_id
    SET c.author_name = CONCAT(u.first_name, ' ', u.last_name), c.author_email = u.email
    WHERE c.author_id IS NOT NULL AND (c.author_name = '' OR c.author_email = '')
  `);
  await db.execute(sql`
    UPDATE sprint_retro_items r
    JOIN users u ON u.id = r.author_id
    SET r.author_name = CONCAT(u.first_name, ' ', u.last_name), r.author_email = u.email
    WHERE r.author_id IS NOT NULL AND (r.author_name = '' OR r.author_email = '')
  `);
  await db.execute(sql`
    UPDATE project_events e
    JOIN users u ON u.id = e.actor_id
    SET e.actor_name = CONCAT(u.first_name, ' ', u.last_name), e.actor_email = u.email
    WHERE e.actor_id IS NOT NULL AND (e.actor_name = '' OR e.actor_email = '')
  `);
  console.log("Legacy author and activity snapshots backfilled.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("Failed to backfill author snapshots:", error);
  process.exit(1);
});
