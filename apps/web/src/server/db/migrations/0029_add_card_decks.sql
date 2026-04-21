CREATE TABLE IF NOT EXISTS "card_decks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "card_decks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" text NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_decks_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "card_deck_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "card_deck_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" text NOT NULL,
	"deck_id" bigint NOT NULL,
	"front_text" text NOT NULL,
	"back_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_deck_items_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "card_decks" ADD CONSTRAINT "card_decks_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "card_deck_items" ADD CONSTRAINT "card_deck_items_deck_id_card_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."card_decks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN duplicate_table THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_decks_owner_created_at_idx" ON "card_decks" USING btree ("owner_user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_deck_items_deck_created_at_idx" ON "card_deck_items" USING btree ("deck_id","created_at");
