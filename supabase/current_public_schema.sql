


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
    "status" "public"."job_status" DEFAULT 'Saved'::"public"."job_status" NOT NULL,
    "resume_category" "text",
    "resume_category_source" "text",
    "resume_category_confidence" double precision,
    "resume_category_status" "text" DEFAULT 'unclassified'::"text" NOT NULL,
    "resume_category_classifier_model" "text",
    "resume_category_classifier_version" integer,
    "resume_category_failure_code" "text",
    "resume_category_started_at" timestamp with time zone,
    "resume_category_resolved_at" timestamp with time zone,
    CONSTRAINT "jobs_resume_category_check" CHECK (("resume_category" IS NULL) OR ("resume_category" = ANY (ARRAY['technology_product_data'::"text", 'finance_accounting'::"text", 'sales_marketing'::"text", 'legal'::"text", 'human_resources_admin_operations'::"text", 'hospitality_retail_customer_service'::"text", 'general_professional_other'::"text"]))),
    CONSTRAINT "jobs_resume_category_classifier_version_positive" CHECK (("resume_category_classifier_version" IS NULL) OR ("resume_category_classifier_version" > 0)),
    CONSTRAINT "jobs_resume_category_confidence_check" CHECK (("resume_category_confidence" IS NULL) OR (("resume_category_confidence" >= (0)::double precision) AND ("resume_category_confidence" <= (1)::double precision))),
    CONSTRAINT "jobs_resume_category_source_check" CHECK (("resume_category_source" IS NULL) OR ("resume_category_source" = ANY (ARRAY['ai'::"text", 'user'::"text"]))),
    CONSTRAINT "jobs_resume_category_state_check" CHECK ((("resume_category_status" = 'unclassified'::"text") AND ("resume_category" IS NULL) AND ("resume_category_source" IS NULL) AND ("resume_category_started_at" IS NULL) AND ("resume_category_resolved_at" IS NULL)) OR (("resume_category_status" = 'classifying'::"text") AND ("resume_category" IS NULL) AND ("resume_category_source" IS NULL) AND ("resume_category_started_at" IS NOT NULL) AND ("resume_category_resolved_at" IS NULL)) OR (("resume_category_status" = 'classified'::"text") AND ("resume_category" IS NOT NULL) AND ("resume_category_source" IS NOT NULL) AND ("resume_category_resolved_at" IS NOT NULL) AND ("resume_category_failure_code" IS NULL)) OR (("resume_category_status" = 'failed'::"text") AND ("resume_category" IS NULL) AND ("resume_category_source" IS NULL) AND ("resume_category_resolved_at" IS NOT NULL) AND ("resume_category_failure_code" IS NOT NULL))),
    CONSTRAINT "jobs_resume_category_status_check" CHECK (("resume_category_status" = ANY (ARRAY['unclassified'::"text", 'classifying'::"text", 'classified'::"text", 'failed'::"text"])))
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
    "cover_letter_generations_used" integer DEFAULT 0 NOT NULL,
    "cover_letter_generations_limit" integer DEFAULT 3 NOT NULL,
    "job_classifications_used" integer DEFAULT 0 NOT NULL,
    "job_classifications_limit" integer DEFAULT 50 NOT NULL,
    "job_classification_period_start" timestamp with time zone DEFAULT "now"() NOT NULL,
    "job_classification_period_end" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval) NOT NULL,
    "resume_usage_period_start" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resume_usage_period_end" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "stripe_state_event_created_at" bigint DEFAULT 0 NOT NULL,
    "stripe_state_event_priority" smallint DEFAULT 0 NOT NULL,
    "stripe_last_event_id" "text",
    CONSTRAINT "profiles_resume_generations_limit_positive" CHECK (("resume_generations_limit" > 0)),
    CONSTRAINT "profiles_resume_generations_used_nonnegative" CHECK (("resume_generations_used" >= 0)),
    CONSTRAINT "profiles_cover_letter_generations_limit_positive" CHECK (("cover_letter_generations_limit" > 0)),
    CONSTRAINT "profiles_cover_letter_generations_used_nonnegative" CHECK (("cover_letter_generations_used" >= 0)),
    CONSTRAINT "profiles_job_classifications_limit_positive" CHECK (("job_classifications_limit" > 0)),
    CONSTRAINT "profiles_job_classifications_used_nonnegative" CHECK (("job_classifications_used" >= 0)),
    CONSTRAINT "profiles_job_classification_period_valid" CHECK (("job_classification_period_end" > "job_classification_period_start")),
    CONSTRAINT "profiles_resume_usage_period_valid" CHECK (("resume_usage_period_end" > "resume_usage_period_start"))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cover_letter_generation_attempts" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "seek_job_id" "text" NOT NULL,
    "status" "text" DEFAULT 'reserved'::"text" NOT NULL,
    "model" "text" NOT NULL,
    "template_version" "text" NOT NULL,
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
    CONSTRAINT "cover_letter_generation_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cover_letter_generation_attempts_attempt_count_nonnegative" CHECK (("attempt_count" >= 0)),
    CONSTRAINT "cover_letter_generation_attempts_status_check" CHECK (("status" = ANY (ARRAY['reserved'::"text", 'succeeded'::"text", 'refunded'::"text"]))),
    CONSTRAINT "cover_letter_generation_attempts_template_version_not_blank" CHECK ((length(btrim("template_version")) > 0)),
    CONSTRAINT "cover_letter_generation_attempts_terminal_state_check" CHECK (((("status" = 'reserved'::"text") AND ("completed_at" IS NULL) AND ("refunded_at" IS NULL)) OR (("status" = 'succeeded'::"text") AND ("result_json" IS NOT NULL) AND ("completed_at" IS NOT NULL) AND ("refunded_at" IS NULL)) OR (("status" = 'refunded'::"text") AND ("completed_at" IS NULL) AND ("refunded_at" IS NOT NULL))))
);


