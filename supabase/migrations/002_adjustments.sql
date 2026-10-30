-- Corrections du propriétaire (pièces, cœurs, nourriture) appliquées par le jeu lui-même.
-- À exécuter une fois dans le SQL Editor du projet. Ne modifie aucune partie existante.
-- Le jeu lit les corrections du joueur connecté et les applique à sa partie la plus récente
-- (appareil, récupération en ligne ou fichier importé), une seule fois par partie.
-- Ne plus modifier public.prairie_saves à la main : utiliser prairie_private.adjust_player.
begin;
create table public.prairie_adjustments (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('set_pattes', 'add_pattes', 'add_hearts', 'add_grass')),
 amount bigint not null check (amount between -1000000000 and 1000000000),
 note text,
 created_at timestamptz not null default now()
);
create index prairie_adjustments_owner on public.prairie_adjustments (owner_id, created_at desc);
alter table public.prairie_adjustments enable row level security;
revoke all on public.prairie_adjustments from public, anon, authenticated;
grant select on public.prairie_adjustments to authenticated;
create policy own_adjustments on public.prairie_adjustments for select to authenticated using (owner_id = (select auth.uid()));

-- Exemple : select prairie_private.adjust_player('joueur@example.com', 'set_pattes', 100, 'Remise à 100 pièces');
create function prairie_private.adjust_player(p_email text, p_kind text, p_amount bigint, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid; new_id uuid;
begin
 select id into uid from auth.users where lower(email) = lower(p_email);
 if uid is null then raise exception 'Adresse inconnue'; end if;
 if p_kind = 'set_pattes' and p_amount < 0 then raise exception 'Un nombre de pièces ne peut pas être négatif'; end if;
 insert into public.prairie_adjustments (owner_id, kind, amount, note) values (uid, p_kind, p_amount, p_note)
 returning id into new_id;
 return new_id;
end $$;
revoke all on function prairie_private.adjust_player(text, text, bigint, text) from public, anon, authenticated;

-- Où en est un joueur : dernière révision, ressources, corrections appliquées ou en attente.
create function prairie_private.player_status(p_email text)
returns table (revision bigint, saved_at timestamptz, pattes jsonb, hearts jsonb, grass jsonb, rabbits int, correction uuid, kind text, amount bigint, created_at timestamptz, applied boolean)
language sql security definer set search_path = '' as $$
 select s.revision, s.saved_at, s.state->'pattes', s.state->'hearts', s.state->'grass', jsonb_array_length(s.state->'rabbits'),
  a.id, a.kind, a.amount, a.created_at, coalesce(s.state->'appliedAdjustments' ? a.id::text, false)
 from auth.users u
 left join public.prairie_saves s on s.owner_id = u.id
 left join public.prairie_adjustments a on a.owner_id = u.id
 where lower(u.email) = lower(p_email)
 order by a.created_at desc nulls last
$$;
revoke all on function prairie_private.player_status(text) from public, anon, authenticated;
commit;
