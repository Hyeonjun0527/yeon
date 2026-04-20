-- 0025 PoC: home_insight_banner_dismissals를 bigint identity + public_id 패턴으로 전환.
-- 데이터가 거의 없는 leaf 테이블이라 DROP & RECREATE 채택.
-- 기존 dismissal 기록은 사라지지만 사용자에게 미치는 영향 없음 (다시 dismiss 하면 됨).
-- drizzle-kit이 자동 생성한 ALTER COLUMN TYPE bigint은 uuid 값을 캐스팅할 수 없어
-- 손수 DROP+CREATE로 치환했다.

DROP TABLE IF EXISTS "home_insight_banner_dismissals" CASCADE;--> statement-breakpoint

CREATE TABLE "home_insight_banner_dismissals" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "home_insight_banner_dismissals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"banner_key" varchar(40) NOT NULL,
	"hidden_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "home_insight_banner_dismissals_public_id_unique" UNIQUE("public_id")
);--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "home_insight_banner_dismissals" ADD CONSTRAINT "home_insight_banner_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
	WHEN duplicate_table THEN null;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "home_insight_banner_dismissals_user_banner_key" ON "home_insight_banner_dismissals" USING btree ("user_id","banner_key");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "home_insight_banner_dismissals_user_hidden_until_idx" ON "home_insight_banner_dismissals" USING btree ("user_id","hidden_until");
