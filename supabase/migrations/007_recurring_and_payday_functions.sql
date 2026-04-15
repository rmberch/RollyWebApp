-- ============================================================
-- ROLLY - Recurring Expenses and Payday RPCs
-- Run after 001, 002, 003, 004, 005, 006, and rls_policy.sql
-- ============================================================

alter table public.profiles
add column if not exists next_payday date;

alter table public.profiles
add column if not exists payday_frequency text;

alter table public.profiles
add column if not exists default_payday_account_id uuid references public.accounts(id) on delete set null;

alter table public.profiles
drop constraint if exists profiles_payday_frequency_check;

alter table public.profiles
add constraint profiles_payday_frequency_check
check (
    payday_frequency is null
    or payday_frequency in ('weekly','biWeekly','semiMonthly','monthly')
);

create or replace function public.advance_schedule_date(
    current_due_date date,
    schedule_frequency text
)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
    day_of_month integer;
begin
    if current_due_date is null then
        return null;
    end if;

    case schedule_frequency
        when 'daily' then
            return current_due_date + interval '1 day';
        when 'weekly' then
            return current_due_date + interval '7 day';
        when 'biWeekly' then
            return current_due_date + interval '14 day';
        when 'semiMonthly' then
            day_of_month := extract(day from current_due_date);

            if day_of_month <= 15 then
                return make_date(
                    extract(year from current_due_date)::integer,
                    extract(month from current_due_date)::integer,
                    16
                );
            end if;

            return date_trunc('month', current_due_date + interval '1 month')::date;
        when 'monthly' then
            return (current_due_date + interval '1 month')::date;
        when 'quarterly' then
            return (current_due_date + interval '3 month')::date;
        when 'semiAnnually' then
            return (current_due_date + interval '6 month')::date;
        when 'yearly' then
            return (current_due_date + interval '1 year')::date;
        else
            raise exception 'Unsupported frequency %', schedule_frequency;
    end case;
end;
$$;

create or replace function public.add_recurring_expense_for_current_user(
    recurring_name text,
    recurring_amount numeric,
    recurring_amount_varies boolean,
    recurring_account_id uuid,
    recurring_type text,
    recurring_frequency text,
    recurring_next_due_date date
)
returns public.recurring_expenses
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
    target_account public.accounts;
    created_recurring public.recurring_expenses;
begin
    select household_id
    into current_household_id
    from public.profiles
    where id = auth.uid();

    if auth.uid() is null or current_household_id is null then
        raise exception 'Not authenticated';
    end if;

    if recurring_name is null or btrim(recurring_name) = '' then
        raise exception 'Recurring item name is required';
    end if;

    if recurring_amount is null or recurring_amount <= 0 then
        raise exception 'Recurring amount must be greater than zero';
    end if;

    if recurring_type not in ('bill','subscription') then
        raise exception 'Recurring type must be bill or subscription';
    end if;

    if recurring_next_due_date is null then
        raise exception 'Next due date is required';
    end if;

    select *
    into target_account
    from public.accounts
    where id = recurring_account_id
      and household_id = current_household_id
    limit 1;

    if target_account.id is null then
        raise exception 'A valid billing account is required';
    end if;

    if target_account.type = 'loan' then
        raise exception 'Recurring items cannot bill to loan accounts';
    end if;

    insert into public.recurring_expenses (
        household_id,
        name,
        amount,
        amount_varies,
        account_id,
        type,
        frequency,
        next_due_date,
        is_active
    )
    values (
        current_household_id,
        btrim(recurring_name),
        recurring_amount,
        coalesce(recurring_amount_varies, false),
        recurring_account_id,
        recurring_type,
        recurring_frequency,
        recurring_next_due_date,
        true
    )
    returning * into created_recurring;

    return created_recurring;
end;
$$;

create or replace function public.update_recurring_expense_for_current_user(
    target_recurring_id uuid,
    recurring_name text,
    recurring_amount numeric,
    recurring_amount_varies boolean,
    recurring_account_id uuid,
    recurring_type text,
    recurring_frequency text,
    recurring_next_due_date date,
    recurring_is_active boolean default true
)
returns public.recurring_expenses
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
    target_account public.accounts;
    updated_recurring public.recurring_expenses;
begin
    select household_id
    into current_household_id
    from public.profiles
    where id = auth.uid();

    if auth.uid() is null or current_household_id is null then
        raise exception 'Not authenticated';
    end if;

    if recurring_name is null or btrim(recurring_name) = '' then
        raise exception 'Recurring item name is required';
    end if;

    if recurring_amount is null or recurring_amount <= 0 then
        raise exception 'Recurring amount must be greater than zero';
    end if;

    if recurring_type not in ('bill','subscription') then
        raise exception 'Recurring type must be bill or subscription';
    end if;

    if recurring_next_due_date is null then
        raise exception 'Next due date is required';
    end if;

    select *
    into target_account
    from public.accounts
    where id = recurring_account_id
      and household_id = current_household_id
    limit 1;

    if target_account.id is null then
        raise exception 'A valid billing account is required';
    end if;

    if target_account.type = 'loan' then
        raise exception 'Recurring items cannot bill to loan accounts';
    end if;

    update public.recurring_expenses
    set name = btrim(recurring_name),
        amount = recurring_amount,
        amount_varies = coalesce(recurring_amount_varies, false),
        account_id = recurring_account_id,
        type = recurring_type,
        frequency = recurring_frequency,
        next_due_date = recurring_next_due_date,
        is_active = coalesce(recurring_is_active, true)
    where id = target_recurring_id
      and household_id = current_household_id
    returning * into updated_recurring;

    if updated_recurring.id is null then
        raise exception 'Recurring item not found';
    end if;

    return updated_recurring;
