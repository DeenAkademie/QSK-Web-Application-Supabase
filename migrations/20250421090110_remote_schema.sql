create table "public"."courses" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text not null,
    "plan_id" uuid not null
);


alter table "public"."courses" enable row level security;

alter table "public"."clients" alter column "plan_id" set not null;

alter table "public"."clients" alter column "plan_id" set data type uuid using "plan_id"::uuid;

alter table "public"."course_modules" add column "course_id" uuid;

alter table "public"."plans" alter column "id" set default gen_random_uuid();

alter table "public"."plans" alter column "id" set data type uuid using "id"::uuid;

CREATE UNIQUE INDEX courses_pkey ON public.courses USING btree (id);

alter table "public"."courses" add constraint "courses_pkey" PRIMARY KEY using index "courses_pkey";

alter table "public"."course_modules" add constraint "course_modules_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE not valid;

alter table "public"."course_modules" validate constraint "course_modules_course_id_fkey";

alter table "public"."courses" add constraint "courses_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES plans(id) not valid;

alter table "public"."courses" validate constraint "courses_plan_id_fkey";

grant delete on table "public"."courses" to "anon";

grant insert on table "public"."courses" to "anon";

grant references on table "public"."courses" to "anon";

grant select on table "public"."courses" to "anon";

grant trigger on table "public"."courses" to "anon";

grant truncate on table "public"."courses" to "anon";

grant update on table "public"."courses" to "anon";

grant delete on table "public"."courses" to "authenticated";

grant insert on table "public"."courses" to "authenticated";

grant references on table "public"."courses" to "authenticated";

grant select on table "public"."courses" to "authenticated";

grant trigger on table "public"."courses" to "authenticated";

grant truncate on table "public"."courses" to "authenticated";

grant update on table "public"."courses" to "authenticated";

grant delete on table "public"."courses" to "service_role";

grant insert on table "public"."courses" to "service_role";

grant references on table "public"."courses" to "service_role";

grant select on table "public"."courses" to "service_role";

grant trigger on table "public"."courses" to "service_role";

grant truncate on table "public"."courses" to "service_role";

grant update on table "public"."courses" to "service_role";


