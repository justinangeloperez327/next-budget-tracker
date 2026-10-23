import { currentUser } from "@/lib/server/session";
import { sameOrigin } from "@/lib/server/http";
import { loadWorkspace, saveWorkspace } from "@/lib/server/workspace-service";
export const runtime = "nodejs";
export async function GET() { return loadWorkspace(currentUser); }
export async function PUT(request: Request) {
  return saveWorkspace(request, async () => {
    sameOrigin(request);
    return currentUser();
  });
}
