-- CreateTable
CREATE TABLE "FixedExpensePayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fixedExpenseId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixedExpensePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FixedExpensePayment_userId_month_idx" ON "FixedExpensePayment"("userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "FixedExpensePayment_fixedExpenseId_month_key" ON "FixedExpensePayment"("fixedExpenseId", "month");

-- AddForeignKey
ALTER TABLE "FixedExpensePayment" ADD CONSTRAINT "FixedExpensePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedExpensePayment" ADD CONSTRAINT "FixedExpensePayment_fixedExpenseId_fkey" FOREIGN KEY ("fixedExpenseId") REFERENCES "FixedExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (08-seguranca § 1), mesma função app_user_id() já criada.
ALTER TABLE "FixedExpensePayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FixedExpensePayment" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "FixedExpensePayment"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());
