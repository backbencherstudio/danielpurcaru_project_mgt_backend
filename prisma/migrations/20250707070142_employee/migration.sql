/*
  Warnings:

  - You are about to drop the column `employee_id` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `employee_id` on the `employee_holidays` table. All the data in the column will be lost.
  - You are about to drop the column `employee_id` on the `employee_loans` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `project_assignees` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the `admins` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `employees` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[projectId,userId]` on the table `project_assignees` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `attendances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `employee_holidays` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `employee_loans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `project_assignees` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "admins" DROP CONSTRAINT "admins_user_id_fkey";

-- DropForeignKey
ALTER TABLE "attendances" DROP CONSTRAINT "attendances_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_holidays" DROP CONSTRAINT "employee_holidays_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_loans" DROP CONSTRAINT "employee_loans_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_user_id_fkey";

-- DropForeignKey
ALTER TABLE "project_assignees" DROP CONSTRAINT "project_assignees_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_employeeId_fkey";

-- DropIndex
DROP INDEX "project_assignees_projectId_employeeId_key";

-- AlterTable
ALTER TABLE "attendances" DROP COLUMN "employee_id",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "employee_holidays" DROP COLUMN "employee_id",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "employee_loans" DROP COLUMN "employee_id",
ADD COLUMN     "approved_by_id" TEXT,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "project_assignees" DROP COLUMN "employeeId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "employeeId",
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "employeeRole" TEXT,
ADD COLUMN     "physical_number" VARCHAR(20),
ALTER COLUMN "type" SET DEFAULT 'employee ';

-- DropTable
DROP TABLE "admins";

-- DropTable
DROP TABLE "employees";

-- CreateIndex
CREATE UNIQUE INDEX "project_assignees_projectId_userId_key" ON "project_assignees"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "employee_holidays" ADD CONSTRAINT "employee_holidays_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignees" ADD CONSTRAINT "project_assignees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_loans" ADD CONSTRAINT "employee_loans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_loans" ADD CONSTRAINT "employee_loans_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
