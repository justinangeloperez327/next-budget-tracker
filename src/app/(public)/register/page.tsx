import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentUser } from "@/lib/server/session";

export default async function Page() {
  if (await currentUser()) redirect("/dashboard");
  return <AuthForm register />;
}
