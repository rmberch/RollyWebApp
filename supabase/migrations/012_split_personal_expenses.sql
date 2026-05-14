-- ============================================================
-- ROLLY - Split personal expenses
-- Run after 001-011 and rls_policy.sql
-- ============================================================

create table if not exists public.expense_personal_allocations (
    id                  uuid primary key default gen_random_uuid(),
    expense_id          uuid not null references public.expenses(id) on delete cascade,
    profile_id          uuid not null references public.profiles(id) on delete cascade,
    amount              numeric(12,2) not null check (amount >= 0),
    created_at          timestamptz not null default now(),
    unique (expense_id, profile_id)
);

create index if not exists expense_personal_allocations_expense_id_idx
    on public.expense_personal_allocations (expense_id);

create index if not exists expense_personal_allocations_profile_id_idx
    on public.expense_personal_allocations (profile_id);

insert into public.expense_personal_allocations (
    expense_id,
    profile_id,
    amount
)
select
    expenses.id,
    expenses.personal_profile_id,
    expenses.amount
from public.expenses
where expenses.personal_profile_id is not null
on conflict (expense_id, profile_id) do update
set amount = excluded.amount;

alter table public.expense_personal_allocations enable row level security;

create policy "expense_personal_allocations: household members can read"
    on public.expense_personal_allocations for select
    using (
        exists (
            select 1
            from public.expenses
            where expenses.id = expense_personal_allocations.expense_id
              and expenses.household_id = public.my_household_id()
        )
    );

grant select, insert, update, delete on table public.expense_personal_allocations to authenticated;

drop function if exists public.add_expense_for_current_user(text, numeric, uuid, date, boolean);
drop function if exists public.add_expense_for_current_user(text, numeric, uuid, date, boolean, uuid);
drop function if exists public.update_expense_for_current_user(uuid, text, numeric, uuid, date, boolean);
drop function if exists public.update_expense_for_current_user(uuid, text, numeric, uuid, date, boolean, uuid);

