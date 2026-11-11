CREATE TABLE "student_votes" (
	"request_id" integer NOT NULL,
	"member_id" uuid NOT NULL,
	"choice" "vote_choice" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tx_hash" text,
	CONSTRAINT "student_votes_request_id_member_id_pk" PRIMARY KEY("request_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "societies" ADD COLUMN "student_quorum" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "student_votes" ADD CONSTRAINT "student_votes_request_id_spend_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."spend_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_votes" ADD CONSTRAINT "student_votes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;