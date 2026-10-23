import { mobileUser } from "@/lib/server/mobile-session";
import { loadWorkspace, saveWorkspace } from "@/lib/server/workspace-service";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return loadWorkspace(() => mobileUser(request));
}
export async function PUT(request: Request) {
  return saveWorkspace(request, () => mobileUser(request));
}
