-- ============================================================
-- ROLLY - Personal spending settings and expense assignment
-- Run after 001-009 and rls_policy.sql
-- ============================================================

alter table public.budget_settings
add column if not exists personal_spending_enabled boolean not null default false;

alter table public.profiles
add column if not exists discretionary_spending_limit numeric(12,2) not null default 0;

alter table public.expenses
add column if not exists personal_profile_id uuid references public.profiles(id) on delete set null;

create index if not exists expenses_personal_profile_id_idx
    on public.expenses (personal_profile_id);

create or replace function public.update_personal_spending_settings_for_current_user(
    personal_enabled boolean,
    member_limits jsonb default '[]'::jsonb
)
returns public.budget_settings
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
    updated_settings public.budget_settings;
    member_record jsonb;
    member_id uuid;
    member_limit numeric(12,2);
begin
    select household_id
    into current_household_id
    from public.profiles
    where id = auth.uid();

    if auth.uid() is null or current_household_id is null then
        raise exception 'Not authenticated';
    end if;

    insert into public.budget_settings (
        household_id,
        personal_spending_enabled
    )
    values (
        current_household_id,
        coalesce(personal_enabled, false)
    )
    on conflict (household_id) do update
    set personal_spending_enabled = excluded.personal_spending_enabled,
        updated_at = now()
    returning * into updated_settings;

    if member_limits is not null then
        for member_record in
            select value
            from jsonb_array_elements(member_limits)
        loop
            member_id := nullif(member_record->>'member_id', '')::uuid;
            member_limit := coalesce((member_record->>'discretionary_spending_limit')::numeric, 0);

            if member_id is null then
                continue;
            end if;

            if member_limit < 0 then
                raise exception 'Personal spending amounts must be zero or greater';
            end if;

            if not exists (
                select 1
                from public.profiles
                where id = member_id
                  and household_id = current_household_id
            ) then
                raise exception 'Selected household member was not found';
            end if;

            update public.profiles
            set discretionary_spending_limit = round(member_limit, 2)
            where id = member_id;
        end loop;
    end if;

    return updated_settings;
end;
$$;

create or replace function public.add_expense_for_current_user(
    expense_name text,
    expense_amount numeric,
    expense_account_id uuid,
    expense_date date,
    expense_is_tracked boolean default true,
    expense_personal_profile_id uuid default null
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

    if expense_personal_profile_id is not null then
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

        if not exists (
            select 1
            from public.profiles
            where id = expense_personal_profile_id
              and household_id = current_household_id
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
        expense_amount,
        expense_account_id,
        coalesce(expense_date, current_date),
        coalesce(expense_is_tracked, true),
        'manual',
        expense_personal_profile_id
    )
    returning * into new_expense;

    perform public.apply_expense_balance_change(
        expense_account_id,
        expense_amount,
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
    expense_personal_profile_id uuid default null
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

    if expense_personal_profile_id is not null then
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

        if not exists (
            select 1
            from public.profiles
            where id = expense_personal_profile_id
              and household_id = current_household_id
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
        amount = expense_amount,
        account_id = expense_account_id,
        date = coalesce(expense_date, existing_expense.date),
        is_tracked = coalesce(expense_is_tracked, true),
        personal_profile_id = expense_personal_profile_id
    where id = existing_expense.id
    returning * into updated_expense;

    perform public.apply_expense_balance_change(
        expense_account_id,
        expense_amount,
        false
    );

    return updated_expense;
end;
$$;

grant execute on function public.update_personal_spending_settings_for_current_user(boolean, jsonb) to authenticated;
grant execute on function public.add_expense_for_current_user(text, numeric, uuid, date, boolean, uuid) to authenticated;
grant execute on function public.update_expense_for_current_user(uuid, text, numeric, uuid, date, boolean, uuid) to authenticated;
