CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lender" TEXT NOT NULL,
    "originalAmount" BIGINT NOT NULL,
    "category" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "dueDate" TEXT,
    "monthlyTarget" BIGINT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DebtPayment" (
    "id" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "paymentDate" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "notes" TEXT,

    CONSTRAINT "DebtPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Debt_userId_idx" ON "Debt"("userId");
CREATE INDEX "DebtPayment_debtId_paymentDate_idx" ON "DebtPayment"("debtId", "paymentDate");
CREATE INDEX "DebtPayment_expenseId_idx" ON "DebtPayment"("expenseId");

ALTER TABLE "Debt" ADD CONSTRAINT "Debt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_debtId_fkey"
FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
