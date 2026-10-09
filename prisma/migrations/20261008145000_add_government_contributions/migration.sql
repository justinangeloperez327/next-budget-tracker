CREATE TABLE "GovernmentAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "memberType" TEXT NOT NULL,
    "accountIdentifier" TEXT,
    "monthlyTarget" BIGINT,
    "frequency" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GovernmentAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GovernmentContribution" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "paymentDate" TEXT,
    "status" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "notes" TEXT,

    CONSTRAINT "GovernmentContribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GovernmentAccount_userId_provider_key"
ON "GovernmentAccount"("userId", "provider");

CREATE INDEX "GovernmentAccount_userId_idx"
ON "GovernmentAccount"("userId");

CREATE UNIQUE INDEX "GovernmentContribution_accountId_period_key"
ON "GovernmentContribution"("accountId", "period");

ALTER TABLE "GovernmentAccount"
ADD CONSTRAINT "GovernmentAccount_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GovernmentContribution"
ADD CONSTRAINT "GovernmentContribution_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "GovernmentAccount"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
