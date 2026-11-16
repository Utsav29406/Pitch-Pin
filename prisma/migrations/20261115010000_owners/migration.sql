-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "ownerId" UUID;

-- CreateTable
CREATE TABLE "VenueClaim" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "message" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "VenueClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenueClaim_status_idx" ON "VenueClaim"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VenueClaim_venueId_userId_key" ON "VenueClaim"("venueId", "userId");

-- CreateIndex
CREATE INDEX "Venue_ownerId_idx" ON "Venue"("ownerId");

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueClaim" ADD CONSTRAINT "VenueClaim_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueClaim" ADD CONSTRAINT "VenueClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

