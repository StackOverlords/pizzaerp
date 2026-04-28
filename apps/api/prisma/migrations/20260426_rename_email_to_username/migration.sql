-- Rename email → username in User table
ALTER TABLE "User" ADD COLUMN "username" TEXT;
UPDATE "User" SET "username" = "email";
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
DROP INDEX "User_email_tenantId_key";
ALTER TABLE "User" DROP COLUMN "email";
CREATE UNIQUE INDEX "User_username_tenantId_key" ON "User"("username", "tenantId");
