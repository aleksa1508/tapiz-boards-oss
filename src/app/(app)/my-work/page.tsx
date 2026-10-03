import { boardService } from "@/application/board.service";
import { requirePageSession } from "@/lib/guards";
import { MyWorkView } from "@/features/mywork/MyWorkView";

/** "My Work" — every story assigned to the user, across all projects. */
export default async function MyWorkPage() {
  const { user, profile } = await requirePageSession();
  const items = await boardService.myWork(user.id);
  return <MyWorkView firstName={profile.firstName} items={items} />;
}
