import { redirect } from "next/navigation";
import { BudgetProvider } from "@/components/budget-provider";
import { Workspace } from "@/components/workspace";
import { currentUser } from "@/lib/server/session";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await currentUser())) redirect("/login");
  return (
    <BudgetProvider>
      <Workspace>{children}</Workspace>
    </BudgetProvider>
  );
}
