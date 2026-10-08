CREATE TABLE "Mp2Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountNumber" TEXT,
    "dividendOption" TEXT NOT NULL,
    "initialPaymentDate" TEXT,
    "monthlyTarget" BIGINT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Mp2Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Mp2Deposit" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "paymentDate" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "referenceNumber" TEXT,
    "notes" TEXT,

    CONSTRAINT "Mp2Deposit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Mp2Account_userId_accountNumber_key" ON "Mp2Account"("userId", "accountNumber");
CREATE INDEX "Mp2Account_userId_idx" ON "Mp2Account"("userId");
CREATE INDEX "Mp2Deposit_accountId_paymentDate_idx" ON "Mp2Deposit"("accountId", "paymentDate");

ALTER TABLE "Mp2Account" ADD CONSTRAINT "Mp2Account_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Mp2Deposit" ADD CONSTRAINT "Mp2Deposit_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Mp2Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
