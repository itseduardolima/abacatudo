-- DropIndex
DROP INDEX "FixedExpensePayment_fixedExpenseId_month_key";

-- AlterTable
ALTER TABLE "FixedExpensePayment" ADD COLUMN     "half" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "FixedExpensePayment_fixedExpenseId_month_half_key" ON "FixedExpensePayment"("fixedExpenseId", "month", "half");
