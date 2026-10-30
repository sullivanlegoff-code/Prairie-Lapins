import {PGlite} from '@electric-sql/pglite';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import saves from '../supabase/migrations/001_cloud_saves.sql?raw';
import adjustments from '../supabase/migrations/002_adjustments.sql?raw';

const A = '00000000-0000-4000-8000-000000000001', B = '00000000-0000-4000-8000-000000000002';
let db: PGlite;
async function as<T>(owner: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${owner ? 'authenticated' : 'anon'}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner ?? '']);
  try { return await fn(); } finally { await db.exec('reset role'); }
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema extensions;
    create table auth.users (id uuid primary key, email text, encrypted_password text);
    insert into auth.users values ('${A}', 'a@example.invalid', ''), ('${B}', 'b@example.invalid', '');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(saves); await db.exec(adjustments);
}, 30000);
afterAll(async () => { await db?.close(); });

describe.sequential('SQL local : corrections du propriétaire', () => {
  it('le propriétaire ajoute une correction sans toucher aux parties', async () => {
    const r = await db.query<{id: string}>("select prairie_private.adjust_player('A@example.invalid', 'set_pattes', 100, 'test') id");
    expect(r.rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
    await expect(db.query("select prairie_private.adjust_player('inconnu@example.invalid', 'set_pattes', 1)")).rejects.toThrow(/Adresse inconnue/);
    await expect(db.query("select prairie_private.adjust_player('a@example.invalid', 'set_pattes', -1)")).rejects.toThrow(/négatif/);
    await expect(db.query("select prairie_private.adjust_player('a@example.invalid', 'delete_all', 1)")).rejects.toThrow();
    expect((await db.query('select count(*)::int n from public.prairie_saves')).rows[0]).toEqual({n: 0});
  });
  it('chaque joueur lit seulement ses corrections, sans pouvoir les écrire', async () => {
    expect((await as(A, () => db.query('select kind, amount::int from public.prairie_adjustments'))).rows).toEqual([{kind: 'set_pattes', amount: 100}]);
    expect((await as(B, () => db.query('select * from public.prairie_adjustments'))).rows).toEqual([]);
    await expect(as(null, () => db.query('select * from public.prairie_adjustments'))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => db.query(`insert into public.prairie_adjustments (owner_id, kind, amount) values ('${A}', 'add_pattes', 5)`))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => db.query('delete from public.prairie_adjustments'))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => db.query("select prairie_private.adjust_player('a@example.invalid', 'add_pattes', 5)"))).rejects.toThrow(/permission denied/);
  });
  it('le résumé montre si la correction est appliquée dans la partie', async () => {
    const id = (await db.query<{id: string}>('select id from public.prairie_adjustments')).rows[0].id;
    await as(A, () => db.query("select public.prairie_commit($1, 0, $2, $3::jsonb)", [A, '00000000-0000-4000-9000-000000000001', JSON.stringify({version: 21, pattes: 100, hearts: 1, grass: 2, rabbits: [], appliedAdjustments: [id]})]));
    const status = await db.query<{revision: number; applied: boolean}>("select revision::int, applied from prairie_private.player_status('a@example.invalid')");
    expect(status.rows).toEqual([{revision: 1, applied: true}]);
  });
});
