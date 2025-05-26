drop policy "Allow admins to modify chat_configs" on "public"."chat_configs";

drop policy "Allow authenticated users to read chat_configs" on "public"."chat_configs";

alter table "public"."chat_configs" drop constraint "chat_configs_pinecone_index_name_check";

alter table "public"."chat_configs" drop constraint "chat_configs_system_prompt_check";

alter table "public"."chat_configs" drop constraint "chat_configs_pkey";

drop index if exists "public"."chat_configs_pkey";

alter table "public"."chat_configs" disable row level security;

CREATE UNIQUE INDEX chat_configs_new_pkey ON public.chat_configs USING btree (company_id);

alter table "public"."chat_configs" add constraint "chat_configs_new_pkey" PRIMARY KEY using index "chat_configs_new_pkey";

alter table "public"."chat_configs" add constraint "chat_configs_new_system_prompt_check" CHECK ((char_length(system_prompt) <= 10000)) not valid;

alter table "public"."chat_configs" validate constraint "chat_configs_new_system_prompt_check";


