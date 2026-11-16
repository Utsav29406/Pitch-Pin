-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "googleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Profile_googleId_key" ON "Profile"("googleId");

