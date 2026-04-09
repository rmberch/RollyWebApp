-- ============================================================
-- ROLLY - Profile Read Policy Adjustment
-- Run after 001 and rls_policy.sql
-- ============================================================

drop policy if exists "profiles: users can read own"
    on public.profiles;

create policy "profiles: household members can read"
    on public.profiles for select
    using (
        id = auth.uid()
        or household_id = public.my_household_id()
    );
