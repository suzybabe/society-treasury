CREATE TYPE "public"."activity_kind" AS ENUM('vote', 'request', 'pass', 'spent', 'checkin', 'settings', 'decision');--> statement-breakpoint
CREATE TYPE "public"."fee_method" AS ENUM('cash', 'card', 'bank', 'waived');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('pending', 'active');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('voting', 'approved', 'auto', 'rejected', 'spent');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('president', 'treasurer', 'committee', 'student');--> statement-breakpoint
CREATE TYPE "public"."vote_choice" AS ENUM('yes', 'no');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "activity_kind" NOT NULL,
	"text" text NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tx_hash" text
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"event_id" integer NOT NULL,
	"member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkins_event_id_member_id_pk" PRIMARY KEY("event_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"privy_user_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"near_account_id" text,
	"role" "role" DEFAULT 'student' NOT NULL,
	"status" "member_status" DEFAULT 'pending' NOT NULL,
	"pass_number" integer,
	"fee_method" "fee_method",
	"fee_amount_cents" integer DEFAULT 0 NOT NULL,
	"fee_confirmed_at" timestamp with time zone,
	"fee_confirmed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_privy_user_id_unique" UNIQUE("privy_user_id"),
	CONSTRAINT "members_pass_number_unique" UNIQUE("pass_number")
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"data" "bytea" NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tx_hash" text,
	CONSTRAINT "receipts_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "societies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"term" text NOT NULL,
	"approval_percent" integer DEFAULT 50 NOT NULL,
	"auto_approve_limit_cents" integer DEFAULT 2000 NOT NULL,
	"membership_fee_cents" integer DEFAULT 1500 NOT NULL,
	"opening_balance_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spend_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"requester_id" uuid NOT NULL,
	"status" "request_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"tx_hash" text,
	CONSTRAINT "amount_positive" CHECK ("spend_requests"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"request_id" integer NOT NULL,
	"member_id" uuid NOT NULL,
	"choice" "vote_choice" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tx_hash" text,
	CONSTRAINT "votes_request_id_member_id_pk" PRIMARY KEY("request_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_actor_id_members_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_request_id_spend_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."spend_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_uploaded_by_members_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spend_requests" ADD CONSTRAINT "spend_requests_requester_id_members_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_request_id_spend_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."spend_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_created_idx" ON "activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "members_email_idx" ON "members" USING btree ("email");