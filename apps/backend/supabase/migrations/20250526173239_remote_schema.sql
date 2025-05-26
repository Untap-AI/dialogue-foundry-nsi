create table "public"."companies" (
    "id" text not null default uuid_generate_v4(),
    "name" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."companies" enable row level security;

create table "public"."dashboard_users" (
    "id" uuid not null default uuid_generate_v4(),
    "auth_id" uuid,
    "company_id" text not null,
    "email" text not null,
    "first_name" text,
    "last_name" text,
    "role" text not null default 'admin'::text,
    "status" text not null default 'invited'::text,
    "invite_token" uuid,
    "invite_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "last_login" timestamp with time zone
);


alter table "public"."dashboard_users" enable row level security;

alter table "public"."chat_configs" enable row level security;

alter table "public"."chats" add column "messages_count" integer default 0;

CREATE UNIQUE INDEX companies_pkey ON public.companies USING btree (id);

CREATE UNIQUE INDEX dashboard_users_auth_id_key ON public.dashboard_users USING btree (auth_id);

CREATE INDEX dashboard_users_company_id_idx ON public.dashboard_users USING btree (company_id);

CREATE INDEX dashboard_users_email_company_idx ON public.dashboard_users USING btree (email, company_id);

CREATE UNIQUE INDEX dashboard_users_email_company_unique ON public.dashboard_users USING btree (email, company_id);

CREATE INDEX dashboard_users_email_lookup_idx ON public.dashboard_users USING btree (email);

CREATE UNIQUE INDEX dashboard_users_invite_token_key ON public.dashboard_users USING btree (invite_token);

CREATE UNIQUE INDEX dashboard_users_pkey ON public.dashboard_users USING btree (id);

CREATE INDEX idx_chat_configs_company_id_fk ON public.chat_configs USING btree (company_id);

alter table "public"."companies" add constraint "companies_pkey" PRIMARY KEY using index "companies_pkey";

alter table "public"."dashboard_users" add constraint "dashboard_users_pkey" PRIMARY KEY using index "dashboard_users_pkey";

alter table "public"."chat_configs" add constraint "chat_configs_company_id_fkey_companies" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."chat_configs" validate constraint "chat_configs_company_id_fkey_companies";

alter table "public"."dashboard_users" add constraint "dashboard_users_auth_id_key" UNIQUE using index "dashboard_users_auth_id_key";

alter table "public"."dashboard_users" add constraint "dashboard_users_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."dashboard_users" validate constraint "dashboard_users_company_id_fkey";

alter table "public"."dashboard_users" add constraint "dashboard_users_email_company_unique" UNIQUE using index "dashboard_users_email_company_unique";

alter table "public"."dashboard_users" add constraint "dashboard_users_invite_token_key" UNIQUE using index "dashboard_users_invite_token_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.chats__dec_message_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  update chats
    set messages_count = messages_count - 1
    where id = old.chat_id;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.chats__inc_message_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  update chats
    set messages_count = messages_count + 1
    where id = new.chat_id;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_table_ddl(target_table text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result text;
BEGIN
  WITH 
    table_attr AS (
      SELECT 
        a.attname as column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
        CASE 
          WHEN a.attnotnull THEN 'NOT NULL' 
          ELSE 'NULL' 
        END as nullable,
        CASE 
          WHEN a.atthasdef THEN pg_get_expr(d.adbin, d.adrelid)
          ELSE ''
        END as default_value
      FROM 
        pg_attribute a
        LEFT JOIN pg_attrdef d ON (a.attrelid = d.adrelid AND a.attnum = d.adnum)
      WHERE 
        a.attrelid = target_table::regclass
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum
    ),
    constraints AS (
      SELECT
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_def
      FROM
        pg_constraint
      WHERE
        conrelid = target_table::regclass
        AND contype != 'f'  -- Exclude foreign key constraints as they're added separately
    ),
    fk_constraints AS (
      SELECT
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_def
      FROM
        pg_constraint
      WHERE
        conrelid = target_table::regclass
        AND contype = 'f'  -- Only foreign key constraints
    )
  SELECT 
    'CREATE TABLE ' || target_table || ' (' ||
    string_agg(
      column_name || ' ' || data_type || 
      CASE 
        WHEN default_value != '' THEN ' DEFAULT ' || default_value 
        ELSE '' 
      END || 
      ' ' || nullable, 
      ', '
    ) ||
    CASE 
      WHEN (SELECT COUNT(*) FROM constraints) > 0 THEN
        ', ' || string_agg(constraint_def, ', ' ORDER BY constraint_name) 
      ELSE '' 
    END ||
    ');' ||
    CASE 
      WHEN (SELECT COUNT(*) FROM fk_constraints) > 0 THEN
        E'\n' || string_agg(
          'ALTER TABLE ' || target_table || ' ADD CONSTRAINT ' || 
          constraint_name || ' ' || constraint_def || ';', 
          E'\n' 
          ORDER BY constraint_name
        )
      ELSE '' 
    END
  INTO result
  FROM table_attr, constraints
  GROUP BY target_table;

  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM dashboard_users
    WHERE auth_id = auth.uid()
    AND role = 'admin'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_company_ids()
 RETURNS SETOF text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY SELECT company_id FROM dashboard_users
    WHERE auth_id = auth.uid();
END;
$function$
;

grant delete on table "public"."companies" to "anon";

grant insert on table "public"."companies" to "anon";

grant references on table "public"."companies" to "anon";

grant select on table "public"."companies" to "anon";

grant trigger on table "public"."companies" to "anon";

grant truncate on table "public"."companies" to "anon";

grant update on table "public"."companies" to "anon";

grant delete on table "public"."companies" to "authenticated";

grant insert on table "public"."companies" to "authenticated";

grant references on table "public"."companies" to "authenticated";

grant select on table "public"."companies" to "authenticated";

grant trigger on table "public"."companies" to "authenticated";

grant truncate on table "public"."companies" to "authenticated";

grant update on table "public"."companies" to "authenticated";

grant delete on table "public"."companies" to "service_role";

grant insert on table "public"."companies" to "service_role";

grant references on table "public"."companies" to "service_role";

grant select on table "public"."companies" to "service_role";

grant trigger on table "public"."companies" to "service_role";

grant truncate on table "public"."companies" to "service_role";

grant update on table "public"."companies" to "service_role";

grant delete on table "public"."dashboard_users" to "anon";

grant insert on table "public"."dashboard_users" to "anon";

grant references on table "public"."dashboard_users" to "anon";

grant select on table "public"."dashboard_users" to "anon";

grant trigger on table "public"."dashboard_users" to "anon";

grant truncate on table "public"."dashboard_users" to "anon";

grant update on table "public"."dashboard_users" to "anon";

grant delete on table "public"."dashboard_users" to "authenticated";

grant insert on table "public"."dashboard_users" to "authenticated";

grant references on table "public"."dashboard_users" to "authenticated";

grant select on table "public"."dashboard_users" to "authenticated";

grant trigger on table "public"."dashboard_users" to "authenticated";

grant truncate on table "public"."dashboard_users" to "authenticated";

grant update on table "public"."dashboard_users" to "authenticated";

grant delete on table "public"."dashboard_users" to "service_role";

grant insert on table "public"."dashboard_users" to "service_role";

grant references on table "public"."dashboard_users" to "service_role";

grant select on table "public"."dashboard_users" to "service_role";

grant trigger on table "public"."dashboard_users" to "service_role";

grant truncate on table "public"."dashboard_users" to "service_role";

grant update on table "public"."dashboard_users" to "service_role";

create policy "Users can view their own company"
on "public"."companies"
as permissive
for select
to public
using ((id IN ( SELECT user_company_ids() AS user_company_ids)));


create policy "Users can view other users in their company"
on "public"."dashboard_users"
as permissive
for select
to public
using ((company_id IN ( SELECT user_company_ids() AS user_company_ids)));


create policy "dashboard_users_insert"
on "public"."dashboard_users"
as permissive
for insert
to public
with check ((is_admin() AND (company_id IN ( SELECT user_company_ids() AS user_company_ids))));


create policy "dashboard_users_update"
on "public"."dashboard_users"
as permissive
for update
to public
using (((auth_id IS NULL) OR (is_admin() AND (company_id IN ( SELECT user_company_ids() AS user_company_ids)))));


CREATE TRIGGER on_message_delete AFTER DELETE ON public.messages FOR EACH ROW EXECUTE FUNCTION chats__dec_message_count();

CREATE TRIGGER on_message_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION chats__inc_message_count();


