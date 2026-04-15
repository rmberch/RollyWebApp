import { AppShell } from "@/components/app-shell";
import { ExpensePanel } from "@/components/expense-panel";
import { PersonalSpendingCard } from "@/components/personal-spending-card";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthenticatedAppContext } from "@/lib/app-context";
import { formatCurrency, getAppDateString } from "@/lib/rolly";
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
  personal_profile_id: string | null;
  source: string;
};

async function ExpensesContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  const params = await searchParams;
  const { household, profile, supabase } = await getAuthenticatedAppContext();
  const today = getAppDateString();

  const [
    { data: accountsData },
    { data: activePeriod },
    { data: householdProfiles },
    { data: budgetSettings },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type")
      .eq("household_id", household.id)
      .order("name"),
    supabase
      .from("expense_periods")
      .select("id, spending_limit, month, year")
      .eq("household_id", household.id)
      .eq("year", Number(today.slice(0, 4)))
      .eq("month", Number(today.slice(5, 7)))
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, display_name, discretionary_spending_limit")
      .eq("household_id", household.id),
    supabase
      .from("budget_settings")
      .select("personal_spending_enabled")
      .eq("household_id", household.id)
      .maybeSingle(),
  ]);

  let expensesQuery = supabase
    .from("expenses")
    .select(
      "id, period_id, name, amount, date, is_tracked, account_id, personal_profile_id, source",
    )
    .eq("household_id", household.id)
    .order("date", { ascending: false });

  if (activePeriod?.id) {
    expensesQuery = expensesQuery.eq("period_id", activePeriod.id);
  } else {
    expensesQuery = expensesQuery.gte("date", `${today.slice(0, 7)}-01`);
  }

  const { data: expensesData } = await expensesQuery;

  const householdAccounts =
    accountsData?.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
    })) ?? [];
  const accounts = householdAccounts.filter((account) => account.type !== "loan");

  const accountNameById = new Map(
    householdAccounts.map((account) => [account.id, account.name]),
  );
  const memberNameById = new Map(
    (householdProfiles ?? []).map((member) => [
      member.id,
      member.display_name?.trim() || "Household member",
    ]),
  );
  const personalSpendingEnabled = Boolean(
    budgetSettings?.personal_spending_enabled,
  );
  const householdMembers =
    (householdProfiles ?? []).map((member) => ({
      id: member.id,
      display_name: member.display_name?.trim() || "Household member",
      discretionary_spending_limit: Number(
        member.discretionary_spending_limit ?? 0,
      ),
    })) ?? [];

  const expenses =
    (expensesData as ExpenseQueryRow[] | null)?.map((expense) => ({
        id: expense.id,
        name: expense.name,
        amount: expense.amount,
        date: expense.date,
        is_tracked: expense.is_tracked,
        account_id: expense.account_id,
        account_name: expense.account_id
          ? accountNameById.get(expense.account_id) ?? null
          : null,
        personal_profile_id: expense.personal_profile_id,
        personal_profile_name: expense.personal_profile_id
          ? memberNameById.get(expense.personal_profile_id) ?? "Household member"
          : null,
        source: expense.source,
      })) ?? [];
  const visibleExpenses = expenses.filter((expense) => {
    if (expense.source === "contribution") {
      return false;
    }

    if (expense.source === "payment") {
      return expense.name.startsWith("Payment to ");
    }

    return true;
  });

  const trackedExpenses = visibleExpenses.filter((expense) => expense.is_tracked);
  const billExpenses = visibleExpenses.filter((expense) => !expense.is_tracked);
  const trackedTotal = trackedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const billTotal = billExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const spendingLimit = Number(activePeriod?.spending_limit ?? 0);
  const remaining = spendingLimit - trackedTotal;
  const personalSpendingByMember = householdMembers.map((member) => {
    const spent = trackedExpenses
      .filter((expense) => expense.personal_profile_id === member.id)
      .reduce((sum, expense) => sum + expense.amount, 0);

    return {
      ...member,
      spent,
      remaining: member.discretionary_spending_limit - spent,
    };
  });

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
              Expenses and bills need at least one non-loan account so they can
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
                  {visibleExpenses.length}
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

          {personalSpendingEnabled ? (
            <PersonalSpendingCard members={personalSpendingByMember} />
          ) : null}

          <ExpensePanel
            accounts={accounts}
            householdMembers={householdMembers}
            personalSpendingEnabled={personalSpendingEnabled}
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
