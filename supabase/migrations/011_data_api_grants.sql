-- ============================================================
-- ROLLY - Explicit Data API grants
-- Run after 001-010 and rls_policy.sql
--
-- Supabase no longer exposes new public tables to the Data API by
-- default. Keep these grants explicit so PostgREST, GraphQL, and
-- supabase-js can reach the tables before RLS policies are evaluated.
-- ============================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.households to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.accounts to authenticated;
grant select, insert, update, delete on table public.budget_settings to authenticated;
grant select, insert, update, delete on table public.expense_periods to authenticated;
grant select, insert, update, delete on table public.expenses to authenticated;
grant select, insert, update, delete on table public.recurring_expenses to authenticated;
grant select, insert, update, delete on table public.scheduled_payments to authenticated;

-- Safety net for future tables created by this migration role. New table
-- migrations should still add explicit grants beside the table definition.
alter default privileges in schema public
grant select, insert, update, delete on tables to authenticated;
