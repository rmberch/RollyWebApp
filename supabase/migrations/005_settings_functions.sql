-- ============================================================
-- ROLLY - Settings RPCs
-- Run after 001, 002, 003, 004, and rls_policy.sql
-- ============================================================

create or replace function public.update_spending_limit_for_current_user(
    new_spending_limit numeric
)
returns public.expense_periods
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
    current_period public.expense_periods;
begin
    select household_id
    into current_household_id
    from public.profiles
    where id = auth.uid();

    if auth.uid() is null or current_household_id is null then
        raise exception 'Not authenticated';
    end if;

    if new_spending_limit is null or new_spending_limit < 0 then
        raise exception 'Spending limit must be zero or greater';
    end if;

    insert into public.budget_settings (
        household_id,
        spending_limit
    )
    values (
        current_household_id,
        new_spending_limit
    )
    on conflict (household_id) do update
    set spending_limit = excluded.spending_limit,
        updated_at = now();

    current_period := public.ensure_current_expense_period(
        current_household_id,
        current_date
    );

    update public.expense_periods
    set spending_limit = new_spending_limit
    where id = current_period.id
    returning * into current_period;

    return current_period;
end;
$$;

create or replace function public.get_household_profiles_for_current_user()
returns table (
    id uuid,
    display_name text,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
begin
    select household_id
    into current_household_id
    from public.profiles
    where id = auth.uid();

    if auth.uid() is null or current_household_id is null then
        raise exception 'Not authenticated';
    end if;

    return query
    select
        profiles.id,
        profiles.display_name,
        profiles.created_at
    from public.profiles
    where profiles.household_id = current_household_id
    order by profiles.created_at asc;
end;
$$;

grant execute on function public.update_spending_limit_for_current_user(numeric) to authenticated;
grant execute on function public.get_household_profiles_for_current_user() to authenticated;
