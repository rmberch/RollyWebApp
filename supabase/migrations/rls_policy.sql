-- ============================================================
-- ROLLY - Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.budget_settings enable row level security;
alter table public.expense_periods enable row level security;
alter table public.expenses enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.scheduled_payments enable row level security;

-- ── Helper: get the household_id for the current user ──────
-- This function is used inside policies to avoid repetition.
create or replace function public.my_household_id()
returns uuid language sql security definer stable as $$
    select household_id from public.profiles where id = auth.uid()
$$;

-- ── households ─────────────────────────────────────────────
-- Users can only read their own household
create policy "households: members can read"
    on public.households for select
    using (id = public.my_household_id());

-- Any authenticated user can create a household (first-time setup)
create policy "households: auth users can create"
    on public.households for insert
    with check (auth.uid() is not null);

-- Only members can update their household name
create policy "households: members can update"
    on public.households for update
    using (id = public.my_household_id());

-- ── profiles ───────────────────────────────────────────────
create policy "profiles: users can read own"
    on public.profiles for select
    using (id = auth.uid());

create policy "profiles: users can update own"
    on public.profiles for update
    using (id = auth.uid());

-- ── accounts ───────────────────────────────────────────────
create policy "accounts: household members full access"
    on public.accounts for all
    using (household_id = public.my_household_id())
    with check (household_id = public.my_household_id());

-- ── budget_settings ────────────────────────────────────────
create policy "budget_settings: household members full access"
    on public.budget_settings for all
    using (household_id = public.my_household_id())
    with check (household_id = public.my_household_id());

-- ── expense_periods ────────────────────────────────────────
-- Users can read their periods but not manually create/modify them
-- (the CRON job uses service_role which bypasses RLS)
create policy "expense_periods: household members can read"
    on public.expense_periods for select
    using (household_id = public.my_household_id());

-- ── expenses ───────────────────────────────────────────────
create policy "expenses: household members full access"
    on public.expenses for all
    using (household_id = public.my_household_id())
    with check (household_id = public.my_household_id());
-- ── recurring_expenses ─────────────────────────────────────
create policy "recurring_expenses: household members full access"
    on public.recurring_expenses for all
    using (household_id = public.my_household_id())
    with check (household_id = public.my_household_id());

-- ── scheduled_payments ─────────────────────────────────────
create policy "scheduled_payments: household members full access"
    on public.scheduled_payments for all
    using (household_id = public.my_household_id())
    with check (household_id = public.my_household_id());