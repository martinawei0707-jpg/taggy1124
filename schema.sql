-- 新增獨立標籤庫，不刪除舊場次資料。
create table if not exists public.label_library (
  content text primary key check (char_length(content) between 1 and 24),
  submissions bigint not null default 0,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  visible boolean not null default true
);
create table if not exists public.label_events (
  event_id uuid primary key,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.label_library enable row level security;
alter table public.label_events enable row level security;
revoke all on public.label_library, public.label_events from anon, authenticated;
create or replace function public.record_label(p_content text, p_event uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v text := btrim(p_content); inserted integer;
begin
  if v is null or char_length(v) not between 1 and 24 or p_event is null or v ~ '[[:cntrl:]]' then
    raise exception 'Invalid label';
  end if;
  insert into public.label_events(event_id,content) values(p_event,v) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 1 then
    insert into public.label_library(content,submissions) values(v,1)
    on conflict(content) do update set submissions=public.label_library.submissions+1,last_seen=now();
  end if;
  return true;
end; $$;
create or replace function public.list_labels()
returns table(content text) language sql stable security definer set search_path = '' as $$
  select l.content from public.label_library l where l.visible order by l.first_seen,l.content;
$$;
revoke all on function public.record_label(text,uuid), public.list_labels() from public;
grant execute on function public.record_label(text,uuid), public.list_labels() to anon, authenticated;

-- v0.4.2：獨立回饋表；公開端只能透過 RPC 新增，不可讀取。
create table if not exists public.feedback (
  id uuid primary key,
  ratings integer[] not null,
  feelings text[] not null,
  other_feeling text not null default '',
  thought text not null default '',
  suggestion text not null default '',
  consent_version text not null default 'v0.4.2',
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
revoke all on public.feedback from public, anon, authenticated;
create or replace function public.submit_feedback(p_id uuid,p_ratings integer[],p_feelings text[],p_other text,p_thought text,p_suggestion text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_id is null or p_ratings is null or cardinality(p_ratings) <> 4
    or exists(select 1 from unnest(p_ratings) v where v not between 1 and 5)
    or p_feelings is null or cardinality(p_feelings)>9
    or exists(select 1 from unnest(p_feelings) v where v is null or v not in ('有趣','驚訝','開心','感動','困惑','不舒服','有點難過','沒有特別感覺','其他'))
    or p_other is null or char_length(p_other)>200
    or p_thought is null or char_length(p_thought)>1000
    or p_suggestion is null or char_length(p_suggestion)>1000
    or (not exists(select 1 from unnest(p_ratings) v where v is not null) and cardinality(p_feelings)=0 and btrim(p_other||p_thought||p_suggestion)='')
  then raise exception 'Invalid feedback'; end if;
  insert into public.feedback(id,ratings,feelings,other_feeling,thought,suggestion)
  values(p_id,p_ratings,p_feelings,p_other,p_thought,p_suggestion) on conflict(id) do nothing;
  return true;
end; $$;
revoke all on function public.submit_feedback(uuid,integer[],text[],text,text,text) from public;
grant execute on function public.submit_feedback(uuid,integer[],text[],text,text,text) to anon, authenticated;

-- v0.5: atomic global daily AI request cap (UTC). Only the server may reserve.
create table if not exists public.intro_quota(day date primary key, used integer not null default 0);
alter table public.intro_quota enable row level security;
revoke all on public.intro_quota from public, anon, authenticated;
create or replace function public.reserve_intro_quota() returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into public.intro_quota(day,used) values((now() at time zone 'UTC')::date,1)
 on conflict(day) do update set used=public.intro_quota.used+1 where public.intro_quota.used<100 returning used into n;
 return n is not null;
end; $$;
revoke all on function public.reserve_intro_quota() from public, anon, authenticated;
grant execute on function public.reserve_intro_quota() to service_role;

-- v0.5.2：僅明確授權的製作團隊帳號能查閱及管理資料。
create table if not exists public.tag_admins(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.tag_admins enable row level security;
revoke all on public.tag_admins from public, anon, authenticated;
create or replace function public.is_tag_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tag_admins where user_id=auth.uid());
$$;
revoke all on function public.is_tag_admin() from public;
grant execute on function public.is_tag_admin() to authenticated;
grant select on public.label_library, public.label_events, public.feedback to authenticated;
drop policy if exists admin_read_library on public.label_library;
create policy admin_read_library on public.label_library for select to authenticated using(public.is_tag_admin());
drop policy if exists admin_read_events on public.label_events;
create policy admin_read_events on public.label_events for select to authenticated using(public.is_tag_admin());
drop policy if exists admin_read_feedback on public.feedback;
create policy admin_read_feedback on public.feedback for select to authenticated using(public.is_tag_admin());
create index if not exists label_events_created_idx on public.label_events(created_at);
create index if not exists feedback_created_idx on public.feedback(created_at);
-- 別名保留原始事件，後續輸入亦會歸到整理後的詞彙。
create table if not exists public.label_aliases(source text primary key, target text not null);
alter table public.label_aliases enable row level security;
revoke all on public.label_aliases from public, anon, authenticated;
create or replace function public.record_label(p_content text,p_event uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare v text:=btrim(p_content); canonical text; inserted integer;
begin
 if v is null or char_length(v) not between 1 and 24 or p_event is null or v ~ '[[:cntrl:]]' then raise exception 'Invalid label'; end if;
 perform pg_catalog.pg_advisory_xact_lock(52702);
 select target into canonical from public.label_aliases where source=v;
 canonical:=coalesce(canonical,v);
 insert into public.label_events(event_id,content) values(p_event,v) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=1 then
 insert into public.label_library(content,submissions) values(canonical,1) on conflict(content) do update set submissions=public.label_library.submissions+1,last_seen=now();
 end if;
 return true;
end; $$;
create or replace function public.manage_label(p_action text,p_content text,p_target text default null) returns void language plpgsql security definer set search_path='' as $$
declare v text:=btrim(p_target); oldrow public.label_library%rowtype;
begin
 if not public.is_tag_admin() then raise exception 'Forbidden'; end if;
 perform pg_catalog.pg_advisory_xact_lock(52702);
 select * into oldrow from public.label_library where content=p_content;
 if not found then raise exception 'Label not found'; end if;
 if p_action in ('hide','show') then update public.label_library set visible=(p_action='show') where content=p_content;
 elsif p_action='delete' then
 delete from public.label_events where content=p_content or content in(select source from public.label_aliases where target=p_content);
 delete from public.label_aliases where target=p_content or source=p_content;
 delete from public.label_library where content=p_content;
 elsif p_action='merge' then
 if v is null or char_length(v) not between 1 and 24 or v=p_content or v ~ '[[:cntrl:]]' or exists(select 1 from public.label_aliases where source=v) then raise exception 'Invalid target'; end if;
 insert into public.label_library(content,submissions,first_seen,last_seen,visible) values(v,oldrow.submissions,oldrow.first_seen,oldrow.last_seen,oldrow.visible) on conflict(content) do update set submissions=public.label_library.submissions+excluded.submissions,first_seen=least(public.label_library.first_seen,excluded.first_seen),last_seen=greatest(public.label_library.last_seen,excluded.last_seen);
 update public.label_aliases set target=v where target=p_content;
 insert into public.label_aliases(source,target) values(p_content,v) on conflict(source) do update set target=excluded.target;
 delete from public.label_library where content=p_content;
 else raise exception 'Invalid action'; end if;
end; $$;
revoke all on function public.manage_label(text,text,text) from public;
grant execute on function public.manage_label(text,text,text) to authenticated;
create or replace function public.delete_feedback(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin if not public.is_tag_admin() then raise exception 'Forbidden'; end if; delete from public.feedback where id=p_id; end; $$;
revoke all on function public.delete_feedback(uuid) from public;
grant execute on function public.delete_feedback(uuid) to authenticated;
