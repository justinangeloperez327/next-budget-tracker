-- CreateTable
CREATE TABLE "BudgetAllocation" (
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,

    CONSTRAINT "BudgetAllocation_pkey" PRIMARY KEY ("userId","month","category")
);

-- AddForeignKey
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_userId_month_fkey" FOREIGN KEY ("userId", "month") REFERENCES "Budget"("userId", "month") ON DELETE CASCADE ON UPDATE CASCADE;
