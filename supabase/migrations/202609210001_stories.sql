-- Run once in the Supabase SQL editor, or with `supabase db push`.
create table public.folio_stories (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  version bigint not null default 1 check (version > 0),
  story jsonb,
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  check (story is null or coalesce((jsonb_typeof(story) = 'object' and story->>'id' = id
    and jsonb_typeof(story->'blocks') = 'array'), false))
);
alter table public.folio_stories enable row level security;
alter table public.folio_stories force row level security;
create policy own_stories on public.folio_stories for select to authenticated
  using (owner_id = (select auth.uid()));
revoke all on public.folio_stories from anon, authenticated;
grant select on public.folio_stories to authenticated;

-- No direct write grant: every mutation must pass the compare-and-swap guard.
-- A tombstone (null content) keeps a stale device from resurrecting a deletion.
create function public.save_folio_story(story_id text, expected_version bigint, content jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); saved public.folio_stories;
begin
  if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if expected_version < 0 or expected_version is null then
    raise exception 'Invalid version' using errcode = '22023';
  end if;
  if expected_version = 0 then
    insert into public.folio_stories(owner_id, id, story)
      values (uid, story_id, content) on conflict do nothing returning * into saved;
  else
    update public.folio_stories set story = content, version = version + 1, updated_at = now()
      where owner_id = uid and id = story_id and version = expected_version returning * into saved;
  end if;
  if saved.id is null then raise exception 'Story changed on another device' using errcode = '40001'; end if;
  return jsonb_build_object('id', saved.id, 'version', saved.version, 'story', saved.story);
end $$;
revoke all on function public.save_folio_story(text, bigint, jsonb) from public, anon;
grant execute on function public.save_folio_story(text, bigint, jsonb) to authenticated;
