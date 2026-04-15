-- ============================================================
-- ROLLY - Recurring Visibility Fix
-- Run after 001 through 008 and rls_policy.sql
-- ============================================================

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
    effective_today date := public.current_app_date();
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
          and next_due_date <= effective_today
        order by next_due_date asc, created_at asc
    loop
        target_period := public.ensure_current_expense_period(
            current_household_id,
            effective_today
        );

        if not exists (
            select 1
            from public.expenses
            where household_id = current_household_id
              and source = 'recurring'
              and account_id = recurring_item.account_id
              and name = recurring_item.name
              and date = effective_today
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
                effective_today,
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

grant execute on function public.process_due_recurring_expenses_for_current_user() to authenticated;
