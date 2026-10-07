import { currentUser } from "@/lib/server/session";
import { db } from "@/lib/server/db";
import {
  sameOrigin,
  readJson,
  HttpError,
  failure,
  json,
} from "@/lib/server/http";
import { validWorkspace } from "@/lib/workspace-validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) throw new HttpError(401, "Log in to access your workspace.");
    const snapshot = await db().$transaction(
      (tx) =>
        tx.user.findUniqueOrThrow({
          where: { id: user.id },
          include: {
            expenses: true,
            budgets: { include: { allocations: true } },
          },
        }),
      { isolationLevel: "RepeatableRead" },
    );
    return json({
      user: { email: user.email, name: user.name },
      revision: snapshot.revision,
      data: {
        expenses: snapshot.expenses.map((e) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          category: e.category,
          date: e.date,
        })),
        budgets: Object.fromEntries(
          snapshot.budgets.map((b) => [b.month, Number(b.amount)]),
        ),
        categoryBudgets: Object.fromEntries(
          snapshot.budgets
            .filter((b) => b.allocations.length)
            .map((b) => [
              b.month,
              Object.fromEntries(
                b.allocations.map((allocation) => [
                  allocation.category,
                  Number(allocation.amount),
                ]),
              ),
            ]),
        ),
      },
    });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const user = await currentUser();
    if (!user)
      throw new HttpError(
        401,
        "Your session has expired. Log in again to save your changes.",
      );
    const input = await readJson(request, 600000);
    if (
      !Number.isSafeInteger(input.revision) ||
      Number(input.revision) < 0 ||
      !validWorkspace(input.data)
    )
      throw new HttpError(
        400,
        "Invalid expense or budget data. Maximum 2,000 expenses, 600 budget months, and 4,200 category budgets.",
      );

    const data = input.data;
    const categoryBudgets = data.categoryBudgets ?? {};
    const revision = Number(input.revision);
    await db().$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: { id: user.id, revision },
        data: { revision: { increment: 1 } },
      });
      if (!updated.count)
        throw new HttpError(
          409,
          "Your notebook changed in another tab or device. Reload before editing again.",
        );

      await tx.expense.deleteMany({ where: { userId: user.id } });
      await tx.budget.deleteMany({ where: { userId: user.id } });

      if (data.expenses.length)
        await tx.expense.createMany({
          data: data.expenses.map((e) => ({
            id: e.id,
            description: e.description,
            category: e.category,
            date: e.date,
            amount: BigInt(e.amount),
            userId: user.id,
          })),
        });

      const budgetMonths = [
        ...new Set([
          ...Object.keys(data.budgets),
          ...Object.keys(categoryBudgets),
        ]),
      ];
      if (budgetMonths.length)
        await tx.budget.createMany({
          data: budgetMonths.map((month) => ({
            month,
            amount: BigInt(data.budgets[month] ?? 0),
            userId: user.id,
          })),
        });

      const allocations = Object.entries(categoryBudgets).flatMap(
        ([month, categoryAmounts]) =>
          Object.entries(categoryAmounts).flatMap(([category, amount]) =>
            amount === undefined
              ? []
              : [
                  {
                    userId: user.id,
                    month,
                    category,
                    amount: BigInt(amount),
                  },
                ],
          ),
      );
      if (allocations.length)
        await tx.budgetAllocation.createMany({ data: allocations });
    });

    return json({ revision: revision + 1 });
  } catch (error) {
    return failure(error);
  }
}
