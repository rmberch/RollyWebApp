import { AppShell } from "@/components/app-shell";
import { ExpensePanel } from "@/components/expense-panel";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthenticatedAppContext } from "@/lib/app-context";
import { formatCurrency } from "@/lib/rolly";
import { connection } from "next/server";
import { Suspense } from "react";

type SearchParams = Promise<{
  error?: string;
}>;

type ExpenseQueryRow = {
  id: string;
  period_id: string | null;
  name: string;
  amount: number;
  date: string;
  is_tracked: boolean;
  account_id: string | null;
  source: string;
  accounts: { name: string }[] | null;
};

async function ExpensesContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  const params = await searchParams;
  const { household, profile, supabase } = await getAuthenticatedAppContext();

  const [{ data: accountsData }, { data: activePeriod }, { data: expensesData }] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, type")
        .in("type", ["checking", "credit"])
        .order("name"),
      supabase
        .from("expense_periods")
        .select("id, spending_limit, month, year")
        .eq("status", "active")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("expenses")
        .select("id, period_id, name, amount, date, is_tracked, account_id, source, accounts(name)")
        .order("date", { ascending: false }),
    ]);

  const accounts =
    accountsData?.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
    })) ?? [];

  const accountNameById = new Map(
    accounts.map((account) => [account.id, account.name]),
  );

  const activePeriodId = activePeriod?.id ?? null;

  const expenses =
    (expensesData as ExpenseQueryRow[] | null)
      ?.filter((expense) => !activePeriodId || expense.period_id === activePeriodId)
      .map((expense) => ({
        id: expense.id,
        name: expense.name,
        amount: expense.amount,
        date: expense.date,
        is_tracked: expense.is_tracked,
        account_id: expense.account_id,
        account_name: expense.account_id
          ? accountNameById.get(expense.account_id) ?? null
          : null,
        source: expense.source,
      })) ?? [];

  const trackedExpenses = expenses.filter((expense) => expense.is_tracked);
  const billExpenses = expenses.filter((expense) => !expense.is_tracked);
  const trackedTotal = trackedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const billTotal = billExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const spendingLimit = Number(activePeriod?.spending_limit ?? 0);
  const remaining = spendingLimit - trackedTotal;

  return (
    <AppShell
      currentPath="/expenses"
      householdName={household.name}
      subtitle={`${profile.display_name ? `${profile.display_name}, ` : ""}track spending for the current month, review bills, and adjust entries with proper balance reversal.`}
    >
      {params.error ? (
        <div className="rounded-2xl border border-rose-200 bg-white/90 px-4 py-3 text-sm font-medium text-rose-800 shadow-sm">
          {params.error}
        </div>
      ) : null}

      {accounts.length === 0 ? (
        <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
          <CardHeader>
            <CardTitle className="text-slate-950">Add an account first</CardTitle>
            <CardDescription className="text-slate-700">
              Expenses need at least one checking or credit account so they can
              affect a balance the same way they do in the iOS app.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
              <CardHeader>
                <CardDescription className="font-medium text-slate-700">
                  Transactions
                </CardDescription>
                <CardTitle className="text-4xl text-slate-950">
                  {expenses.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
              <CardHeader>
                <CardDescription className="font-medium text-slate-700">
                  Expenses
                </CardDescription>
                <CardTitle className="text-3xl text-slate-950">
                  {formatCurrency(trackedTotal)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
              <CardHeader>
                <CardDescription className="font-medium text-slate-700">
                  Remaining
                </CardDescription>
                <CardTitle className="text-3xl text-slate-950">
                  {formatCurrency(remaining)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
              <CardHeader>
                <CardDescription className="font-medium text-slate-700">
                  Bills
                </CardDescription>
                <CardTitle className="text-3xl text-slate-950">
                  {formatCurrency(billTotal)}
                </CardTitle>
              </CardHeader>
            </Card>
          </section>

          <ExpensePanel
            accounts={accounts}
            trackedExpenses={trackedExpenses}
            billExpenses={billExpenses}
          />
        </>
      )}
    </AppShell>
  );
}

export default function ExpensesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={null}>
      <ExpensesContent searchParams={searchParams} />
    </Suspense>
  );
}
