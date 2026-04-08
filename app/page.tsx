import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasEnvVars } from "@/lib/utils";
import { getAuthenticatedAppContext } from "@/lib/app-context";
import { formatCurrency, type AccountRow } from "@/lib/rolly";
import { connection } from "next/server";
import { Suspense } from "react";

function formatCount(value: number | null) {
  return Intl.NumberFormat("en-US").format(value ?? 0);
}

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
    { count: accountsCount },
    { count: recurringCount },
    { count: pendingPaymentsCount },
    { data: primaryAccountData },
  ] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("recurring_expenses")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("scheduled_payments")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("accounts")
        .select(
          "id, name, type, current_balance, initial_balance, has_payment_due, payment_due_date, payment_amount, is_primary",
        )
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle(),
    ]);

  const primaryAccount = primaryAccountData as AccountRow | null;

  return (
    <AppShell
      currentPath="/"
      householdName={household.name}
      subtitle={`${profile.display_name ? `Welcome back, ${profile.display_name}.` : "Welcome back."} The household foundation is live, and the accounts slice is now underway.`}
    >
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
            <CardHeader>
              <CardDescription className="font-medium text-slate-700">
                Accounts
              </CardDescription>
              <CardTitle className="text-4xl text-slate-950">
                {formatCount(accountsCount)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-slate-800">
              The shared accounts list is now the active Phase 3 build target.
            </CardContent>
          </Card>
          <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
            <CardHeader>
              <CardDescription className="font-medium text-slate-700">
                Recurring Items
              </CardDescription>
              <CardTitle className="text-4xl text-slate-950">
                {formatCount(recurringCount)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-slate-800">
              This will drive the recurring expense migration from Swift.
            </CardContent>
          </Card>
          <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
            <CardHeader>
              <CardDescription className="font-medium text-slate-700">
                Pending Payments
              </CardDescription>
              <CardTitle className="text-4xl text-slate-950">
                {formatCount(pendingPaymentsCount)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-slate-800">
              Scheduled payments will later be processed by server-side jobs.
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr,0.9fr]">
          <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
            <CardHeader>
              <CardTitle className="text-slate-950">Home snapshot</CardTitle>
              <CardDescription className="text-slate-700">
                The home dashboard now reflects the next app slice instead of
                template copy.
              </CardDescription>
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
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    This will become the main balance card from the iOS home
                    view as we keep building out the dashboard.
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

              <div className="rounded-2xl bg-slate-50 p-4">
                Next up after this accounts foundation: account detail, payment
                due state, and then the expense flows that sit on top of those
                accounts.
              </div>
            </CardContent>
          </Card>

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
