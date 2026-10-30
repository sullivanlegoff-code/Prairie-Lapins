-- Naissance programmée par le propriétaire : le prochain croisement qui remplit la recette d'une espèce
-- donne cette espèce, une seule fois. À exécuter une fois dans le SQL Editor, après 002_adjustments.sql.
-- Ne modifie aucune partie existante. Le jeu l'applique lui-même, comme les autres corrections.
begin;
alter table public.prairie_adjustments add column species text check (species is null or species ~ '^[a-z][a-z-]{0,39}$');
alter table public.prairie_adjustments drop constraint prairie_adjustments_kind_check;
alter table public.prairie_adjustments add constraint prairie_adjustments_kind_check
 check (kind in ('set_pattes', 'add_pattes', 'add_hearts', 'add_grass', 'plan_birth'));
alter table public.prairie_adjustments add constraint prairie_adjustments_planned_species check ((kind = 'plan_birth') = (species is not null));

-- Exemple : select prairie_private.plan_birth('joueur@example.com', 'dadi');
create function prairie_private.plan_birth(p_email text, p_species text, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid; new_id uuid;
begin
 select id into uid from auth.users where lower(email) = lower(p_email);
 if uid is null then raise exception 'Adresse inconnue'; end if;
 insert into public.prairie_adjustments (owner_id, kind, amount, species, note) values (uid, 'plan_birth', 0, p_species, p_note)
 returning id into new_id;
 return new_id;
end $$;
revoke all on function prairie_private.plan_birth(text, text, text) from public, anon, authenticated;
commit;
