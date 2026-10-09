CREATE TABLE "Remittance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "destinationType" TEXT NOT NULL,
    "provider" TEXT,
    "sentAmount" BIGINT NOT NULL,
    "feeAmount" BIGINT NOT NULL DEFAULT 0,
    "receivedAmount" BIGINT,
    "transferDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "principalAsExpense" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL,
    "expenseId" TEXT,
    "referenceNumber" TEXT,
    "notes" TEXT,

    CONSTRAINT "Remittance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Remittance_userId_transferDate_idx"
ON "Remittance"("userId", "transferDate");

CREATE INDEX "Remittance_expenseId_idx"
ON "Remittance"("expenseId");

ALTER TABLE "Remittance" ADD CONSTRAINT "Remittance_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
