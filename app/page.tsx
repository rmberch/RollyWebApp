import { AppShell } from "@/components/app-shell";
import { PaydayPromptCard } from "@/components/payday-prompt-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasEnvVars } from "@/lib/utils";
import { getAuthenticatedAppContext } from "@/lib/app-context";
import {
  formatCurrency,
  formatDate,
  getAppDateString,
  type AccountRow,
} from "@/lib/rolly";
import { connection } from "next/server";
import { Suspense } from "react";

async function DashboardContent() {
  await connection();

  if (!hasEnvVars) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-300">
            Rolly
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Add your Supabase environment variables to continue.
          </h1>
          <p className="max-w-2xl text-base text-slate-300">
            The app foundation is wired up, but authentication and data access
            are disabled until `NEXT_PUBLIC_SUPABASE_URL` and
            `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are available.
          </p>
        </div>
      </main>
    );
  }

  const { household, profile, supabase } = await getAuthenticatedAppContext();

  const [
    { data: primaryAccountData },
    { data: paydayAccountsData },
    { data: upcomingPaymentsData },
    { data: upcomingRecurringData },
    { data: accountNamesData },
  ] =
    await Promise.all([
      supabase
        .from("accounts")
        .select(
          "id, name, type, current_balance, initial_balance, has_payment_due, payment_due_date, payment_amount, is_primary",
        )
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("accounts")
        .select("id, name")
        .in("type", ["checking", "savings"])
        .order("name"),
      supabase
        .from("scheduled_payments")
        .select("id, amount, scheduled_date, source_account_id, dest_account_id")
        .eq("status", "pending")
        .gte("scheduled_date", getAppDateString())
        .lte(
          "scheduled_date",
          getAppDateString(
            new Date(new Date(`${getAppDateString()}T00:00:00`).getTime() + 6 * 86400000),
          ),
        )
        .order("scheduled_date")
        .limit(4),
      supabase
        .from("recurring_expenses")
        .select("id, name, amount, type, next_due_date, account_id")
        .eq("is_active", true)
        .gte("next_due_date", getAppDateString())
        .lte(
          "next_due_date",
          getAppDateString(
            new Date(new Date(`${getAppDateString()}T00:00:00`).getTime() + 6 * 86400000),
          ),
        )
        .order("next_due_date")
        .limit(4),
      supabase
        .from("accounts")
        .select("id, name")
        .order("name"),
    ]);

  const primaryAccount = primaryAccountData as AccountRow | null;
  const paydayAccounts =
    paydayAccountsData?.map((account) => ({
      id: account.id,
      name: account.name,
    })) ?? [];
  const accountNameById = new Map(
    (accountNamesData ?? []).map((account) => [account.id, account.name]),
  );
  const upcomingPayments =
    upcomingPaymentsData?.map((payment) => ({
      id: payment.id,
      item_type: "payment" as const,
      amount: payment.amount,
      due_date: payment.scheduled_date,
      title: payment.dest_account_id
        ? accountNameById.get(payment.dest_account_id) ?? "[Deleted Account]"
        : "[Deleted Account]",
      detail: `From ${
        payment.source_account_id
          ? accountNameById.get(payment.source_account_id) ?? "[Deleted Account]"
          : "[Deleted Account]"
      }`,
    })) ?? [];
  const upcomingRecurring =
    upcomingRecurringData?.map((item) => ({
      id: item.id,
      item_type: "recurring" as const,
      amount: item.amount,
      due_date: item.next_due_date,
      title: item.name,
      detail: `${item.type === "bill" ? "Bill" : "Subscription"} · ${
        item.account_id
          ? accountNameById.get(item.account_id) ?? "[Deleted Account]"
          : "[Deleted Account]"
      }`,
    })) ?? [];
  const upcomingItems = [...upcomingPayments, ...upcomingRecurring]
    .sort((left, right) => left.due_date.localeCompare(right.due_date))
    .slice(0, 6);
  const paydayIsDue =
    !!profile.next_payday &&
    profile.next_payday <= getAppDateString();

  return (
    <AppShell
      currentPath="/"
      householdName={household.name}
      subtitle={profile.display_name ? `Welcome back, ${profile.display_name}.` : "Welcome back."}
    >
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {paydayIsDue && paydayAccounts.length > 0 ? (
              <PaydayPromptCard
                nextPayday={profile.next_payday!}
                depositAccounts={paydayAccounts}
                defaultPaydayAccountId={profile.default_payday_account_id}
              />
            ) : null}

            <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
              <CardHeader>
                <CardTitle className="text-slate-950">Home snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-800">
                {primaryAccount ? (
                  <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-800">
                      Primary account
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                      {primaryAccount.name}
                    </h2>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {formatCurrency(primaryAccount.current_balance)}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5">
                    <p className="text-sm leading-6 text-slate-800">
                      No primary account yet. Add one from the Accounts tab and
                      it will show up here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
            <CardHeader>
              <CardTitle className="text-slate-950">Upcoming items</CardTitle>
              <CardDescription className="text-slate-700">
                Scheduled payments and recurring charges due in the next 7 days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
                  No upcoming scheduled payments or recurring charges in the next week.
                </div>
              ) : (
                upcomingItems.map((item) => (
                  <div
                    key={`${item.item_type}-${item.id}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-950">{item.title}</p>
                      <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                        {item.item_type === "payment" ? "Scheduled payment" : "Recurring"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      {formatCurrency(item.amount)} · {item.detail}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Due {formatDate(item.due_date)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-white/70 bg-slate-950 text-white shadow-lg shadow-sky-100">
            <CardHeader>
              <CardTitle className="text-white">Household details</CardTitle>
              <CardDescription className="text-slate-300">
                Use this invite code when you connect the second user.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-300">
                  Invite code
                </p>
                <p className="mt-2 font-mono text-3xl font-semibold uppercase tracking-[0.12em]">
                  {household?.invite_code ?? "pending"}
                </p>
              </div>
              <p className="text-sm text-slate-300">
                Share this code with the second member of your household when
                you&apos;re ready to connect them.
              </p>
            </CardContent>
          </Card>
        </section>
    </AppShell>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#edf3fb_100%)] px-6 py-8 text-slate-950">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-xl shadow-sky-100">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-700">
                Rolly
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Loading your dashboard...
              </h1>
            </div>
          </div>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