create or replace function public.add_expense_for_current_user(
    expense_name text,
    expense_amount numeric,
    expense_account_id uuid,
    expense_date date,
    expense_is_tracked boolean default true,
    expense_personal_profile_id uuid default null,
    expense_personal_profile_ids jsonb default null
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
    active_period public.expense_periods;
    new_expense public.expenses;
    personal_spending_enabled boolean := false;
    selected_profile_count integer := 0;
    selected_profile_ids jsonb;
    total_cents integer;
begin
    select household_id
    into current_household_id
    from public.profiles
    where id = auth.uid();

    if auth.uid() is null or current_household_id is null then
        raise exception 'Not authenticated';
    end if;

    if expense_name is null or btrim(expense_name) = '' then
        raise exception 'Expense name is required';
    end if;

    if expense_amount is null or expense_amount <= 0 then
        raise exception 'Expense amount must be greater than zero';
    end if;

    selected_profile_ids := coalesce(
        expense_personal_profile_ids,
        case
            when expense_personal_profile_id is null then '[]'::jsonb
            else jsonb_build_array(expense_personal_profile_id)
        end
    );

    with selected_profiles as (
        select distinct on (nullif(value, '')::uuid)
            nullif(value, '')::uuid as profile_id
        from jsonb_array_elements_text(selected_profile_ids)
        where nullif(value, '') is not null
        order by nullif(value, '')::uuid
    )
    select count(*)
    into selected_profile_count
    from selected_profiles;

    if selected_profile_count > 0 then
        if coalesce(expense_is_tracked, true) = false then
            raise exception 'Bills cannot be assigned to personal spending';
        end if;

        select coalesce(budget_settings.personal_spending_enabled, false)
        into personal_spending_enabled
        from public.budget_settings
        where household_id = current_household_id;

        if not personal_spending_enabled then
            raise exception 'Personal spending is not enabled for this household';
        end if;

        if exists (
            with selected_profiles as (
                select distinct on (nullif(value, '')::uuid)
                    nullif(value, '')::uuid as profile_id
                from jsonb_array_elements_text(selected_profile_ids)
                where nullif(value, '') is not null
                order by nullif(value, '')::uuid
            )
            select 1
            from selected_profiles
            where not exists (
                select 1
                from public.profiles
                where profiles.id = selected_profiles.profile_id
                  and profiles.household_id = current_household_id
            )
        ) then
            raise exception 'Selected household member was not found';
        end if;
    end if;

    active_period := public.ensure_current_expense_period(
        current_household_id,
        coalesce(expense_date, current_date)
    );

    insert into public.expenses (
        household_id,
        period_id,
        name,
        amount,
        account_id,
        date,
        is_tracked,
        source,
        personal_profile_id
    )
    values (
        current_household_id,
        active_period.id,
        btrim(expense_name),
        round(expense_amount, 2),
        expense_account_id,
        coalesce(expense_date, current_date),
        coalesce(expense_is_tracked, true),
        'manual',
        case
            when selected_profile_count = 1 then (
                select nullif(value, '')::uuid
                from jsonb_array_elements_text(selected_profile_ids)
                where nullif(value, '') is not null
                limit 1
            )
            else null
        end
    )
    returning * into new_expense;

    if selected_profile_count > 0 then
        total_cents := round(new_expense.amount * 100)::integer;

        insert into public.expense_personal_allocations (
            expense_id,
            profile_id,
            amount
        )
        with selected_profiles as (
            select distinct on (nullif(value, '')::uuid)
                nullif(value, '')::uuid as profile_id,
                ordinality
            from jsonb_array_elements_text(selected_profile_ids) with ordinality
            where nullif(value, '') is not null
            order by nullif(value, '')::uuid, ordinality
        ),
        ordered_profiles as (
            select
                profile_id,
                row_number() over (order by ordinality, profile_id) as split_index
            from selected_profiles
        )
        select
            new_expense.id,
            profile_id,
            (
                (
                    floor(total_cents / selected_profile_count)
                    + case
                        when split_index <= mod(total_cents, selected_profile_count)
                        then 1
                        else 0
                      end
                )::numeric / 100
            )::numeric(12,2)
        from ordered_profiles;
    end if;

    perform public.apply_expense_balance_change(
        expense_account_id,
        new_expense.amount,
        false
    );

    return new_expense;
end;
$$;

create or replace function public.update_expense_for_current_user(
    target_expense_id uuid,
    expense_name text,
    expense_amount numeric,
    expense_account_id uuid,
    expense_date date,
    expense_is_tracked boolean default true,
    expense_personal_profile_id uuid default null,
    expense_personal_profile_ids jsonb default null
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
    existing_expense public.expenses;
    updated_expense public.expenses;
    active_period public.expense_periods;
    personal_spending_enabled boolean := false;
    selected_profile_count integer := 0;
    selected_profile_ids jsonb;
    total_cents integer;
begin
    select household_id
    into current_household_id
    from public.profiles
    where id = auth.uid();

    if auth.uid() is null or current_household_id is null then
        raise exception 'Not authenticated';
    end if;

    select *
    into existing_expense
    from public.expenses
    where id = target_expense_id
      and household_id = current_household_id
    limit 1;

    if existing_expense.id is null then
        raise exception 'Expense not found';
    end if;

    if expense_name is null or btrim(expense_name) = '' then
        raise exception 'Expense name is required';
    end if;

    if expense_amount is null or expense_amount <= 0 then
        raise exception 'Expense amount must be greater than zero';
    end if;

    selected_profile_ids := coalesce(
        expense_personal_profile_ids,
        case
            when expense_personal_profile_id is null then '[]'::jsonb
            else jsonb_build_array(expense_personal_profile_id)
        end
    );

    with selected_profiles as (
        select distinct on (nullif(value, '')::uuid)
            nullif(value, '')::uuid as profile_id
        from jsonb_array_elements_text(selected_profile_ids)
        where nullif(value, '') is not null
        order by nullif(value, '')::uuid
    )
    select count(*)
    into selected_profile_count
    from selected_profiles;

    if selected_profile_count > 0 then
        if coalesce(expense_is_tracked, true) = false then
            raise exception 'Bills cannot be assigned to personal spending';
        end if;

        select coalesce(budget_settings.personal_spending_enabled, false)
        into personal_spending_enabled
        from public.budget_settings
        where household_id = current_household_id;

        if not personal_spending_enabled then
            raise exception 'Personal spending is not enabled for this household';
        end if;

        if exists (
            with selected_profiles as (
                select distinct on (nullif(value, '')::uuid)
                    nullif(value, '')::uuid as profile_id
                from jsonb_array_elements_text(selected_profile_ids)
                where nullif(value, '') is not null
                order by nullif(value, '')::uuid
            )
            select 1
            from selected_profiles
            where not exists (
                select 1
                from public.profiles
                where profiles.id = selected_profiles.profile_id
                  and profiles.household_id = current_household_id
            )
        ) then
            raise exception 'Selected household member was not found';
        end if;
    end if;

    perform public.apply_expense_balance_change(
        existing_expense.account_id,
        existing_expense.amount,
        true
    );

    active_period := public.ensure_current_expense_period(
        current_household_id,
        coalesce(expense_date, existing_expense.date)
    );

    update public.expenses
    set period_id = active_period.id,
        name = btrim(expense_name),
        amount = round(expense_amount, 2),
        account_id = expense_account_id,
        date = coalesce(expense_date, existing_expense.date),
        is_tracked = coalesce(expense_is_tracked, true),
        personal_profile_id = case
            when selected_profile_count = 1 then (
                select nullif(value, '')::uuid
                from jsonb_array_elements_text(selected_profile_ids)
                where nullif(value, '') is not null
                limit 1
            )
            else null
        end
    where id = existing_expense.id
    returning * into updated_expense;

    delete from public.expense_personal_allocations
    where expense_id = existing_expense.id;

    if selected_profile_count > 0 then
        total_cents := round(updated_expense.amount * 100)::integer;

        insert into public.expense_personal_allocations (
            expense_id,
            profile_id,
            amount
        )
        with selected_profiles as (
            select distinct on (nullif(value, '')::uuid)
                nullif(value, '')::uuid as profile_id,
                ordinality
            from jsonb_array_elements_text(selected_profile_ids) with ordinality
            where nullif(value, '') is not null
            order by nullif(value, '')::uuid, ordinality
        ),
        ordered_profiles as (
            select
                profile_id,
                row_number() over (order by ordinality, profile_id) as split_index
            from selected_profiles
        )
        select
            updated_expense.id,
            profile_id,
            (
                (
                    floor(total_cents / selected_profile_count)
                    + case
                        when split_index <= mod(total_cents, selected_profile_count)
                        then 1
                        else 0
                      end
                )::numeric / 100
            )::numeric(12,2)
        from ordered_profiles;
    end if;

    perform public.apply_expense_balance_change(
        expense_account_id,
        updated_expense.amount,
        false
    );

    return updated_expense;
end;
$$;

grant execute on function public.add_expense_for_current_user(text, numeric, uuid, date, boolean, uuid, jsonb) to authenticated;
grant execute on function public.update_expense_for_current_user(uuid, text, numeric, uuid, date, boolean, uuid, jsonb) to authenticated;
