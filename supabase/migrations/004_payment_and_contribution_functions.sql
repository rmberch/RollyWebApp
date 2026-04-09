-- ============================================================
-- ROLLY - Payment and Contribution RPCs
-- Run after 001, 002, 003, and rls_policy.sql
-- ============================================================

alter table public.expenses
add column if not exists related_account_id uuid references public.accounts(id) on delete set null;

alter table public.expenses
add column if not exists transaction_group_id uuid;

alter table public.expenses
drop constraint if exists expenses_source_check;

alter table public.expenses
add constraint expenses_source_check
check (source in ('manual','recurring','payment','contribution'));

create or replace function public.update_due_status_after_payment(
    target_account_id uuid,
    payment_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    target_account public.accounts;
    remaining_due numeric(12,2);
begin
    if target_account_id is null then
        return;
    end if;

    select *
    into target_account
    from public.accounts
    where id = target_account_id
    limit 1;

    if target_account.id is null or not target_account.has_payment_due then
        return;
    end if;

    remaining_due := greatest(coalesce(target_account.payment_amount, 0) - payment_amount, 0);

    update public.accounts
    set payment_amount = remaining_due,
        has_payment_due = remaining_due > 0,
        payment_due_date = case when remaining_due > 0 then payment_due_date else null end
    where id = target_account.id;
end;
$$;

create or replace function public.create_transfer_expense_row(
    current_household_id uuid,
    target_period_id uuid,
    transaction_name text,
    transaction_amount numeric,
    target_account_id uuid,
    related_account uuid,
    transaction_date date,
    transaction_source text,
    target_group_id uuid
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
    created_expense public.expenses;
begin
    insert into public.expenses (
        household_id,
        period_id,
        name,
        amount,
        account_id,
        related_account_id,
        transaction_group_id,
        date,
        is_tracked,
        source
    )
    values (
        current_household_id,
        target_period_id,
        transaction_name,
        transaction_amount,
        target_account_id,
        related_account,
        target_group_id,
        transaction_date,
        false,
        transaction_source
    )
    returning * into created_expense;

    perform public.apply_expense_balance_change(
        target_account_id,
        transaction_amount,
        false
    );

    return created_expense;
end;
$$;

create or replace function public.make_account_payment_for_current_user(
    dest_account_id uuid,
    source_account_id uuid,
    payment_amount numeric,
    payment_date date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
    payment_period public.expense_periods;
    source_account public.accounts;
    dest_account public.accounts;
    group_id uuid := gen_random_uuid();
    dest_row_amount numeric(12,2);
begin
    select household_id
    into current_household_id
    from public.profiles
    where id = auth.uid();

    if auth.uid() is null or current_household_id is null then
        raise exception 'Not authenticated';
    end if;

    if payment_amount is null or payment_amount <= 0 then
        raise exception 'Payment amount must be greater than zero';
    end if;

    select *
    into source_account
    from public.accounts
    where id = source_account_id
      and household_id = current_household_id
    limit 1;

    if source_account.id is null or source_account.type not in ('checking','savings') then
        raise exception 'A valid checking or savings source account is required';
    end if;

    if source_account.current_balance < payment_amount then
        raise exception 'Payment amount cannot exceed the source account balance';
    end if;

    select *
    into dest_account
    from public.accounts
    where id = dest_account_id
      and household_id = current_household_id
    limit 1;

    if dest_account.id is null or dest_account.type not in ('credit','loan') then
        raise exception 'Payments can only be made to credit or loan accounts';
    end if;

    payment_period := public.ensure_current_expense_period(
        current_household_id,
        coalesce(payment_date, current_date)
    );

    perform public.create_transfer_expense_row(
        current_household_id,
        payment_period.id,
        'Payment to ' || dest_account.name,
        payment_amount,
        source_account.id,
        dest_account.id,
        coalesce(payment_date, current_date),
        'payment',
        group_id
    );

    dest_row_amount := case
        when dest_account.type = 'credit' then -payment_amount
        else payment_amount
    end;

    perform public.create_transfer_expense_row(
        current_household_id,
        payment_period.id,
        'Payment from ' || source_account.name,
        dest_row_amount,
        dest_account.id,
        source_account.id,
        coalesce(payment_date, current_date),
        'payment',
        group_id
    );

    perform public.update_due_status_after_payment(dest_account.id, payment_amount);

    return group_id;
end;
$$;

create or replace function public.make_account_contribution_for_current_user(
    dest_account_id uuid,
    contribution_amount numeric,
    contribution_date date default current_date,
    source_account_id uuid default null,
    contribution_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
    contribution_period public.expense_periods;
    source_account public.accounts;
    dest_account public.accounts;
    group_id uuid := gen_random_uuid();
begin
    select household_id
    into current_household_id
    from public.profiles
    where id = auth.uid();

    if auth.uid() is null or current_household_id is null then
        raise exception 'Not authenticated';
    end if;

    if contribution_amount is null or contribution_amount <= 0 then
        raise exception 'Contribution amount must be greater than zero';
    end if;

    select *
    into dest_account
    from public.accounts
    where id = dest_account_id
      and household_id = current_household_id
    limit 1;

    if dest_account.id is null or dest_account.type not in ('checking','savings') then
        raise exception 'Contributions can only be added to checking or savings accounts';
    end if;

    contribution_period := public.ensure_current_expense_period(
        current_household_id,
        coalesce(contribution_date, current_date)
    );

    if source_account_id is not null then
        select *
        into source_account
        from public.accounts
        where id = source_account_id
          and household_id = current_household_id
        limit 1;

        if source_account.id is null or source_account.type not in ('checking','savings') then
            raise exception 'Contribution source account must be checking or savings';
        end if;

        perform public.create_transfer_expense_row(
            current_household_id,
            contribution_period.id,
            'Contribution to ' || dest_account.name,
            contribution_amount,
            source_account.id,
            dest_account.id,
            coalesce(contribution_date, current_date),
            'contribution',
            group_id
        );

        perform public.create_transfer_expense_row(
            current_household_id,
            contribution_period.id,
            'Contribution from ' || source_account.name,
            -contribution_amount,
            dest_account.id,
            source_account.id,
            coalesce(contribution_date, current_date),
            'contribution',
            group_id
        );
    else
        if contribution_title is null or btrim(contribution_title) = '' then
            raise exception 'A title is required when no source account is provided';
        end if;

        perform public.create_transfer_expense_row(
            current_household_id,
            contribution_period.id,
            btrim(contribution_title),
            -contribution_amount,
            dest_account.id,
            null,
            coalesce(contribution_date, current_date),
            'contribution',
            group_id
        );
    end if;

    return group_id;
end;
$$;

create or replace function public.schedule_payment_for_current_user(
    dest_account_id uuid,
    source_account_id uuid,
    payment_amount numeric,
    scheduled_for date
)
returns public.scheduled_payments
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
    source_account public.accounts;
    dest_account public.accounts;
    created_payment public.scheduled_payments;
begin
    select household_id
    into current_household_id
    from public.profiles
    where id = auth.uid();

    if auth.uid() is null or current_household_id is null then
        raise exception 'Not authenticated';
    end if;

    if payment_amount is null or payment_amount <= 0 then
        raise exception 'Payment amount must be greater than zero';
    end if;

    if scheduled_for is null then
        raise exception 'Scheduled date is required';
    end if;

    select *
    into source_account
    from public.accounts
    where id = source_account_id
      and household_id = current_household_id
    limit 1;

    if source_account.id is null or source_account.type not in ('checking','savings') then
        raise exception 'A valid checking or savings source account is required';
    end if;

    if source_account.current_balance < payment_amount then
        raise exception 'Payment amount cannot exceed the source account balance';
    end if;

    select *
    into dest_account
    from public.accounts
    where id = dest_account_id
      and household_id = current_household_id
    limit 1;

    if dest_account.id is null or dest_account.type not in ('credit','loan') then
        raise exception 'Scheduled payments can only be created for credit or loan accounts';
    end if;

    if dest_account.has_payment_due
       and dest_account.payment_due_date is not null
       and scheduled_for > dest_account.payment_due_date then
        raise exception 'Scheduled payment cannot be after the due date';
    end if;

    insert into public.scheduled_payments (
        household_id,
        amount,
        source_account_id,
        dest_account_id,
        scheduled_date,
        status
    )
    values (
        current_household_id,
        payment_amount,
        source_account.id,
        dest_account.id,
        scheduled_for,
        'pending'
    )
    returning * into created_payment;

    return created_payment;
end;
$$;

create or replace function public.cancel_scheduled_payment_for_current_user(
    target_payment_id uuid
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

    update public.scheduled_payments
    set status = 'cancelled'
    where id = target_payment_id
      and household_id = current_household_id
      and status = 'pending';
end;
$$;

create or replace function public.process_due_scheduled_payments_for_current_user()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    current_household_id uuid;
    scheduled_payment record;
    processed_count integer := 0;
begin
    select household_id
    into current_household_id
    from public.profiles
    where id = auth.uid();

    if auth.uid() is null or current_household_id is null then
        return 0;
    end if;

    for scheduled_payment in
        select *
        from public.scheduled_payments
        where household_id = current_household_id
          and status = 'pending'
          and scheduled_date <= current_date
        order by scheduled_date asc, created_at asc
    loop
        perform public.make_account_payment_for_current_user(
            scheduled_payment.dest_account_id,
            scheduled_payment.source_account_id,
            scheduled_payment.amount,
            scheduled_payment.scheduled_date
        );

        update public.scheduled_payments
        set status = 'processed'
        where id = scheduled_payment.id;

        processed_count := processed_count + 1;
    end loop;

    return processed_count;
end;
$$;

grant execute on function public.make_account_payment_for_current_user(uuid, uuid, numeric, date) to authenticated;
grant execute on function public.make_account_contribution_for_current_user(uuid, numeric, date, uuid, text) to authenticated;
grant execute on function public.schedule_payment_for_current_user(uuid, uuid, numeric, date) to authenticated;
grant execute on function public.cancel_scheduled_payment_for_current_user(uuid) to authenticated;
grant execute on function public.process_due_scheduled_payments_for_current_user() to authenticated;
