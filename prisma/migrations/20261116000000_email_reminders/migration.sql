-- Reminders move from WhatsApp to email.
ALTER TABLE "Profile" RENAME COLUMN "whatsappOptIn" TO "emailOptIn";
