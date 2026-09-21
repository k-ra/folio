import { beforeAll, afterAll, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
let db: PGlite
const a = '00000000-0000-0000-0000-000000000001',
  b = '00000000-0000-0000-0000-000000000002'
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    insert into auth.users values ('${a}'),('${b}');
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`)
  await db.exec(readFileSync('supabase/migrations/202609210001_stories.sql', 'utf8'))
}, 30000)
afterAll(async () => {
  await db.close()
})
const login = async (id: string, role = 'authenticated') => {
  await db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${id}',false);`)
}
it('enforces account ownership, denies anonymous/direct writes, deduplicates imports, and rejects stale versions', async () => {
  await login(a)
  const save = () =>
    db.query(`select public.save_folio_story('story',0,'{"id":"story","blocks":[],"title":"Private A"}')`)
  await save()
  await expect(save()).rejects.toThrow('Story changed')
  await expect(db.query(`update public.folio_stories set story=null`)).rejects.toThrow('permission denied')
  await login(b)
  expect((await db.query('select * from public.folio_stories')).rows).toHaveLength(0)
  await expect(
    db.query(`select public.save_folio_story('story',1,'{"id":"story","blocks":[]}')`),
  ).rejects.toThrow('Story changed')
  await db.query(`select public.save_folio_story('story',0,'{"id":"story","blocks":[],"title":"Private B"}')`)
  expect(
    (await db.query<{ story: { title: string } }>('select story from public.folio_stories')).rows[0].story
      .title,
  ).toBe('Private B')
  await login(a)
  expect(
    (await db.query<{ story: { title: string } }>('select story from public.folio_stories')).rows[0].story
      .title,
  ).toBe('Private A')
  await db.query(`select public.save_folio_story('story',1,'{"id":"story","blocks":[],"title":"Updated A"}')`)
  await expect(db.query(`select public.save_folio_story('story',1,null)`)).rejects.toThrow('Story changed')
  await expect(
    db.query(`select public.save_folio_story('wrong-id',0,'{"id":"mismatch","blocks":[]}')`),
  ).rejects.toThrow()
  await login('', 'anon')
  await expect(db.query('select * from public.folio_stories')).rejects.toThrow('permission denied')
  await expect(db.query(`select public.save_folio_story('x',0,null)`)).rejects.toThrow('permission denied')
})
