


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."job_status" AS ENUM (
    'Saved',
    'Applied',
    'Interviewing',
    'Offer',
    'Rejected',
    'Accepted'
);


ALTER TYPE "public"."job_status" OWNER TO "postgres";


CREATE TYPE "public"."mime_type" AS ENUM (
    'application/pdf',
    'application/docx',
    'application/doc'
);


ALTER TYPE "public"."mime_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."mime_type" IS 'Resume Mime Types';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "seek_job_id" "text" NOT NULL,
    "job_title" "text" NOT NULL,
    "company_name" "text" NOT NULL,
    "location" "text" NOT NULL,
    "job_type" "text",
    "job_pay" "text",
    "job_description" "text" NOT NULL,
    "company_logo" "text",
    "date_synced" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "public"."job_status" DEFAULT 'Saved'::"public"."job_status" NOT NULL
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."jobs" IS 'Contains every single synced job';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "subscription_status" "text" DEFAULT 'inactive'::"text" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "stripe_payment_status" "text",
    "resume_generations_used" integer DEFAULT 0 NOT NULL,
    "resume_generations_limit" integer DEFAULT 3 NOT NULL,
    "resume_usage_period_start" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resume_usage_period_end" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "stripe_state_event_created_at" bigint DEFAULT 0 NOT NULL,
    "stripe_state_event_priority" smallint DEFAULT 0 NOT NULL,
    "stripe_last_event_id" "text",
    CONSTRAINT "profiles_resume_generations_limit_positive" CHECK (("resume_generations_limit" > 0)),
    CONSTRAINT "profiles_resume_generations_used_nonnegative" CHECK (("resume_generations_used" >= 0)),
    CONSTRAINT "profiles_resume_usage_period_valid" CHECK (("resume_usage_period_end" > "resume_usage_period_start"))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resume_generation_attempts" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "seek_job_id" "text" NOT NULL,
    "status" "text" DEFAULT 'reserved'::"text" NOT NULL,
    "model" "text" NOT NULL,
    "usage_period_start" timestamp with time zone NOT NULL,
    "result_json" "jsonb",
    "token_usage" "jsonb",
    "failure_code" "text",
    "failure_detail" "text",
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "repair_attempted" boolean DEFAULT false NOT NULL,
    "credit_charged" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "refunded_at" timestamp with time zone,
    CONSTRAINT "resume_generation_attempts_attempt_count_nonnegative" CHECK (("attempt_count" >= 0)),
    CONSTRAINT "resume_generation_attempts_status_check" CHECK (("status" = ANY (ARRAY['reserved'::"text", 'succeeded'::"text", 'refunded'::"text"]))),
    CONSTRAINT "resume_generation_attempts_terminal_state_check" CHECK (((("status" = 'reserved'::"text") AND ("completed_at" IS NULL) AND ("refunded_at" IS NULL)) OR (("status" = 'succeeded'::"text") AND ("result_json" IS NOT NULL) AND ("completed_at" IS NOT NULL) AND ("refunded_at" IS NULL)) OR (("status" = 'refunded'::"text") AND ("completed_at" IS NULL) AND ("refunded_at" IS NOT NULL))))
);


ALTER TABLE "public"."resume_generation_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_webhook_events" (
    "event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "object_id" "text",
    "event_created_at" bigint NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stripe_webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_generated_resume_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "seek_job_id" "text" NOT NULL,
    "resume_json" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_generated_resume_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_generated_resumes" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resume_json" "jsonb" NOT NULL,
    "seek_job_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "original_filename" "text" NOT NULL
);


ALTER TABLE "public"."user_generated_resumes" OWNER TO "postgres";


ALTER TABLE "public"."user_generated_resumes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_generated_resumes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_master_resumes" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text" DEFAULT ''::"text" NOT NULL,
    "original_filename" "text" NOT NULL,
    "plaintext" "text" NOT NULL
);


ALTER TABLE "public"."user_master_resumes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."user_generated_resume_drafts"
    ADD CONSTRAINT "generated_resume_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."resume_generation_attempts"
    ADD CONSTRAINT "resume_generation_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_webhook_events"
    ADD CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."user_generated_resumes"
    ADD CONSTRAINT "unique_user_generated_resume_per_job" UNIQUE ("user_id", "seek_job_id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "unique_user_job" UNIQUE ("user_id", "seek_job_id");



ALTER TABLE ONLY "public"."user_generated_resume_drafts"
    ADD CONSTRAINT "user_generated_resume_drafts_user_job_unique" UNIQUE ("user_id", "seek_job_id");



ALTER TABLE ONLY "public"."user_generated_resumes"
    ADD CONSTRAINT "user_generated_resumes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_master_resumes"
    ADD CONSTRAINT "user_master_resumes_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "idx_jobs_user_id" ON "public"."jobs" USING "btree" ("user_id");



CREATE INDEX "resume_generation_attempts_user_created_idx" ON "public"."resume_generation_attempts" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "resume_generation_attempts_user_status_created_idx" ON "public"."resume_generation_attempts" USING "btree" ("user_id", "status", "created_at");



CREATE INDEX "stripe_webhook_events_processed_at_idx" ON "public"."stripe_webhook_events" USING "btree" ("processed_at" DESC);



ALTER TABLE ONLY "public"."user_generated_resume_drafts"
    ADD CONSTRAINT "generated_resume_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resume_generation_attempts"
    ADD CONSTRAINT "resume_generation_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_generated_resumes"
    ADD CONSTRAINT "user_generated_resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_master_resumes"
    ADD CONSTRAINT "user_master_resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Enable insert for users based on user_id" ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable read access for all users" ON "public"."jobs" FOR SELECT USING (true);



CREATE POLICY "Enable users to view their own data only" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."user_master_resumes" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resume_generation_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_generated_resume_drafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_generated_resumes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_master_resumes" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."resume_generation_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."user_generated_resume_drafts" TO "anon";
GRANT ALL ON TABLE "public"."user_generated_resume_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."user_generated_resume_drafts" TO "service_role";



GRANT ALL ON TABLE "public"."user_generated_resumes" TO "anon";
GRANT ALL ON TABLE "public"."user_generated_resumes" TO "authenticated";
GRANT ALL ON TABLE "public"."user_generated_resumes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_generated_resumes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_generated_resumes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_generated_resumes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_master_resumes" TO "anon";
GRANT ALL ON TABLE "public"."user_master_resumes" TO "authenticated";
GRANT ALL ON TABLE "public"."user_master_resumes" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







