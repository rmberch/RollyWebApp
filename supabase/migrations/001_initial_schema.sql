-- =====================================
-- ROLLY - Initial Schema

-- Enable UUID Generation
create extension if not exists "pgcrypto";

-- 1. households ------------------------
create table public.households (
    id                  uuid primary key default gen_random_uuid(),
    name                text not null,
    invite_code         text unique not null default substring(md5(random()::text), 1, 8),
    created_at          timestamptz not null default now()
);

-- 2. profiles --------------------------
create table public.profiles (
    id                  uuid primary key references auth.users(id) on delete cascade,
    household_id        uuid references public.households(id) on delete set null,
    display_name        text,
    created_at          timestamptz not null default now()
);

-- 3. accounts -------------------------
create table public.accounts (
    id                  uuid primary key default gen_random_uuid(),
    household_id        uuid not null references public.households(id) on delete cascade,
    name                text not null,
    type                text not null check (type in ('checking','savings','credit','loan')),
    current_balance     numeric(12,2) not null default 0,
    initial_balance     numeric(12,2),
    has_payment_due     boolean not null default false,
    payment_due_date    date,
    payment_amount      numeric(12,2),
    is_primary          boolean not null default false,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- Only one primary account per household
create unique index one_primary_per_household
    on public.accounts (household_id)
    where (is_primary = true);

-- 4. budget_settings
create table public.budget_settings (
    household_id        uuid primary key references public.households(id) on delete cascade,
    spending_limit      numeric(12,2) not null default 300,
    updated_at          timestamptz not null default now()
);

-- 5. expense_periods
create table public.expense_periods (
    id                  uuid primary key default gen_random_uuid(),
    household_id        uuid not null references public.households(id) on delete cascade,
    year                integer not null,
    month               integer not null check (month between 1 and 12),
    status              text not null default 'active' check (status in ('active','closed')),
    spending_limit      numeric(12,2),
    closed_at           timestamptz,
    created_at          timestamptz not null default now(),
    unique (household_id, year, month)
);

-- 6. expenses
create table public.expenses (
    id                  uuid primary key default gen_random_uuid(),
    household_id        uuid not null references public.households(id) on delete cascade,
    period_id           uuid references public.expense_periods(id) on delete set null,
    name                text not null,
    amount              numeric(12,2) not null,
    account_id          uuid references public.accounts(id) on delete set null,
    date                date not null default current_date,
    is_tracked          boolean not null default true,
    source              text not null default 'manual'
                            check (source in ('manual','recurring','payment')),
    created_at          timestamptz not null default now()
);

-- 7. recurring_expenses
create table public.recurring_expenses (
    id                  uuid primary key default gen_random_uuid(),
    household_id        uuid not null references public.households(id) on delete cascade,
    name                text not null,
    amount              numeric(12,2) not null,
    amount_varies       boolean not null default false,
    account_id          uuid references public.accounts(id) on delete set null,
    type                text not null check (type in ('bill','subscription')),
    frequency           text not null check (frequency in (
                            'daily','weekly','biWeekly','semiMonthly',
                            'monthly','quarterly','semiAnnually','yearly')),
    next_due_date       date not null,
    is_active           boolean not null default true,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- 8. scheduled_payments
create table public.scheduled_payments (
    id                  uuid primary key default gen_random_uuid(),
    household_id        uuid not null references public.households(id) on delete cascade,
    amount              numeric(12,2) not null,
    source_account_id   uuid references public.accounts(id) on delete set null,
    dest_account_id     uuid references public.accounts(id) on delete set null,
    scheduled_date      date not null,
    status              text not null default 'pending'
                            check (status in ('pending','processed','cancelled')),
    created_at          timestamptz not null default now()
);

-- ── Auto-update updated_at on accounts ─────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger accounts_updated_at
    before update on public.accounts
    for each row execute function public.set_updated_at();

create trigger recurring_updated_at
    before update on public.recurring_expenses
    for each row execute function public.set_updated_at();

-- ── Auto-create profile row on user signup ──────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
    insert into public.profiles (id, display_name)
    values (new.id, new.raw_user_meta_data->>'display_name');
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
