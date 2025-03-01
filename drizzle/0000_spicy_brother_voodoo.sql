CREATE TABLE "daily_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" integer NOT NULL,
	"rating" integer NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "supplement_tags" (
	"supplement_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "supplement_tags_supplement_id_tag_id_pk" PRIMARY KEY("supplement_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "supplements" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"hidden" integer DEFAULT 0 NOT NULL,
	"average_rating" integer,
	"rating_difference" integer
);
--> statement-breakpoint
CREATE TABLE "supplements_taken" (
	"supplement_id" integer NOT NULL,
	"entry_id" integer NOT NULL,
	CONSTRAINT "supplements_taken_supplement_id_entry_id_pk" PRIMARY KEY("supplement_id","entry_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supplement_tags" ADD CONSTRAINT "supplement_tags_supplement_id_supplements_id_fk" FOREIGN KEY ("supplement_id") REFERENCES "public"."supplements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_tags" ADD CONSTRAINT "supplement_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplements_taken" ADD CONSTRAINT "supplements_taken_supplement_id_supplements_id_fk" FOREIGN KEY ("supplement_id") REFERENCES "public"."supplements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplements_taken" ADD CONSTRAINT "supplements_taken_entry_id_daily_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."daily_entries"("id") ON DELETE cascade ON UPDATE no action;