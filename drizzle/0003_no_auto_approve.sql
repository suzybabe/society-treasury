ALTER TABLE "societies" ALTER COLUMN "auto_approve_limit_cents" SET DEFAULT 0;--> statement-breakpoint
UPDATE "societies" SET "auto_approve_limit_cents" = 0;
