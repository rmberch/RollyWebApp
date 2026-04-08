-- ============================================================
-- ROLLY - Expense RPCs
-- Run after 001_initial_schema.sql, rls_policy.sql, and 002...
-- ============================================================

create or replace function public.ensure_current_expense_period(
    current_household_id uuid,
    today date default current_date
)
returns public.expense_periods
language plpgsql
security definer
set search_path = public
as $$
declare
    active_period public.expense_periods;
    current_year integer := extract(year from today);
    current_month integer := extract(month from today);
    current_limit numeric(12,2);
begin
    select *
    into active_period
    from public.expense_periods
    where household_id = current_household_id
      and status = 'active'
    order by year desc, month desc
    limit 1;

    if active_period.id is not null
       and active_period.year = current_year
       and active_period.month = current_month then
        return active_period;
    end if;

    if active_period.id is not null then
        update public.expense_periods
        set status = 'closed',
            closed_at = now()
        where id = active_period.id;
    end if;

    select spending_limit
    into current_limit
    from public.budget_settings
    where household_id = current_household_id;

    insert into public.expense_periods (
        household_id,
        year,
        month,
        status,
        spending_limit
    )
    values (
        current_household_id,
        current_year,
        current_month,
        'active',
        current_limit
    )
    on conflict (household_id, year, month) do update
    set status = 'active'
    returning * into active_period;

    return active_period;
end;
$$;

create or replace function public.apply_expense_balance_change(
    target_account_id uuid,
    expense_amount numeric,
    reverse_change boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    target_account public.accounts;
    delta numeric(12,2) := expense_amount;
begin
    if target_account_id is null then
        return;
    end if;

    select *
    into target_account
    from public.accounts
    where id = target_account_id
    limit 1;

    if target_account.id is null then
        return;
    end if;

    if reverse_change then
        delta := -delta;
    end if;

    if target_account.type = 'credit' then
        update public.accounts
        set current_balance = current_balance + delta
        where id = target_account.id;
    else
        update public.accounts
        set current_balance = current_balance - delta
        where id = target_account.id;
    end if;
end;
$$;

create or replace function public.add_expense_for_current_user(
    expense_name text,
    expense_amount numeric,
    expense_account_id uuid,
    expense_date date,
    expense_is_tracked boolean default true
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
        source
    )
    values (
        current_household_id,
        active_period.id,
        btrim(expense_name),
        expense_amount,
        expense_account_id,
        coalesce(expense_date, current_date),
        coalesce(expense_is_tracked, true),
        'manual'
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
    expense_is_tracked boolean default true
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
        is_tracked = coalesce(expense_is_tracked, true)
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

create or replace function public.delete_expense_for_current_user(
    target_expense_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
    existing_expense public.expenses;
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

    perform public.apply_expense_balance_change(
        existing_expense.account_id,
        existing_expense.amount,
        true
    );

    delete from public.expenses
    where id = existing_expense.id;
end;
$$;

grant execute on function public.ensure_current_expense_period(uuid, date) to authenticated;
grant execute on function public.add_expense_for_current_user(text, numeric, uuid, date, boolean) to authenticated;
grant execute on function public.update_expense_for_current_user(uuid, text, numeric, uuid, date, boolean) to authenticated;
grant execute on function public.delete_expense_for_current_user(uuid) to authenticated;
