-- Taggy v0.5.6 migration: run once in Supabase SQL Editor. Safe to rerun.
-- Existing events, feedback, admins and API quota are retained.

-- 交易開始：保留既有資料
begin;

-- 新增預設標籤欄位與初始資料（僅首次）
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='label_library' and column_name='is_default') then
    alter table public.label_library add column is_default boolean not null default false;
    insert into public.label_library(content,is_default,submissions)
    select v,true,0 from unnest(array['乖巧','勇敢','愛哭','獨立','需要照顧','不合群','善良','有創意','膽小','堅強','很努力','不一樣']) v
    where not exists(select 1 from public.label_aliases a where a.source=v)
    on conflict(content) do update set is_default=true;
  end if;
end $$;


-- 前台公開標籤清單
create or replace function public.list_labels()
returns table(content text) language sql stable security definer set search_path='' as $$
  select l.content from public.label_library l where l.visible order by l.is_default desc,l.first_seen,l.content;
$$;
revoke all on function public.list_labels() from public;
grant execute on function public.list_labels() to anon, authenticated;


-- 管理者新增或取消預設標籤
create or replace function public.set_default_label(p_content text,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
declare
  v text := btrim(p_content);
  canonical text;
begin
  if not public.is_tag_admin() then
    raise exception 'Forbidden';
  end if;
  if v is null or char_length(v) not between 1 and 24 or v ~ '[[:cntrl:]]' or p_enabled is null then
    raise exception 'Invalid label';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(52702);
  select target into canonical from public.label_aliases where source=v;
  v:=coalesce(canonical,v);
  if p_enabled then
    insert into public.label_library(content,is_default,submissions,visible) values(v,true,0,true)
    on conflict(content) do update set is_default=true,visible=true;
  else
    update public.label_library set is_default=false where content=v;
  end if;
end; $$;
revoke all on function public.set_default_label(text,boolean) from public, anon, authenticated;
grant execute on function public.set_default_label(text,boolean) to authenticated;


-- 管理者隱藏、公開、合併及永久刪除
create or replace function public.manage_label(p_action text,p_content text,p_target text default null) returns void language plpgsql security definer set search_path='' as $$
declare
  v text := btrim(p_target);
  oldrow public.label_library%rowtype;
begin
 if not public.is_tag_admin() then
    raise exception 'Forbidden';
  end if;
 perform pg_catalog.pg_advisory_xact_lock(52702);
 select * into oldrow from public.label_library where content=p_content;
 if not found then
    raise exception 'Label not found';
  end if;
 if p_action in ('hide','show') then
    update public.label_library set visible=(p_action='show') where content=p_content;
 elsif p_action='delete' then
 delete from public.label_events where content=p_content or content in(select source from public.label_aliases where target=p_content);
 delete from public.label_aliases where target=p_content or source=p_content;
 delete from public.label_library where content=p_content;
 elsif p_action='merge' then
 if v is null or char_length(v) not between 1 and 24 or v=p_content or v ~ '[[:cntrl:]]' or exists(select 1 from public.label_aliases where source=v) then
    raise exception 'Invalid target';
  end if;
 insert into public.label_library(content,submissions,first_seen,last_seen,visible,is_default) values(v,oldrow.submissions,oldrow.first_seen,oldrow.last_seen,oldrow.visible,oldrow.is_default)
 on conflict(content) do update set
   submissions=public.label_library.submissions+excluded.submissions,
   first_seen=least(public.label_library.first_seen,excluded.first_seen),
   last_seen=greatest(public.label_library.last_seen,excluded.last_seen),
   is_default=public.label_library.is_default or excluded.is_default;
 update public.label_aliases set target=v where target=p_content;
 insert into public.label_aliases(source,target) values(p_content,v) on conflict(source) do update set target=excluded.target;
 delete from public.label_library where content=p_content;
 else raise exception 'Invalid action';
  end if;
end; $$;
revoke all on function public.manage_label(text,text,text) from public;
grant execute on function public.manage_label(text,text,text) to authenticated;


-- 完成交易
commit;
