import { updateSpendingLimit } from "@/app/settings/actions";
import { AppShell } from "@/components/app-shell";
import { RecurringSettingsCard } from "@/components/recurring-settings-card";
import { UserSettingsCard } from "@/components/user-settings-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthenticatedAppContext } from "@/lib/app-context";
import {
  formatCurrency,
  formatDate,
  type RecurringExpenseRow,
} from "@/lib/rolly";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

type SearchParams = Promise<{
  error?: string;
  success?: string;
}>;

async function SettingsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();

  const params = await searchParams;
  const { household, profile, supabase, user } = await getAuthenticatedAppContext();

  const [
    { data: budgetSettings },
    { data: activePeriod },
    { data: householdProfiles },
    { count: accountsCount },
    { data: recurringExpenses },
    { data: recurringAccountsData },
    { data: paydayAccountsData },
  ] = await Promise.all([
    supabase
      .from("budget_settings")
      .select("spending_limit")
      .eq("household_id", household.id)
      .maybeSingle(),
    supabase.rpc("ensure_current_expense_period", {
      current_household_id: household.id,
      today: new Date().toISOString().slice(0, 10),
    }),
    supabase
      .from("profiles")
      .select("id, display_name, created_at")
      .eq("household_id", household.id)
      .order("created_at"),
    supabase
      .from("accounts")
      .select("*", { count: "exact", head: true })
      .eq("household_id", household.id),
    supabase
      .from("recurring_expenses")
      .select(
        "id, name, amount, amount_varies, account_id, type, frequency, next_due_date, is_active",
      )
      .eq("household_id", household.id)
      .order("next_due_date")
      .order("created_at"),
    supabase
      .from("accounts")
      .select("id, name, type")
      .in("type", ["checking", "savings", "credit"])
      .order("name"),
    supabase
      .from("accounts")
      .select("id, name")
      .in("type", ["checking", "savings"])
      .order("name"),
  ]);

  const activeRecurringCount =
    recurringExpenses?.filter((expense) => expense.is_active).length ?? 0;
  const pausedRecurringCount =
    recurringExpenses?.filter((expense) => !expense.is_active).length ?? 0;
  const recurringItems = (recurringExpenses ?? []) as RecurringExpenseRow[];
  const recurringAccounts =
    recurringAccountsData?.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
    })) ?? [];
  const paydayAccounts =
    paydayAccountsData?.map((account) => ({
      id: account.id,
      name: account.name,
    })) ?? [];
  const activeSpendingLimit = Number(
    activePeriod?.spending_limit ?? budgetSettings?.spending_limit ?? 0,
  );
  const defaultSpendingLimit = Number(budgetSettings?.spending_limit ?? 0);
  const householdMembers =
    householdProfiles
      ?.map((member) => ({
        id: member.id,
        display_name: member.display_name?.trim() || "Household member",
        created_at: member.created_at,
        isCurrentUser: member.id === user.id,
      }))
      .sort((left, right) => {
        if (left.isCurrentUser === right.isCurrentUser) {
          return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
        }

        return left.isCurrentUser ? -1 : 1;
      }) ?? [];

  return (
    <AppShell
      currentPath="/settings"
      householdName={household.name}
      subtitle={`${profile.display_name ? `${profile.display_name}, ` : ""}manage your household, recurring charges, and personal settings from one place.`}
    >
      {params.error ? (
        <div className="rounded-2xl border border-rose-200 bg-white/90 px-4 py-3 text-sm font-medium text-rose-800 shadow-sm">
          {params.error}
        </div>
      ) : null}
      {params.success ? (
        <div className="rounded-2xl border border-emerald-200 bg-white/90 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm">
          {params.success}
        </div>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2">
        <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
          <CardHeader>
            <CardTitle className="text-slate-950">Spending limit</CardTitle>
            <CardDescription className="text-slate-700">
              Update the household default and the current month together.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Current month
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-950">
                  {activePeriod
                    ? `${activePeriod.month}/${activePeriod.year}`
                    : "Not started"}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Limit: {formatCurrency(activeSpendingLimit)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Household default
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-950">
                  {formatCurrency(defaultSpendingLimit)}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Future periods inherit this limit.
                </p>
              </div>
            </div>

            <form
              action={updateSpendingLimit}
              className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="space-y-2">
                <Label htmlFor="spending_limit" className="text-slate-900">
                  New spending limit
                </Label>
                <Input
                  id="spending_limit"
                  name="spending_limit"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={activeSpendingLimit}
                  className="border-slate-300 bg-white text-slate-950"
                  required
                />
              </div>
              <Button className="w-full bg-slate-950 text-white hover:bg-slate-800">
                Save spending limit
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
          <CardHeader>
            <CardTitle className="text-slate-950">Recurring expenses</CardTitle>
            <CardDescription className="text-slate-700">
              Keep regular bills and subscriptions organized in one place.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Active items
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {activeRecurringCount}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Paused items
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {pausedRecurringCount}
                </p>
              </div>
            </div>
            <RecurringSettingsCard
              recurringExpenses={recurringItems}
              accounts={recurringAccounts}
            />
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
          <CardHeader>
            <CardTitle className="text-slate-950">Household</CardTitle>
            <CardDescription className="text-slate-700">
              Share the invite code and see everyone currently in this
              household.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-800">
                Invite code
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Badge className="border-sky-300 bg-white px-3 py-1 text-base text-sky-950">
                  {household.invite_code}
                </Badge>
                <p className="text-sm text-sky-900">
                  Use this during setup on another account to join the same
                  household.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-950">Members</p>
              {householdMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div>
                    <p className="font-medium text-slate-950">
                      {member.display_name}
                    </p>
                    <p className="text-sm text-slate-700">
                      Joined {formatDate(member.created_at.slice(0, 10))}
                    </p>
                  </div>
                  {member.isCurrentUser ? (
                    <Badge className="border-emerald-300 bg-emerald-100 text-emerald-950">
                      You
                    </Badge>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <UserSettingsCard
          displayName={profile.display_name}
          nextPayday={profile.next_payday}
          paydayFrequency={profile.payday_frequency}
          defaultPaydayAccountId={profile.default_payday_account_id}
          depositAccounts={paydayAccounts}
        />

        <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
          <CardHeader>
            <CardTitle className="text-slate-950">Quick access</CardTitle>
            <CardDescription className="text-slate-700">
              Jump to the places you are most likely to review throughout the
              month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Accounts
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {accountsCount ?? 0}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Members
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {householdMembers.length}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                asChild
                variant="outline"
                className="w-full justify-between border-slate-300 bg-white text-slate-950 hover:bg-slate-100"
              >
                <Link href="/accounts">Open accounts</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-between border-slate-300 bg-white text-slate-950 hover:bg-slate-100"
              >
                <Link href="/expenses">Open expenses</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

      </section>
    </AppShell>
  );
}

export default function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={null}>
      <SettingsContent searchParams={searchParams} />
    </Suspense>
  );
}
