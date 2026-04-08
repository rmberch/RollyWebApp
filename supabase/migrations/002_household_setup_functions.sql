-- ============================================================
-- ROLLY - Household Setup RPCs
-- Run after 001_initial_schema.sql and rls_policy.sql
-- ============================================================

create or replace function public.create_household_for_current_user(
    household_name text
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
    new_household public.households;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    if household_name is null or btrim(household_name) = '' then
        raise exception 'Household name is required';
    end if;

    insert into public.households (name)
    values (btrim(household_name))
    returning * into new_household;

    update public.profiles
    set household_id = new_household.id
    where id = auth.uid();

    insert into public.budget_settings (household_id, spending_limit)
    values (new_household.id, 300)
    on conflict (household_id) do nothing;

    return new_household;
end;
$$;

create or replace function public.join_household_for_current_user(
    household_invite_code text
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
    target_household public.households;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    if household_invite_code is null or btrim(household_invite_code) = '' then
        raise exception 'Invite code is required';
    end if;

    select *
    into target_household
    from public.households
    where invite_code = lower(btrim(household_invite_code))
    limit 1;

    if target_household.id is null then
        raise exception 'Invalid invite code';
    end if;

    update public.profiles
    set household_id = target_household.id
    where id = auth.uid();

    return target_household;
end;
$$;

grant execute on function public.create_household_for_current_user(text) to authenticated;
grant execute on function public.join_household_for_current_user(text) to authenticated;
