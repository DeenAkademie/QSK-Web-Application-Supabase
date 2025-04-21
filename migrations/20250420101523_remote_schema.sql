alter table "public"."clients_settings" drop constraint "clients_settings_client_id_fkey1";

alter table "public"."course_videos" drop constraint "course_videos_section_id_key";

alter table "public"."exercises_structure" drop constraint "exercises_lesson_no_key";

drop index if exists "public"."course_videos_section_id_key";

drop index if exists "public"."exercises_lesson_no_key";

alter table "public"."course_videos" alter column "section_id" drop not null;

alter table "public"."clients_settings" add constraint "clients_settings_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE not valid;

alter table "public"."clients_settings" validate constraint "clients_settings_client_id_fkey";

create policy "Enable read access for all users"
on "public"."lessons_structure"
as permissive
for select
to public
using (true);



