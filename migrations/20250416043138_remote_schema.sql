alter table "public"."clients" drop constraint "clients_auth_id_fkey";

alter table "public"."clients_course_progress" drop constraint "clients_course_progress_client_id_fkey";

alter table "public"."clients_lesson_state" drop constraint "clients_lesson_state_client_id_fkey";

alter table "public"."clients_settings" drop constraint "clients_settings_client_id_fkey1";

alter table "public"."submitted_exercises" drop constraint "submitted_exercises_client_id_fkey";

alter table "public"."clients" drop constraint "clients_pkey";

drop index if exists "public"."clients_pkey";

alter table "public"."clients" drop column "auth_id";

alter table "public"."clients" add column "client_id" uuid not null;

CREATE UNIQUE INDEX clients_pkey ON public.clients USING btree (client_id);

alter table "public"."clients" add constraint "clients_pkey" PRIMARY KEY using index "clients_pkey";

alter table "public"."clients" add constraint "clients_client_id_fkey" FOREIGN KEY (client_id) REFERENCES auth.users(id) not valid;

alter table "public"."clients" validate constraint "clients_client_id_fkey";

alter table "public"."clients_course_progress" add constraint "clients_course_progress_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE not valid;

alter table "public"."clients_course_progress" validate constraint "clients_course_progress_client_id_fkey";

alter table "public"."clients_lesson_state" add constraint "clients_lesson_state_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE not valid;

alter table "public"."clients_lesson_state" validate constraint "clients_lesson_state_client_id_fkey";

alter table "public"."clients_settings" add constraint "clients_settings_client_id_fkey1" FOREIGN KEY (client_id) REFERENCES clients(client_id) not valid;

alter table "public"."clients_settings" validate constraint "clients_settings_client_id_fkey1";

alter table "public"."submitted_exercises" add constraint "submitted_exercises_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(client_id) not valid;

alter table "public"."submitted_exercises" validate constraint "submitted_exercises_client_id_fkey";

create policy "Enable insert for users based on user_id"
on "public"."clients"
as permissive
for insert
to public
with check ((( SELECT auth.uid() AS uid) = client_id));


create policy "Enable update for users based on email"
on "public"."clients"
as permissive
for update
to public
using (((( SELECT auth.jwt() AS jwt) ->> 'email'::text) = email))
with check (((( SELECT auth.jwt() AS jwt) ->> 'email'::text) = email));


create policy "Enable users to view their own data only"
on "public"."clients"
as permissive
for select
to authenticated
using ((( SELECT auth.uid() AS uid) = client_id));


create policy "Enable insert for users based on client_id"
on "public"."clients_lesson_state"
as permissive
for insert
to public
with check ((( SELECT auth.uid() AS uid) = client_id));


create policy "Enable upsert for users based on client_id"
on "public"."clients_lesson_state"
as permissive
for update
to public
using ((( SELECT auth.uid() AS uid) = client_id))
with check ((( SELECT auth.uid() AS uid) = client_id));


create policy "Enable users to view their own data only"
on "public"."clients_lesson_state"
as permissive
for select
to authenticated
using ((( SELECT auth.uid() AS uid) = client_id));


create policy "Enable insert for users based on client_id"
on "public"."clients_settings"
as permissive
for insert
to public
with check ((( SELECT auth.uid() AS uid) = client_id));


create policy "Enable upsert for users based on client_id"
on "public"."clients_settings"
as permissive
for update
to authenticated
using ((( SELECT auth.uid() AS uid) = client_id))
with check ((( SELECT auth.uid() AS uid) = client_id));


create policy "Enable users to view their own data only"
on "public"."clients_settings"
as permissive
for select
to authenticated
using ((( SELECT auth.uid() AS uid) = client_id));


create policy "Enable read access for all users"
on "public"."plans"
as permissive
for select
to public
using (true);



