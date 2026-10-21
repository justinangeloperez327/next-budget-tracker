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
import { normalizeManagedExpenseLinks } from "@/lib/workspace-normalization";
import { reconcileRecords } from "@/lib/workspace-reconcile";
import type { BudgetData } from "@/lib/budget";

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
            governmentAccounts: { include: { contributions: true } },
            mp2Accounts: { include: { deposits: true } },
            recurringBills: { include: { payments: true } },
            debts: { include: { payments: true } },
            savingsGoals: { include: { deposits: true } },
            remittances: true,
          },
        }),
      { isolationLevel: "RepeatableRead" },
    );
    return json({
      user: { email: user.email, name: user.name },
      revision: snapshot.revision,
      data: normalizeManagedExpenseLinks({
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
        governmentAccounts: snapshot.governmentAccounts.map((account) => ({
          id: account.id,
          provider: account.provider,
          memberType: account.memberType,
          ...(account.accountIdentifier
            ? { accountIdentifier: account.accountIdentifier }
            : {}),
          ...(account.monthlyTarget === null
            ? {}
            : { monthlyTarget: Number(account.monthlyTarget) }),
          frequency: account.frequency,
          active: account.active,
        })),
        governmentContributions: snapshot.governmentAccounts.flatMap(
          (account) =>
            account.contributions.map((contribution) => ({
              id: contribution.id,
              accountId: contribution.accountId,
              period: contribution.period,
              amount: Number(contribution.amount),
              ...(contribution.paymentDate
                ? { paymentDate: contribution.paymentDate }
                : {}),
              status: contribution.status,
              ...(contribution.referenceNumber
                ? { referenceNumber: contribution.referenceNumber }
                : {}),
              ...(contribution.notes ? { notes: contribution.notes } : {}),
            })),
        ),
        mp2Accounts: snapshot.mp2Accounts.map((account) => ({
          id: account.id,
          name: account.name,
          ...(account.accountNumber
            ? { accountNumber: account.accountNumber }
            : {}),
          dividendOption: account.dividendOption,
          ...(account.initialPaymentDate
            ? { initialPaymentDate: account.initialPaymentDate }
            : {}),
          ...(account.monthlyTarget === null
            ? {}
            : { monthlyTarget: Number(account.monthlyTarget) }),
          active: account.active,
        })),
        mp2Deposits: snapshot.mp2Accounts.flatMap((account) =>
          account.deposits.map((deposit) => ({
            id: deposit.id,
            accountId: deposit.accountId,
            paymentDate: deposit.paymentDate,
            amount: Number(deposit.amount),
            ...(deposit.referenceNumber
              ? { referenceNumber: deposit.referenceNumber }
              : {}),
            ...(deposit.notes ? { notes: deposit.notes } : {}),
          })),
        ),
        recurringBills: snapshot.recurringBills.map((bill) => ({
          id: bill.id,
          name: bill.name,
          category: bill.category,
          amount: Number(bill.amount),
          frequency: bill.frequency,
          dueDay: bill.dueDay,
          startMonth: bill.startMonth,
          ...(bill.endMonth ? { endMonth: bill.endMonth } : {}),
          active: bill.active,
          ...(bill.notes ? { notes: bill.notes } : {}),
        })),
        billPayments: snapshot.recurringBills.flatMap((bill) =>
          bill.payments.map((payment) => ({
            id: payment.id,
            billId: payment.billId,
            period: payment.period,
            amount: Number(payment.amount),
            paymentDate: payment.paymentDate,
            expenseId: payment.expenseId,
            ...(payment.referenceNumber
              ? { referenceNumber: payment.referenceNumber }
              : {}),
            ...(payment.notes ? { notes: payment.notes } : {}),
          })),
        ),
        debts: snapshot.debts.map((debt) => ({
          id: debt.id,
          name: debt.name,
          lender: debt.lender,
          originalAmount: Number(debt.originalAmount),
          category: debt.category,
          startDate: debt.startDate,
          ...(debt.dueDate ? { dueDate: debt.dueDate } : {}),
          ...(debt.monthlyTarget === null
            ? {}
            : { monthlyTarget: Number(debt.monthlyTarget) }),
          active: debt.active,
          ...(debt.notes ? { notes: debt.notes } : {}),
        })),
        debtPayments: snapshot.debts.flatMap((debt) =>
          debt.payments.map((payment) => ({
            id: payment.id,
            debtId: payment.debtId,
            amount: Number(payment.amount),
            paymentDate: payment.paymentDate,
            expenseId: payment.expenseId,
            ...(payment.referenceNumber
              ? { referenceNumber: payment.referenceNumber }
              : {}),
            ...(payment.notes ? { notes: payment.notes } : {}),
          })),
        ),
        savingsGoals: snapshot.savingsGoals.map((goal) => ({
          id: goal.id,
          name: goal.name,
          targetAmount: Number(goal.targetAmount),
          startDate: goal.startDate,
          ...(goal.targetDate ? { targetDate: goal.targetDate } : {}),
          ...(goal.monthlyTarget === null
            ? {}
            : { monthlyTarget: Number(goal.monthlyTarget) }),
          ...(goal.destination ? { destination: goal.destination } : {}),
          active: goal.active,
          ...(goal.notes ? { notes: goal.notes } : {}),
        })),
        savingsDeposits: snapshot.savingsGoals.flatMap((goal) =>
          goal.deposits.map((deposit) => ({
            id: deposit.id,
            goalId: deposit.goalId,
            amount: Number(deposit.amount),
            depositDate: deposit.depositDate,
            ...(deposit.referenceNumber
              ? { referenceNumber: deposit.referenceNumber }
              : {}),
            ...(deposit.notes ? { notes: deposit.notes } : {}),
          })),
        ),
        remittances: snapshot.remittances.map((entry) => ({
          id: entry.id,
          recipient: entry.recipient,
          destinationType: entry.destinationType,
          ...(entry.provider ? { provider: entry.provider } : {}),
          sentAmount: Number(entry.sentAmount),
          feeAmount: Number(entry.feeAmount),
          ...(entry.receivedAmount === null
            ? {}
            : { receivedAmount: Number(entry.receivedAmount) }),
          transferDate: entry.transferDate,
          status: entry.status,
          principalAsExpense: entry.principalAsExpense,
          category: entry.category,
          ...(entry.expenseId ? { expenseId: entry.expenseId } : {}),
          ...(entry.referenceNumber
            ? { referenceNumber: entry.referenceNumber }
            : {}),
          ...(entry.notes ? { notes: entry.notes } : {}),
        })),
      } as BudgetData),
    });
  } catch (error) {
    return failure(error, "workspace.load");
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
        "Invalid workspace data. Check the expense, budget, and contribution limits and field values.",
      );

    const data = input.data;
    const categoryBudgets = data.categoryBudgets ?? {};
    const governmentAccounts = data.governmentAccounts ?? [];
    const governmentContributions = data.governmentContributions ?? [];
    const mp2Accounts = data.mp2Accounts ?? [];
    const mp2Deposits = data.mp2Deposits ?? [];
    const recurringBills = data.recurringBills ?? [];
    const billPayments = data.billPayments ?? [];
    const debts = data.debts ?? [];
    const debtPayments = data.debtPayments ?? [];
    const savingsGoals = data.savingsGoals ?? [];
    const savingsDeposits = data.savingsDeposits ?? [];
    const remittances = data.remittances ?? [];
    const revision = Number(input.revision);
    await db().$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: { id: user.id, revision },
        data: { revision: { increment: 1 } },
      });
      if (!updated.count)
        throw new HttpError(
          409,
          "Your workspace changed in another tab or device. Reload before editing again.",
        );

      // Load only the authenticated user's rows under the revision lock.
      const snapshot = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          expenses: true,
          budgets: { include: { allocations: true } },
          governmentAccounts: { include: { contributions: true } },
          mp2Accounts: { include: { deposits: true } },
          recurringBills: { include: { payments: true } },
          debts: { include: { payments: true } },
          savingsGoals: { include: { deposits: true } },
          remittances: true,
        },
      });

      const budgetMonths = [
        ...new Set([
          ...Object.keys(data.budgets),
          ...Object.keys(categoryBudgets),
        ]),
      ];
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
      const desired0 = data.expenses.map((e) => ({
            id: e.id,
            description: e.description,
            category: e.category,
            date: e.date,
            amount: BigInt(e.amount),
            userId: user.id,
          }));
      const desired1 = budgetMonths.map((month) => ({
            month,
            amount: BigInt(data.budgets[month] ?? 0),
            userId: user.id,
          }));
      const desired2 = allocations });

      if (governmentAccounts.length)
        await tx.governmentAccount.createMany({
          data: governmentAccounts.map((account) => ({
            id: account.id,
            userId: user.id,
            provider: account.provider,
            memberType: account.memberType,
            accountIdentifier: account.accountIdentifier ?? null,
            monthlyTarget:
              account.monthlyTarget === undefined
                ? null
                : BigInt(account.monthlyTarget),
            frequency: account.frequency,
            active: account.active,
          }));
      const desired3 = governmentAccounts.map((account) => ({
            id: account.id,
            userId: user.id,
            provider: account.provider,
            memberType: account.memberType,
            accountIdentifier: account.accountIdentifier ?? null,
            monthlyTarget:
              account.monthlyTarget === undefined
                ? null
                : BigInt(account.monthlyTarget),
            frequency: account.frequency,
            active: account.active,
          }));
      const desired4 = governmentContributions.map((contribution) => ({
            id: contribution.id,
            accountId: contribution.accountId,
            period: contribution.period,
            amount: BigInt(contribution.amount),
            paymentDate: contribution.paymentDate ?? null,
            status: contribution.status,
            referenceNumber: contribution.referenceNumber ?? null,
            notes: contribution.notes ?? null,
          }));
      const desired5 = mp2Accounts.map((account) => ({
            id: account.id,
            userId: user.id,
            name: account.name,
            accountNumber: account.accountNumber ?? null,
            dividendOption: account.dividendOption,
            initialPaymentDate: account.initialPaymentDate ?? null,
            monthlyTarget:
              account.monthlyTarget === undefined
                ? null
                : BigInt(account.monthlyTarget),
            active: account.active,
          }));
      const desired6 = mp2Deposits.map((deposit) => ({
            id: deposit.id,
            accountId: deposit.accountId,
            paymentDate: deposit.paymentDate,
            amount: BigInt(deposit.amount),
            referenceNumber: deposit.referenceNumber ?? null,
            notes: deposit.notes ?? null,
          }));
      const desired7 = recurringBills.map((bill) => ({
            id: bill.id,
            userId: user.id,
            name: bill.name,
            category: bill.category,
            amount: BigInt(bill.amount),
            frequency: bill.frequency,
            dueDay: bill.dueDay,
            startMonth: bill.startMonth,
            endMonth: bill.endMonth ?? null,
            active: bill.active,
            notes: bill.notes ?? null,
          }));
      const desired8 = billPayments.map((payment) => ({
            id: payment.id,
            billId: payment.billId,
            period: payment.period,
            amount: BigInt(payment.amount),
            paymentDate: payment.paymentDate,
            expenseId: payment.expenseId,
            referenceNumber: payment.referenceNumber ?? null,
            notes: payment.notes ?? null,
          }));
      const desired9 = debts.map((debt) => ({
            id: debt.id,
            userId: user.id,
            name: debt.name,
            lender: debt.lender,
            originalAmount: BigInt(debt.originalAmount),
            category: debt.category,
            startDate: debt.startDate,
            dueDate: debt.dueDate ?? null,
            monthlyTarget:
              debt.monthlyTarget === undefined
                ? null
                : BigInt(debt.monthlyTarget),
            active: debt.active,
            notes: debt.notes ?? null,
          }));
      const desired10 = debtPayments.map((payment) => ({
            id: payment.id,
            debtId: payment.debtId,
            amount: BigInt(payment.amount),
            paymentDate: payment.paymentDate,
            expenseId: payment.expenseId,
            referenceNumber: payment.referenceNumber ?? null,
            notes: payment.notes ?? null,
          }));
      const desired11 = savingsGoals.map((goal) => ({
            id: goal.id,
            userId: user.id,
            name: goal.name,
            targetAmount: BigInt(goal.targetAmount),
            startDate: goal.startDate,
            targetDate: goal.targetDate ?? null,
            monthlyTarget:
              goal.monthlyTarget === undefined
                ? null
                : BigInt(goal.monthlyTarget),
            destination: goal.destination ?? null,
            active: goal.active,
            notes: goal.notes ?? null,
          }));
      const desired12 = savingsDeposits.map((deposit) => ({
            id: deposit.id,
            goalId: deposit.goalId,
            amount: BigInt(deposit.amount),
            depositDate: deposit.depositDate,
            referenceNumber: deposit.referenceNumber ?? null,
            notes: deposit.notes ?? null,
          }));
      const desired13 = remittances.map((entry) => ({
            id: entry.id,
            userId: user.id,
            recipient: entry.recipient,
            destinationType: entry.destinationType,
            provider: entry.provider ?? null,
            sentAmount: BigInt(entry.sentAmount),
            feeAmount: BigInt(entry.feeAmount),
            receivedAmount:
              entry.receivedAmount === undefined
                ? null
                : BigInt(entry.receivedAmount),
            transferDate: entry.transferDate,
            status: entry.status,
            principalAsExpense: entry.principalAsExpense,
            category: entry.category,
            expenseId: entry.expenseId ?? null,
            referenceNumber: entry.referenceNumber ?? null,
            notes: entry.notes ?? null,
          }));

      // Parents first; deleted parents cascade to child records.
      // Only retained parents contribute rows for child reconciliation.
      await reconcileRecords(
        snapshot.expenses,
        desired0,
        (row) => row.id,
        (row) => row.id,
        {
          remove: (keys) => tx.expense.deleteMany({ where: { userId: user.id, id: { in: keys } } }),
          insert: (rows) => tx.expense.createMany({ data: rows }),
          update: (record) => { const { id, ...changes } = record; return tx.expense.update({ where: { userId_id: { userId: user.id, id } }, data: changes }); },
        },
      );

      await reconcileRecords(
        snapshot.budgets,
        desired1,
        (row) => row.month,
        (row) => row.month,
        {
          remove: (keys) => tx.budget.deleteMany({ where: { userId: user.id, month: { in: keys } } }),
          insert: (rows) => tx.budget.createMany({ data: rows }),
          update: (record) => tx.budget.update({ where: { userId_month: { userId: user.id, month: record.month } }, data: { amount: record.amount } }),
        },
      );

      await reconcileRecords(
        snapshot.budgets.filter((parent) => desired1.some((row) => row.month === parent.month)).flatMap((parent) => parent.allocations),
        desired2,
        (row) => row.month + "|" + row.category,
        (row) => row.month + "|" + row.category,
        {
          remove: (keys) => tx.budgetAllocation.deleteMany({ where: { userId: user.id, OR: keys.map((key) => { const [month, category] = key.split("|"); return { month, category }; }) } }),
          insert: (rows) => tx.budgetAllocation.createMany({ data: rows }),
          update: (record) => tx.budgetAllocation.update({ where: { userId_month_category: { userId: user.id, month: record.month, category: record.category } }, data: { amount: record.amount } }),
        },
      );

      await reconcileRecords(
        snapshot.governmentAccounts,
        desired3,
        (row) => row.id,
        (row) => row.id,
        {
          remove: (keys) => tx.governmentAccount.deleteMany({ where: { userId: user.id, id: { in: keys } } }),
          insert: (rows) => tx.governmentAccount.createMany({ data: rows }),
          update: (record) => { const { id, ...changes } = record; return tx.governmentAccount.update({ where: { id, userId: user.id }, data: changes }); },
        },
      );

      await reconcileRecords(
        snapshot.governmentAccounts.filter((parent) => desired3.some((row) => row.id === parent.id)).flatMap((parent) => parent.contributions),
        desired4,
        (row) => row.id,
        (row) => row.id,
        {
          remove: (keys) => tx.governmentContribution.deleteMany({ where: { id: { in: keys }, account: { is: { userId: user.id } } } }),
          insert: (rows) => tx.governmentContribution.createMany({ data: rows }),
          update: (record) => { const { id, ...changes } = record; return tx.governmentContribution.update({ where: { id, account: { is: { userId: user.id } } }, data: changes }); },
        },
      );

      await reconcileRecords(
        snapshot.mp2Accounts,
        desired5,
        (row) => row.id,
        (row) => row.id,
        {
          remove: (keys) => tx.mp2Account.deleteMany({ where: { userId: user.id, id: { in: keys } } }),
          insert: (rows) => tx.mp2Account.createMany({ data: rows }),
          update: (record) => { const { id, ...changes } = record; return tx.mp2Account.update({ where: { id, userId: user.id }, data: changes }); },
        },
      );

      await reconcileRecords(
        snapshot.mp2Accounts.filter((parent) => desired5.some((row) => row.id === parent.id)).flatMap((parent) => parent.deposits),
        desired6,
        (row) => row.id,
        (row) => row.id,
        {
          remove: (keys) => tx.mp2Deposit.deleteMany({ where: { id: { in: keys }, account: { is: { userId: user.id } } } }),
          insert: (rows) => tx.mp2Deposit.createMany({ data: rows }),
          update: (record) => { const { id, ...changes } = record; return tx.mp2Deposit.update({ where: { id, account: { is: { userId: user.id } } }, data: changes }); },
        },
      );

      await reconcileRecords(
        snapshot.recurringBills,
        desired7,
        (row) => row.id,
        (row) => row.id,
        {
          remove: (keys) => tx.recurringBill.deleteMany({ where: { userId: user.id, id: { in: keys } } }),
          insert: (rows) => tx.recurringBill.createMany({ data: rows }),
          update: (record) => { const { id, ...changes } = record; return tx.recurringBill.update({ where: { id, userId: user.id }, data: changes }); },
        },
      );

      await reconcileRecords(
        snapshot.recurringBills.filter((parent) => desired7.some((row) => row.id === parent.id)).flatMap((parent) => parent.payments),
        desired8,
        (row) => row.id,
        (row) => row.id,
        {
          remove: (keys) => tx.billPayment.deleteMany({ where: { id: { in: keys }, bill: { is: { userId: user.id } } } }),
          insert: (rows) => tx.billPayment.createMany({ data: rows }),
          update: (record) => { const { id, ...changes } = record; return tx.billPayment.update({ where: { id, bill: { is: { userId: user.id } } }, data: changes }); },
        },
      );

      await reconcileRecords(
        snapshot.debts,
        desired9,
        (row) => row.id,
        (row) => row.id,
        {
          remove: (keys) => tx.debt.deleteMany({ where: { userId: user.id, id: { in: keys } } }),
          insert: (rows) => tx.debt.createMany({ data: rows }),
          update: (record) => { const { id, ...changes } = record; return tx.debt.update({ where: { id, userId: user.id }, data: changes }); },
        },
      );

      await reconcileRecords(
        snapshot.debts.filter((parent) => desired9.some((row) => row.id === parent.id)).flatMap((parent) => parent.payments),
        desired10,
        (row) => row.id,
        (row) => row.id,
        {
          remove: (keys) => tx.debtPayment.deleteMany({ where: { id: { in: keys }, debt: { is: { userId: user.id } } } }),
          insert: (rows) => tx.debtPayment.createMany({ data: rows }),
          update: (record) => { const { id, ...changes } = record; return tx.debtPayment.update({ where: { id, debt: { is: { userId: user.id } } }, data: changes }); },
        },
      );

      await reconcileRecords(
        snapshot.savingsGoals,
        desired11,
        (row) => row.id,
        (row) => row.id,
        {
          remove: (keys) => tx.savingsGoal.deleteMany({ where: { userId: user.id, id: { in: keys } } }),
          insert: (rows) => tx.savingsGoal.createMany({ data: rows }),
          update: (record) => { const { id, ...changes } = record; return tx.savingsGoal.update({ where: { id, userId: user.id }, data: changes }); },
        },
      );

      await reconcileRecords(
        snapshot.savingsGoals.filter((parent) => desired11.some((row) => row.id === parent.id)).flatMap((parent) => parent.deposits),
        desired12,
        (row) => row.id,
        (row) => row.id,
        {
          remove: (keys) => tx.savingsDeposit.deleteMany({ where: { id: { in: keys }, goal: { is: { userId: user.id } } } }),
          insert: (rows) => tx.savingsDeposit.createMany({ data: rows }),
          update: (record) => { const { id, ...changes } = record; return tx.savingsDeposit.update({ where: { id, goal: { is: { userId: user.id } } }, data: changes }); },
        },
      );

      await reconcileRecords(
        snapshot.remittances,
        desired13,
        (row) => row.id,
        (row) => row.id,
        {
          remove: (keys) => tx.remittance.deleteMany({ where: { userId: user.id, id: { in: keys } } }),
          insert: (rows) => tx.remittance.createMany({ data: rows }),
          update: (record) => { const { id, ...changes } = record; return tx.remittance.update({ where: { id, userId: user.id }, data: changes }); },
        },
      );
    }, { maxWait: 10000, timeout: 30000 });

    return json({ revision: revision + 1 });
  } catch (error) {
    return failure(error, "workspace.save");
  }
}
