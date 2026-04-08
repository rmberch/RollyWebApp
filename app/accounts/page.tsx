import { addAccount, setPrimaryAccount } from "@/app/accounts/actions";
import { AppShell } from "@/components/app-shell";
import { AccountCard } from "@/components/account-card";
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
import { groupAccountsByType, type AccountRow } from "@/lib/rolly";
import { connection } from "next/server";
import { Suspense } from "react";

type AccountsPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

async function AccountsContent({ searchParams }: AccountsPageProps) {
  await connection();

  const params = await searchParams;
  const { household, profile, supabase } = await getAuthenticatedAppContext();

  const { data } = await supabase
    .from("accounts")
    .select(
      "id, name, type, current_balance, initial_balance, has_payment_due, payment_due_date, payment_amount, is_primary",
    )
    .order("created_at", { ascending: true });

  const accounts = (data ?? []) as AccountRow[];
  const groupedAccounts = groupAccountsByType(accounts);

  return (
    <AppShell
      currentPath="/accounts"
      householdName={household.name}
      subtitle={`Manage the shared accounts for ${profile.display_name ?? "your household"}. This is the first feature slice from the migration plan: add accounts, group them by type, and choose the primary account.`}
    >
      {params.error ? (
        <div className="rounded-2xl border border-rose-200 bg-white/90 px-4 py-3 text-sm font-medium text-rose-800 shadow-sm">
          {params.error}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
          <CardHeader>
            <CardTitle className="text-slate-950">Your accounts</CardTitle>
            <CardDescription className="text-slate-700">
              Accounts are grouped the same way the iOS app organizes them:
              Checking, Savings, Credit, and Loan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {accounts.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-700">
                No accounts yet. Add your first account to start building the
                household dashboard.
              </div>
            ) : null}

            {groupedAccounts.map((group) =>
              group.accounts.length > 0 ? (
                <section key={group.type} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-950">
                      {group.label}
                    </h2>
                    <Badge className="border-slate-300 bg-slate-100 text-slate-800">
                      {group.accounts.length}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {group.accounts.map((account) => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        action={
                          !account.is_primary ? (
                            <form action={setPrimaryAccount}>
                              <input
                                type="hidden"
                                name="account_id"
                                value={account.id}
                              />
                              <Button
                                type="submit"
                                variant="outline"
                                className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                              >
                                Set primary
                              </Button>
                            </form>
                          ) : null
                        }
                      />
                    ))}
                  </div>
                </section>
              ) : null,
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
            <CardHeader>
              <CardTitle className="text-slate-950">Add account</CardTitle>
              <CardDescription className="text-slate-700">
                Start with the balances you have today. The first account added
                becomes the primary account automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={addAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-900">
                    Account name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Chase Checking"
                    className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type" className="text-slate-900">
                    Account type
                  </Label>
                  <select
                    id="type"
                    name="type"
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                    defaultValue="checking"
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit">Credit</option>
                    <option value="loan">Loan</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_balance" className="text-slate-900">
                    Current balance
                  </Label>
                  <Input
                    id="current_balance"
                    name="current_balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-500"
                    required
                  />
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    name="is_primary"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600"
                  />
                  <span>
                    Make this the primary account shown on the home dashboard.
                  </span>
                </label>

                <Button className="w-full bg-sky-600 text-white hover:bg-sky-700">
                  Save account
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-slate-950 text-white shadow-lg shadow-sky-100">
            <CardHeader>
              <CardTitle>Phase 3 plan</CardTitle>
              <CardDescription className="text-slate-300">
                This accounts slice sets up the next few steps cleanly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-200">
              <p>Now: grouped list, add-account form, primary account selection.</p>
              <p>Next: account detail view, payment due state, schedule/apply payment flows.</p>
              <p>Then: route expenses and recurring items through the selected accounts.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}

export default function AccountsPage(props: AccountsPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#edf3fb_100%)] px-6 py-8">
          <div className="mx-auto max-w-5xl rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-lg shadow-sky-100">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-800">
              Accounts
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Loading accounts...
            </h1>
          </div>
        </main>
      }
    >
      <AccountsContent {...props} />
    </Suspense>
  );
}
