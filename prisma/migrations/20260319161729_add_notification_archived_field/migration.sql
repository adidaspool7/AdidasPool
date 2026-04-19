-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Notification_archived_idx" ON "Notification"("archived");
