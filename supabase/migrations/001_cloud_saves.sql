-- Projet neuf uniquement : exécuter une fois dans le SQL Editor.
begin;
create schema prairie_private;
revoke all on schema prairie_private from public, anon;
grant usage on schema prairie_private to authenticated;

create table public.prairie_saves (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null, format integer not null,
 revision bigint not null check (revision between 1 and 9007199254740991),
 saved_at timestamptz not null, operation_id uuid not null
);
create table public.prairie_history (
 owner_id uuid references auth.users(id) on delete cascade,
 revision bigint not null, state jsonb not null, format integer not null,
 saved_at timestamptz not null, operation_id uuid not null,
 primary key (owner_id, revision)
);
create table prairie_private.operations (
 owner_id uuid references auth.users(id) on delete cascade,
 operation_id uuid not null, fingerprint text not null,
 revision bigint not null, saved_at timestamptz not null,
 primary key (owner_id, operation_id)
);
alter table public.prairie_saves enable row level security;
alter table public.prairie_history enable row level security;
alter table prairie_private.operations enable row level security;
revoke all on public.prairie_saves, public.prairie_history, prairie_private.operations from public, anon, authenticated;
grant select on public.prairie_saves, public.prairie_history to authenticated;
create policy own_save on public.prairie_saves for select to authenticated using (owner_id = (select auth.uid()));
create policy own_history on public.prairie_history for select to authenticated using (owner_id = (select auth.uid()));

create function prairie_private.commit_game(p_owner uuid, p_expected bigint, p_operation uuid, p_state jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 uid uuid := auth.uid(); current public.prairie_saves; receipt prairie_private.operations;
 v numeric; fingerprint text; stamp timestamptz; rev bigint;
begin
 if uid is null or uid is distinct from p_owner then
  raise exception using errcode = '42501', message = 'Authenticated owner required';
 end if;
 if p_operation is null or p_expected is null or p_expected < 0 or p_expected >= 9007199254740991
    or p_state is null or jsonb_typeof(p_state) <> 'object' or octet_length(p_state::text) > 1000000
    or coalesce(jsonb_typeof(p_state->'version'), '') <> 'number' then
  return jsonb_build_object('status', 'invalid');
 end if;
 v := (p_state->>'version')::numeric;
 if v <> trunc(v) or v < 19 or v > 1000 then return jsonb_build_object('status', 'invalid'); end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
 select * into current from public.prairie_saves where owner_id = uid for update;
 if current.format > v then return jsonb_build_object('status', 'outdated'); end if;
 fingerprint := encode(sha256(convert_to(jsonb_build_object('expected', p_expected, 'state', p_state)::text, 'UTF8')), 'hex');
 select * into receipt from prairie_private.operations where owner_id = uid and operation_id = p_operation;
 if found then
  if receipt.fingerprint <> fingerprint then return jsonb_build_object('status', 'invalid_operation'); end if;
  return jsonb_build_object('status', 'ok', 'owner_id', uid, 'revision', receipt.revision, 'saved_at', receipt.saved_at, 'operation_id', p_operation);
 end if;
 if coalesce(current.revision, 0) <> p_expected then
  return jsonb_build_object('status', 'conflict', 'remote', to_jsonb(current));
 end if;
 stamp := clock_timestamp(); rev := p_expected + 1;
 if current.owner_id is not null then
  insert into public.prairie_history values (uid, current.revision, current.state, current.format, current.saved_at, current.operation_id);
 end if;
 insert into public.prairie_saves values (uid, p_state, v::integer, rev, stamp, p_operation)
 on conflict (owner_id) do update set state = excluded.state, format = excluded.format,
 revision = excluded.revision, saved_at = excluded.saved_at, operation_id = excluded.operation_id;
 insert into prairie_private.operations values (uid, p_operation, fingerprint, rev, stamp);
 -- Union : 30 dernières révisions + première révision de chacun des 7 derniers jours actifs UTC.
 delete from public.prairie_history h where h.owner_id = uid and h.revision not in (
  (select revision from public.prairie_history where owner_id = uid order by revision desc limit 30)
  union
  (select revision from (
   select distinct on ((saved_at at time zone 'UTC')::date) revision, saved_at
   from public.prairie_history where owner_id = uid
   order by (saved_at at time zone 'UTC')::date desc, revision asc
  ) days order by saved_at desc limit 7)
 );
 delete from prairie_private.operations where owner_id = uid and operation_id not in (
  select operation_id from prairie_private.operations where owner_id = uid order by revision desc limit 64
 );
 return jsonb_build_object('status', 'ok', 'owner_id', uid, 'revision', rev, 'saved_at', stamp, 'operation_id', p_operation);
end $$;
revoke all on function prairie_private.commit_game(uuid,bigint,uuid,jsonb) from public, anon;
grant execute on function prairie_private.commit_game(uuid,bigint,uuid,jsonb) to authenticated;
create function public.prairie_commit(p_owner uuid, p_expected bigint, p_operation uuid, p_state jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
 select prairie_private.commit_game(p_owner, p_expected, p_operation, p_state)
$$;
revoke all on function public.prairie_commit(uuid,bigint,uuid,jsonb) from public, anon;
grant execute on function public.prairie_commit(uuid,bigint,uuid,jsonb) to authenticated;

create function prairie_private.reset_player_password(p_email text, p_password text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if p_password is null or length(p_password) < 8 then raise exception 'Mot de passe : 8 caractères minimum'; end if;
 update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf'))
 where lower(email) = lower(p_email);
 if not found then raise exception 'Adresse inconnue'; end if;
end $$;
revoke all on function prairie_private.reset_player_password(text,text) from public, anon, authenticated;
commit;
