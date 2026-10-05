import { BudgetProvider } from "@/components/budget-provider";
import { Workspace } from "@/components/workspace";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <BudgetProvider>
      <Workspace>{children}</Workspace>
    </BudgetProvider>
  );
}