end;
$$;

create or replace function public.delete_recurring_expense_for_current_user(
    target_recurring_id uuid
)
returns void
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

    delete from public.recurring_expenses
    where id = target_recurring_id
      and household_id = current_household_id;
end;
$$;

create or replace function public.set_recurring_expense_active_for_current_user(
    target_recurring_id uuid,
    recurring_is_active boolean
)
returns public.recurring_expenses
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
    updated_recurring public.recurring_expenses;
begin
    select household_id
    into current_household_id
    from public.profiles
    where id = auth.uid();

    if auth.uid() is null or current_household_id is null then
        raise exception 'Not authenticated';
    end if;

    update public.recurring_expenses
    set is_active = coalesce(recurring_is_active, false)
    where id = target_recurring_id
      and household_id = current_household_id
    returning * into updated_recurring;

    if updated_recurring.id is null then
        raise exception 'Recurring item not found';
    end if;

    return updated_recurring;
end;
$$;

create or replace function public.process_due_recurring_expenses_for_current_user()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
    recurring_item record;
    target_period public.expense_periods;
    processed_count integer := 0;
begin
    select household_id
    into current_household_id
    from public.profiles
    where id = auth.uid();

    if auth.uid() is null or current_household_id is null then
        return 0;
    end if;

    for recurring_item in
        select *
        from public.recurring_expenses
        where household_id = current_household_id
          and is_active = true
          and amount_varies = false
          and next_due_date <= current_date
        order by next_due_date asc, created_at asc
    loop
        target_period := public.ensure_current_expense_period(
            current_household_id,
            recurring_item.next_due_date
        );

        if not exists (
            select 1
            from public.expenses
            where household_id = current_household_id
              and source = 'recurring'
              and account_id = recurring_item.account_id
              and name = recurring_item.name
              and date = recurring_item.next_due_date
        ) then
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
                target_period.id,
                recurring_item.name,
                recurring_item.amount,
                recurring_item.account_id,
                recurring_item.next_due_date,
                recurring_item.type <> 'bill',
                'recurring'
            );

            perform public.apply_expense_balance_change(
                recurring_item.account_id,
                recurring_item.amount,
                false
            );

            processed_count := processed_count + 1;
        end if;

        update public.recurring_expenses
        set next_due_date = public.advance_schedule_date(
            recurring_item.next_due_date,
            recurring_item.frequency
        )
        where id = recurring_item.id;
    end loop;

    return processed_count;
end;
$$;

create or replace function public.update_payday_settings_for_current_user(
    payday_next_date date,
    payday_schedule text,
    payday_account_id uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
    target_account public.accounts;
    updated_profile public.profiles;
begin
    select household_id
    into current_household_id
    from public.profiles
    where id = auth.uid();

    if auth.uid() is null or current_household_id is null then
        raise exception 'Not authenticated';
    end if;

    if payday_next_date is null then
        raise exception 'Next payday is required';
    end if;

    if payday_schedule not in ('weekly','biWeekly','semiMonthly','monthly') then
        raise exception 'A valid payday frequency is required';
    end if;

    select *
    into target_account
    from public.accounts
    where id = payday_account_id
      and household_id = current_household_id
    limit 1;

    if target_account.id is null or target_account.type not in ('checking','savings') then
        raise exception 'Payday account must be checking or savings';
    end if;

    update public.profiles
    set next_payday = payday_next_date,
        payday_frequency = payday_schedule,
        default_payday_account_id = payday_account_id
    where id = auth.uid()
    returning * into updated_profile;

    return updated_profile;
end;
$$;

create or replace function public.log_payday_for_current_user(
    pay_amount numeric,
    pay_date date default current_date,
    deposit_account_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    current_profile public.profiles;
    selected_account_id uuid;
    contribution_id uuid;
begin
    select *
    into current_profile
    from public.profiles
    where id = auth.uid()
    limit 1;

    if auth.uid() is null or current_profile.household_id is null then
        raise exception 'Not authenticated';
    end if;

    if pay_amount is null or pay_amount <= 0 then
        raise exception 'Pay amount must be greater than zero';
    end if;

    if current_profile.payday_frequency is null or current_profile.next_payday is null then
        raise exception 'Payday settings must be configured first';
    end if;

    selected_account_id := coalesce(deposit_account_id, current_profile.default_payday_account_id);

    if selected_account_id is null then
        raise exception 'A checking or savings deposit account is required';
    end if;

    contribution_id := public.make_account_contribution_for_current_user(
        selected_account_id,
        pay_amount,
        coalesce(pay_date, current_date),
        null,
        'Paycheck'
    );

    update public.profiles
    set next_payday = public.advance_schedule_date(
            current_profile.next_payday,
            current_profile.payday_frequency
        )
    where id = current_profile.id;

    return contribution_id;
end;
$$;

grant execute on function public.advance_schedule_date(date, text) to authenticated;
grant execute on function public.add_recurring_expense_for_current_user(text, numeric, boolean, uuid, text, text, date) to authenticated;
grant execute on function public.update_recurring_expense_for_current_user(uuid, text, numeric, boolean, uuid, text, text, date, boolean) to authenticated;
grant execute on function public.delete_recurring_expense_for_current_user(uuid) to authenticated;
grant execute on function public.set_recurring_expense_active_for_current_user(uuid, boolean) to authenticated;
grant execute on function public.process_due_recurring_expenses_for_current_user() to authenticated;
grant execute on function public.update_payday_settings_for_current_user(date, text, uuid) to authenticated;
grant execute on function public.log_payday_for_current_user(numeric, date, uuid) to authenticated;