ALTER TABLE "public"."cover_letter_generation_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_generated_cover_letter_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "seek_job_id" "text" NOT NULL,
    "cover_letter_json" "jsonb" NOT NULL,
    "template_version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    CONSTRAINT "user_generated_cover_letter_drafts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_generated_cover_letter_drafts_user_job_unique" UNIQUE ("user_id", "seek_job_id"),
    CONSTRAINT "user_generated_cover_letter_drafts_template_version_not_blank" CHECK ((length(btrim("template_version")) > 0))
);


ALTER TABLE "public"."user_generated_cover_letter_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_generated_cover_letters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "seek_job_id" "text" NOT NULL,
    "cover_letter_json" "jsonb" NOT NULL,
    "template_version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_generated_cover_letters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_generated_cover_letters_user_job_unique" UNIQUE ("user_id", "seek_job_id"),
    CONSTRAINT "user_generated_cover_letters_template_version_not_blank" CHECK ((length(btrim("template_version")) > 0))
);


ALTER TABLE "public"."user_generated_cover_letters" OWNER TO "postgres";


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
    "resume_category" "text" NOT NULL,
    "profile_version" integer NOT NULL,
    "template_version" "text" NOT NULL,
    CONSTRAINT "resume_generation_attempts_attempt_count_nonnegative" CHECK (("attempt_count" >= 0)),
    CONSTRAINT "resume_generation_attempts_profile_version_positive" CHECK (("profile_version" > 0)),
    CONSTRAINT "resume_generation_attempts_resume_category_check" CHECK (("resume_category" = ANY (ARRAY['technology_product_data'::"text", 'finance_accounting'::"text", 'sales_marketing'::"text", 'legal'::"text", 'human_resources_admin_operations'::"text", 'hospitality_retail_customer_service'::"text", 'general_professional_other'::"text"]))),
    CONSTRAINT "resume_generation_attempts_status_check" CHECK (("status" = ANY (ARRAY['reserved'::"text", 'succeeded'::"text", 'refunded'::"text"]))),
    CONSTRAINT "resume_generation_attempts_template_version_not_blank" CHECK ((length(btrim("template_version")) > 0)),
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
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resume_category" "text" NOT NULL,
    "profile_version" integer NOT NULL,
    "template_version" "text" NOT NULL,
    CONSTRAINT "user_generated_resume_drafts_profile_version_positive" CHECK (("profile_version" > 0)),
    CONSTRAINT "user_generated_resume_drafts_resume_category_check" CHECK (("resume_category" = ANY (ARRAY['technology_product_data'::"text", 'finance_accounting'::"text", 'sales_marketing'::"text", 'legal'::"text", 'human_resources_admin_operations'::"text", 'hospitality_retail_customer_service'::"text", 'general_professional_other'::"text"]))),
    CONSTRAINT "user_generated_resume_drafts_template_version_not_blank" CHECK ((length(btrim("template_version")) > 0))
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
    "original_filename" "text" NOT NULL,
    "resume_category" "text" NOT NULL,
    "profile_version" integer NOT NULL,
    "template_version" "text" NOT NULL,
    CONSTRAINT "user_generated_resumes_profile_version_positive" CHECK (("profile_version" > 0)),
    CONSTRAINT "user_generated_resumes_resume_category_check" CHECK (("resume_category" = ANY (ARRAY['technology_product_data'::"text", 'finance_accounting'::"text", 'sales_marketing'::"text", 'legal'::"text", 'human_resources_admin_operations'::"text", 'hospitality_retail_customer_service'::"text", 'general_professional_other'::"text"]))),
    CONSTRAINT "user_generated_resumes_template_version_not_blank" CHECK ((length(btrim("template_version")) > 0))
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


