import {PGlite} from '@electric-sql/pglite';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import migration from '../supabase/migrations/001_cloud_saves.sql?raw';

const A = '00000000-0000-4000-8000-000000000001', B = '00000000-0000-4000-8000-000000000002';
let db: PGlite, operation = 0;
let pgcrypto = false;
const uuid = () => `00000000-0000-4000-9000-${String(++operation).padStart(12, '0')}`;
interface Result {status: string; revision: number; saved_at: string; remote?: {revision: number; state: unknown}}
async function as<T>(owner: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${owner ? 'authenticated' : 'anon'}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner ?? '']);
  try { return await fn(); } finally { await db.exec('reset role'); }
}
async function commit(owner: string, expected: number, state: unknown = {version: 19}, op = uuid()) {
  const r = await db.query<{r: Result}>('select public.prairie_commit($1,$2,$3,$4::jsonb) r', [owner, expected, op, JSON.stringify(state)]);
  return r.rows[0].r;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema extensions;
    create table auth.users (id uuid primary key, email text, encrypted_password text);
    insert into auth.users values ('${A}', 'a@example.invalid', ''), ('${B}', 'b@example.invalid', '');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  const available = await db.query<{name: string}>("select name from pg_available_extensions where name = 'pgcrypto'");
  pgcrypto = available.rows.length > 0;
  if (pgcrypto) await db.exec('create extension pgcrypto with schema extensions');
  await db.exec(migration);
}, 30000);
afterAll(async () => { await db?.close(); });

