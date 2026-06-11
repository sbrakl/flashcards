


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."fc_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."fc_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fc_flashcards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "last_rating" integer,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."fc_flashcards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fc_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flashcard_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."fc_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."problem_key_answers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "problem_id" "uuid",
    "phase" integer NOT NULL,
    "answer_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."problem_key_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."problems" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."problems" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "session_id" "uuid",
    "phase" integer NOT NULL,
    "input_text" "text",
    "meta_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "problem_id" "uuid",
    "current_phase" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."fc_categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fc_flashcards"
    ADD CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."problem_key_answers"
    ADD CONSTRAINT "problem_key_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."problem_key_answers"
    ADD CONSTRAINT "problem_key_answers_problem_id_phase_key" UNIQUE ("problem_id", "phase");



ALTER TABLE ONLY "public"."problems"
    ADD CONSTRAINT "problems_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."problems"
    ADD CONSTRAINT "problems_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_session_id_phase_key" UNIQUE ("session_id", "phase");



ALTER TABLE ONLY "public"."fc_reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fc_flashcards"
    ADD CONSTRAINT "flashcards_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."fc_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."problem_key_answers"
    ADD CONSTRAINT "problem_key_answers_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fc_reviews"
    ADD CONSTRAINT "reviews_flashcard_id_fkey" FOREIGN KEY ("flashcard_id") REFERENCES "public"."fc_flashcards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE CASCADE;



CREATE POLICY "Allow public delete access on categories" ON "public"."fc_categories" FOR DELETE USING (true);



CREATE POLICY "Allow public delete access on flashcards" ON "public"."fc_flashcards" FOR DELETE USING (true);



CREATE POLICY "Allow public delete access on reviews" ON "public"."fc_reviews" FOR DELETE USING (true);



CREATE POLICY "Allow public insert" ON "public"."problem_key_answers" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert" ON "public"."responses" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert" ON "public"."sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert access on categories" ON "public"."fc_categories" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert access on flashcards" ON "public"."fc_flashcards" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert access on reviews" ON "public"."fc_reviews" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read" ON "public"."problem_key_answers" FOR SELECT USING (true);



CREATE POLICY "Allow public read" ON "public"."problems" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on categories" ON "public"."fc_categories" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on flashcards" ON "public"."fc_flashcards" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on reviews" ON "public"."fc_reviews" FOR SELECT USING (true);



CREATE POLICY "Allow public select" ON "public"."responses" FOR SELECT USING (true);



CREATE POLICY "Allow public select" ON "public"."sessions" FOR SELECT USING (true);



CREATE POLICY "Allow public update" ON "public"."problem_key_answers" FOR UPDATE USING (true);



CREATE POLICY "Allow public update" ON "public"."responses" FOR UPDATE USING (true);



CREATE POLICY "Allow public update" ON "public"."sessions" FOR UPDATE USING (true);



CREATE POLICY "Allow public update access on categories" ON "public"."fc_categories" FOR UPDATE USING (true);



CREATE POLICY "Allow public update access on flashcards" ON "public"."fc_flashcards" FOR UPDATE USING (true);



CREATE POLICY "Allow public update access on reviews" ON "public"."fc_reviews" FOR UPDATE USING (true);



ALTER TABLE "public"."fc_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fc_flashcards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fc_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."problem_key_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."problems" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."fc_categories" TO "anon";
GRANT ALL ON TABLE "public"."fc_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."fc_categories" TO "service_role";



GRANT ALL ON TABLE "public"."fc_flashcards" TO "anon";
GRANT ALL ON TABLE "public"."fc_flashcards" TO "authenticated";
GRANT ALL ON TABLE "public"."fc_flashcards" TO "service_role";



GRANT ALL ON TABLE "public"."fc_reviews" TO "anon";
GRANT ALL ON TABLE "public"."fc_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."fc_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."problem_key_answers" TO "anon";
GRANT ALL ON TABLE "public"."problem_key_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."problem_key_answers" TO "service_role";



GRANT ALL ON TABLE "public"."problems" TO "anon";
GRANT ALL ON TABLE "public"."problems" TO "authenticated";
GRANT ALL ON TABLE "public"."problems" TO "service_role";



GRANT ALL ON TABLE "public"."responses" TO "anon";
GRANT ALL ON TABLE "public"."responses" TO "authenticated";
GRANT ALL ON TABLE "public"."responses" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";









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































