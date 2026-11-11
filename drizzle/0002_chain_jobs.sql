CREATE TYPE "public"."chain_job_status" AS ENUM('pending', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "chain_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"method" text NOT NULL,
	"args" jsonb NOT NULL,
	"target" jsonb NOT NULL,
	"activity_id" integer,
	"status" "chain_job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"tx_hash" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "pass_tx_hash" text;--> statement-breakpoint
ALTER TABLE "spend_requests" ADD COLUMN "chain_id" integer;--> statement-breakpoint
ALTER TABLE "chain_jobs" ADD CONSTRAINT "chain_jobs_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chain_jobs_status_idx" ON "chain_jobs" USING btree ("status","id");