CREATE INDEX "cover_letter_generation_attempts_user_created_idx" ON "public"."cover_letter_generation_attempts" USING "btree" ("user_id", "created_at" DESC);


CREATE INDEX "cover_letter_generation_attempts_user_status_created_idx" ON "public"."cover_letter_generation_attempts" USING "btree" ("user_id", "status", "created_at");


CREATE INDEX "cover_letter_generation_attempts_user_job_idx" ON "public"."cover_letter_generation_attempts" USING "btree" ("user_id", "seek_job_id");


CREATE INDEX "user_generated_cover_letter_drafts_user_updated_idx" ON "public"."user_generated_cover_letter_drafts" USING "btree" ("user_id", "updated_at" DESC);


CREATE INDEX "user_generated_cover_letters_user_updated_idx" ON "public"."user_generated_cover_letters" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "stripe_webhook_events_processed_at_idx" ON "public"."stripe_webhook_events" USING "btree" ("processed_at" DESC);



ALTER TABLE ONLY "public"."user_generated_resume_drafts"
    ADD CONSTRAINT "generated_resume_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resume_generation_attempts"
    ADD CONSTRAINT "resume_generation_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;


ALTER TABLE ONLY "public"."cover_letter_generation_attempts"
    ADD CONSTRAINT "cover_letter_generation_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;


ALTER TABLE ONLY "public"."cover_letter_generation_attempts"
    ADD CONSTRAINT "cover_letter_generation_attempts_user_job_fkey" FOREIGN KEY ("user_id", "seek_job_id") REFERENCES "public"."jobs"("user_id", "seek_job_id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."user_generated_cover_letter_drafts"
    ADD CONSTRAINT "user_generated_cover_letter_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;


ALTER TABLE ONLY "public"."user_generated_cover_letter_drafts"
    ADD CONSTRAINT "user_generated_cover_letter_drafts_user_job_fkey" FOREIGN KEY ("user_id", "seek_job_id") REFERENCES "public"."jobs"("user_id", "seek_job_id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."user_generated_cover_letters"
    ADD CONSTRAINT "user_generated_cover_letters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;


ALTER TABLE ONLY "public"."user_generated_cover_letters"
    ADD CONSTRAINT "user_generated_cover_letters_user_job_fkey" FOREIGN KEY ("user_id", "seek_job_id") REFERENCES "public"."jobs"("user_id", "seek_job_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_generated_resumes"
    ADD CONSTRAINT "user_generated_resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_master_resumes"
    ADD CONSTRAINT "user_master_resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."resume_generation_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cover_letter_generation_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_generated_cover_letter_drafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_generated_cover_letters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_generated_resume_drafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_generated_resumes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_master_resumes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_master_resumes_select_own" ON "public"."user_master_resumes" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("user_id") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("email") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("first_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("last_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."resume_generation_attempts" TO "service_role";


GRANT ALL ON TABLE "public"."cover_letter_generation_attempts" TO "service_role";


GRANT ALL ON TABLE "public"."user_generated_cover_letter_drafts" TO "service_role";


GRANT ALL ON TABLE "public"."user_generated_cover_letters" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."user_generated_resume_drafts" TO "service_role";



GRANT ALL ON TABLE "public"."user_generated_resumes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_generated_resumes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_master_resumes" TO "service_role";
GRANT SELECT ON TABLE "public"."user_master_resumes" TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