describe.sequential('SQL PostgreSQL local : RLS, CAS et reçus (aucun Supabase distant)', () => {
  it('refuse anon, les écritures directes et un propriétaire forgé', async () => {
    await expect(as(null, () => commit(A, 0))).rejects.toThrow(/permission denied/);
    await expect(as(null, () => db.query('select * from public.prairie_saves'))).rejects.toThrow(/permission denied/);
    await expect(as(null, () => db.query('select * from public.prairie_history'))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => commit(B, 0))).rejects.toThrow(/Authenticated owner/);
    for (const table of ['public.prairie_saves', 'public.prairie_history', 'prairie_private.operations']) {
      for (const sql of [`delete from ${table}`, `update ${table} set owner_id = '${B}'`, `insert into ${table}(owner_id) values ('${A}')`]) {
        await expect(as(A, () => db.query(sql))).rejects.toThrow(/permission denied/);
      }
    }
  });
  it('applique une opération une seule fois et refuse un contenu différent', async () => {
    const op = uuid(), state = {version: 19, player: 'a'};
    const first = await as(A, () => commit(A, 0, state, op));
    expect(first.status).toBe('ok'); expect(first.revision).toBe(1); expect(Date.parse(first.saved_at)).toBeGreaterThan(0);
    expect(await as(A, () => commit(A, 0, state, op))).toEqual(first);
    expect((await as(A, () => commit(A, 0, {...state, player: 'b'}, op))).status).toBe('invalid_operation');
    expect((await as(A, () => commit(A, 1, state, op))).status).toBe('invalid_operation');
  });
  it('retourne la ligne distante en cas de conflit CAS', async () => {
    expect((await as(A, () => commit(A, 1, {version: 19, progress: 20}))).revision).toBe(2);
    const conflict = await as(A, () => commit(A, 1));
    expect(conflict.status).toBe('conflict'); expect(conflict.remote?.revision).toBe(2);
    expect(conflict.remote?.state).toEqual({version: 19, progress: 20});
  });
  it('valide uniquement le contrat minimal objet/version/taille', async () => {
    for (const state of [null, [], 'x', {}, {version: '19'}, {version: 18}, {version: 19.5}, {version: 1001}, {version: 19, huge: 'é'.repeat(510000)}]) {
      expect((await as(A, () => commit(A, 2, state))).status).toBe('invalid');
    }
    expect((await db.query<{revision: number}>('select revision from public.prairie_saves where owner_id=$1', [A])).rows[0].revision).toBe(2);
  });
  it('isole les sauvegardes et les historiques de deux comptes', async () => {
    await as(B, () => commit(B, 0)); await as(B, () => commit(B, 1));
    for (const owner of [A, B]) for (const table of ['prairie_saves', 'prairie_history']) {
      const r = await as(owner, () => db.query<{owner_id: string}>(`select distinct owner_id from public.${table}`));
      expect(r.rows).toEqual([{owner_id: owner}]);
    }
  });
  it('garde 30 révisions récentes et le premier état des 7 derniers jours actifs UTC, 64 reçus', async () => {
    for (let rev = 2; rev < 77; rev++) await as(A, () => commit(A, rev, {version: 19, n: rev}));
    let rows = (await db.query<{revision: number}>('select revision from public.prairie_history where owner_id=$1 order by revision', [A])).rows;
    expect(rows.map(r => r.revision)).toEqual([1, ...Array.from({length: 30}, (_, i) => 47 + i)]);
    expect((await db.query<{n: number}>('select count(*)::int n from prairie_private.operations where owner_id=$1', [A])).rows[0].n).toBe(64);
    // Synthetic server timestamps, including two rows on each active UTC day.
    await db.query('delete from public.prairie_history where owner_id=$1', [A]);
    for (let day = 1; day <= 10; day++) for (let n = 0; n < 2; n++) {
      await db.query("insert into public.prairie_history values ($1,$2,'{\"version\":19}',19, date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC' - $3::int * interval '1 day' + $4::int * interval '1 hour', $5)", [A, (11 - day) * 2 + n, day, n, uuid()]);
    }
    // Fill the recent revision window independently of the daily anchors.
    for (let rev = 30; rev < 70; rev++) await db.query("insert into public.prairie_history values ($1,$2,'{\"version\":19}',19,clock_timestamp(),$3)", [A, rev, uuid()]);
    await as(A, () => commit(A, 77));
    rows = (await db.query<{revision: number}>('select revision from public.prairie_history where owner_id=$1 order by revision', [A])).rows;
    expect(rows.map(r => r.revision)).toEqual([10, 12, 14, 16, 18, 20, 30, ...Array.from({length: 29}, (_, i) => 41 + i), 77]);
  });
  it('protège un format futur même contre le rejeu ancien', async () => {
    const op = uuid(); const receipt = await as(B, () => commit(B, 2, {version: 19}, op));
    expect(receipt.status).toBe('ok');
    await db.query("update public.prairie_saves set format=20,state='{\"version\":20}' where owner_id=$1", [B]);
    expect((await as(B, () => commit(B, 2, {version: 19}, op))).status).toBe('outdated');
    expect((await as(B, () => commit(B, 3))).status).toBe('outdated');
  });
  it('réserve la réinitialisation au propriétaire SQL ; pgcrypto si disponible', async () => {
    for (const owner of [null, A]) await expect(as(owner, () => db.query("select prairie_private.reset_player_password('a@example.invalid','abcdefgh')"))).rejects.toThrow(/permission denied/);
    await expect(db.query("select prairie_private.reset_player_password('a@example.invalid','court')")).rejects.toThrow(/8 caractères/);
    if (pgcrypto) {
      await db.query("select prairie_private.reset_player_password('a@example.invalid','abcdefgh')");
      expect((await db.query<{ok: boolean}>("select encrypted_password = extensions.crypt('abcdefgh',encrypted_password) ok from auth.users where id=$1", [A])).rows[0].ok).toBe(true);
    } else {
      // PGlite 0.5.8 ne fournit pas pgcrypto : seuls les droits et la longueur sont testés.
      expect((await db.query("select name from pg_available_extensions where name='pgcrypto'")).rows).toHaveLength(0);
    }
    expect((await db.query('select * from public.prairie_saves where owner_id=$1', [A])).rows).toHaveLength(1);
  });
});
