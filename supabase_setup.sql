-- MYCO Field Lab: run once in Supabase > SQL Editor, as the project owner.
-- Each signed-in user can only access their own trial data and private photos.
-- The publishable/anon key is safe for a GitHub Pages client ONLY with RLS on.

create table if not exists public.myco_trial_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.myco_trial_state enable row level security;
drop policy if exists myco_state_read on public.myco_trial_state;
drop policy if exists myco_state_insert on public.myco_trial_state;
drop policy if exists myco_state_update on public.myco_trial_state;
create policy myco_state_read on public.myco_trial_state for select to authenticated using ((select auth.uid()) = user_id);
create policy myco_state_insert on public.myco_trial_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy myco_state_update on public.myco_trial_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.myco_trial_state to authenticated;

-- Atomic revision-check save: prevents silent overwriting by another device.
create or replace function public.myco_save_trial(p_expected_revision bigint, p_data jsonb)
returns bigint
language plpgsql security invoker set search_path=public
as $$
declare v_revision bigint;
begin
  if auth.uid() is null then raise exception 'MYCO_NOT_AUTHENTICATED'; end if;
  if p_expected_revision = 0 then
    insert into public.myco_trial_state(user_id,data,revision,updated_at)
    values (auth.uid(),p_data,1,now())
    on conflict (user_id) do nothing
    returning revision into v_revision;
  else
    update public.myco_trial_state
    set data=p_data,revision=revision+1,updated_at=now()
    where user_id=auth.uid() and revision=p_expected_revision
    returning revision into v_revision;
  end if;
  if v_revision is null then raise exception 'MYCO_SYNC_CONFLICT: Cloud data changed. Download a backup, then load cloud or choose to replace it.'; end if;
  return v_revision;
end;
$$;
revoke all on function public.myco_save_trial(bigint,jsonb) from public;
grant execute on function public.myco_save_trial(bigint,jsonb) to authenticated;

create table if not exists public.myco_photos (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  day integer not null check (day between 1 and 90),
  bag text not null,
  date date not null,
  caption text not null default '',
  created timestamptz not null default now(),
  path text not null,
  original_name text not null default '',
  primary key(user_id,id)
);
alter table public.myco_photos enable row level security;
drop policy if exists myco_photos_read on public.myco_photos;
drop policy if exists myco_photos_insert on public.myco_photos;
drop policy if exists myco_photos_update on public.myco_photos;
drop policy if exists myco_photos_delete on public.myco_photos;
create policy myco_photos_read on public.myco_photos for select to authenticated using ((select auth.uid())=user_id);
create policy myco_photos_insert on public.myco_photos for insert to authenticated with check ((select auth.uid())=user_id);
create policy myco_photos_update on public.myco_photos for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy myco_photos_delete on public.myco_photos for delete to authenticated using ((select auth.uid())=user_id);
grant select,insert,update,delete on public.myco_photos to authenticated;

-- Photo files are stored in a PRIVATE bucket under auth.uid()/photo-id.jpg.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('myco-photos','myco-photos',false,5242880,array['image/jpeg']::text[])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists myco_storage_read on storage.objects;
drop policy if exists myco_storage_add on storage.objects;
drop policy if exists myco_storage_remove on storage.objects;
create policy myco_storage_read on storage.objects for select to authenticated using
  (bucket_id='myco-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy myco_storage_add on storage.objects for insert to authenticated with check
  (bucket_id='myco-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy myco_storage_remove on storage.objects for delete to authenticated using
  (bucket_id='myco-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
