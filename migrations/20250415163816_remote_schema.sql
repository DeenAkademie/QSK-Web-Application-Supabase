create table "public"."clients_lesson_state" (
    "id" uuid not null default gen_random_uuid(),
    "client_id" uuid not null,
    "lesson_no" smallint not null default '1'::smallint,
    "exercise_no" smallint not null default '1'::smallint,
    "exercise_passed_count" smallint not null default '0'::smallint,
    "hasanat_counter" bigint not null default '0'::bigint
);


alter table "public"."clients_lesson_state" enable row level security;

CREATE UNIQUE INDEX clients_lesson_state_pkey ON public.clients_lesson_state USING btree (id);

alter table "public"."clients_lesson_state" add constraint "clients_lesson_state_pkey" PRIMARY KEY using index "clients_lesson_state_pkey";

alter table "public"."clients_lesson_state" add constraint "clients_lesson_state_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(auth_id) ON DELETE CASCADE not valid;

alter table "public"."clients_lesson_state" validate constraint "clients_lesson_state_client_id_fkey";

grant delete on table "public"."clients_lesson_state" to "anon";

grant insert on table "public"."clients_lesson_state" to "anon";

grant references on table "public"."clients_lesson_state" to "anon";

grant select on table "public"."clients_lesson_state" to "anon";

grant trigger on table "public"."clients_lesson_state" to "anon";

grant truncate on table "public"."clients_lesson_state" to "anon";

grant update on table "public"."clients_lesson_state" to "anon";

grant delete on table "public"."clients_lesson_state" to "authenticated";

grant insert on table "public"."clients_lesson_state" to "authenticated";

grant references on table "public"."clients_lesson_state" to "authenticated";

grant select on table "public"."clients_lesson_state" to "authenticated";

grant trigger on table "public"."clients_lesson_state" to "authenticated";

grant truncate on table "public"."clients_lesson_state" to "authenticated";

grant update on table "public"."clients_lesson_state" to "authenticated";

grant delete on table "public"."clients_lesson_state" to "service_role";

grant insert on table "public"."clients_lesson_state" to "service_role";

grant references on table "public"."clients_lesson_state" to "service_role";

grant select on table "public"."clients_lesson_state" to "service_role";

grant trigger on table "public"."clients_lesson_state" to "service_role";

grant truncate on table "public"."clients_lesson_state" to "service_role";

grant update on table "public"."clients_lesson_state" to "service_role";


