import { AuthButton } from "@/components/auth-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, household_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.household_id) {
    redirect("/setup");
  }

  const [{ data: household }, { count: accountsCount }, { count: recurringCount }, { count: pendingPaymentsCount }] =
    await Promise.all([
      supabase
        .from("households")
        .select("name, invite_code")
        .eq("id", profile.household_id)
        .maybeSingle(),
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
    ]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,122,255,0.18),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#edf3fb_100%)] px-6 py-8 text-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-xl shadow-sky-100 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-700">
              Rolly
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {household?.name ?? "Your household"}
            </h1>
            <p className="text-sm text-slate-600">
              {profile.display_name
                ? `Welcome back, ${profile.display_name}.`
                : "Welcome back."}{" "}
              Phase 1 is now routing through a real auth and household setup
              flow.
            </p>
          </div>
          <AuthButton />
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-white/70 bg-white/90 shadow-lg shadow-sky-100">
            <CardHeader>
              <CardDescription>Accounts</CardDescription>
              <CardTitle className="text-4xl">
                {formatCount(accountsCount)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Accounts are ready to be wired into the first feature slice.
            </CardContent>
          </Card>
          <Card className="border-white/70 bg-white/90 shadow-lg shadow-sky-100">
            <CardHeader>
              <CardDescription>Recurring Items</CardDescription>
              <CardTitle className="text-4xl">
                {formatCount(recurringCount)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              This will drive the recurring expense migration from Swift.
            </CardContent>
          </Card>
          <Card className="border-white/70 bg-white/90 shadow-lg shadow-sky-100">
            <CardHeader>
              <CardDescription>Pending Payments</CardDescription>
              <CardTitle className="text-4xl">
                {formatCount(pendingPaymentsCount)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Scheduled payments will later be processed by server-side jobs.
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr,0.9fr]">
          <Card className="border-white/70 bg-white/90 shadow-lg shadow-sky-100">
            <CardHeader>
              <CardTitle>Phase 1 status</CardTitle>
              <CardDescription>
                The starter project now behaves like the beginning of Rolly
                instead of the generic Supabase template.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4">
                Auth redirects now land in the app shell, new users are sent to
                household setup, and the setup flow can create or join a
                household.
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                The next implementation slice is clear: accounts UI, then
                expenses and recurring items on top of this foundation.
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-slate-950 text-white shadow-lg shadow-sky-100">
            <CardHeader>
              <CardTitle>Household details</CardTitle>
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
      </div>
    </main>
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
