CREATE TABLE "RecurringBill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "frequency" TEXT NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "startMonth" TEXT NOT NULL,
    "endMonth" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "RecurringBill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillPayment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "paymentDate" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "notes" TEXT,

    CONSTRAINT "BillPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecurringBill_userId_idx" ON "RecurringBill"("userId");
CREATE UNIQUE INDEX "BillPayment_billId_period_key" ON "BillPayment"("billId", "period");
CREATE INDEX "BillPayment_billId_paymentDate_idx" ON "BillPayment"("billId", "paymentDate");

ALTER TABLE "RecurringBill" ADD CONSTRAINT "RecurringBill_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillPayment" ADD CONSTRAINT "BillPayment_billId_fkey"
FOREIGN KEY ("billId") REFERENCES "RecurringBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
