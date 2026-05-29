import {
  buildExpenseReportFilename,
  buildExpenseReportPdf,
  getExpenseReportGeneratedLabel,
  getExpenseReportPeriodLabels,
  getMonthMeta,
  type ExpenseReportTransaction,
} from "@/lib/expense-report";
import { getAuthenticatedReportContext } from "@/lib/report-context";
import { getAppDateString } from "@/lib/rolly";
import { NextResponse, type NextRequest } from "next/server";

type ExpenseQueryRow = {
  id: string;
  period_id: string | null;
  name: string;
  amount: number;
  date: string;
  is_tracked: boolean;
  account_id: string | null;
  personal_profile_id: string | null;
  expense_personal_allocations?: Array<{
    profile_id: string;
    amount: number;
  }> | null;
  source: string;
};

type SearchParams = {
  period?: string;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params: SearchParams = {
    period: searchParams.get("period") ?? undefined,
  };

  const { household, profile, supabase } = await getAuthenticatedReportContext();
  const today = getAppDateString();
  const currentMonth = getMonthMeta(today);
  const lastMonth = getMonthMeta(today, -1);
  const selectedPeriod = params.period === "current" ? "current" : "last";
  const selectedMonth = selectedPeriod === "current" ? currentMonth : lastMonth;

  const [
    { data: accountsData },
    { data: expensePeriodsData },
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
      .in("year", Array.from(new Set([currentMonth.year, lastMonth.year])))
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(12),
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

  const currentPeriod =
    expensePeriodsData?.find(
      (period) =>
        period.year === currentMonth.year && period.month === currentMonth.month,
    ) ?? null;
  const previousPeriod =
    expensePeriodsData?.find(
      (period) => period.year === lastMonth.year && period.month === lastMonth.month,
    ) ?? null;
  const activePeriod = selectedPeriod === "last" ? previousPeriod : currentPeriod;

  let expensesQuery = supabase
    .from("expenses")
    .select(
      "id, period_id, name, amount, date, is_tracked, account_id, personal_profile_id, source, expense_personal_allocations(profile_id, amount)",
    )
    .eq("household_id", household.id)
    .order("date", { ascending: false });

  if (activePeriod?.id) {
    expensesQuery = expensesQuery.eq("period_id", activePeriod.id);
  } else {
    expensesQuery = expensesQuery
      .gte("date", selectedMonth.start)
      .lt("date", selectedMonth.end);
  }

  const { data: expensesWithAllocations, error: expensesWithAllocationsError } =
    await expensesQuery;
  let expensesData: ExpenseQueryRow[] | null = expensesWithAllocations;

  if (expensesWithAllocationsError) {
    let fallbackExpensesQuery = supabase
      .from("expenses")
      .select(
        "id, period_id, name, amount, date, is_tracked, account_id, personal_profile_id, source",
      )
      .eq("household_id", household.id)
      .order("date", { ascending: false });

    if (activePeriod?.id) {
      fallbackExpensesQuery = fallbackExpensesQuery.eq("period_id", activePeriod.id);
    } else {
      fallbackExpensesQuery = fallbackExpensesQuery
        .gte("date", selectedMonth.start)
        .lt("date", selectedMonth.end);
    }

    const { data: fallbackExpensesData } = await fallbackExpensesQuery;
    expensesData = fallbackExpensesData;
  }

  const householdAccounts =
    accountsData?.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
    })) ?? [];
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
      personal_allocations:
        expense.expense_personal_allocations?.map((allocation) => ({
          profile_id: allocation.profile_id,
          profile_name:
            memberNameById.get(allocation.profile_id) ?? "Household member",
          amount: Number(allocation.amount),
        })) ??
        (expense.personal_profile_id
          ? [
              {
                profile_id: expense.personal_profile_id,
                profile_name:
                  memberNameById.get(expense.personal_profile_id) ??
                  "Household member",
                amount: Number(expense.amount),
              },
            ]
          : []),
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

  const sortedVisibleExpenses = [...visibleExpenses].sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.name.localeCompare(right.name) ||
      left.id.localeCompare(right.id),
  );

  const trackedExpenses = sortedVisibleExpenses.filter(
    (expense) => expense.is_tracked,
  );
  const billExpenses = sortedVisibleExpenses.filter((expense) => !expense.is_tracked);
  const trackedTotal = trackedExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const billTotal = billExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const spendingLimit = Number(activePeriod?.spending_limit ?? 0);
  const remaining = spendingLimit - trackedTotal;
  const personalSpendingByMember = householdMembers.map((member) => {
    const spent = trackedExpenses.reduce(
      (sum, expense) =>
        sum +
        expense.personal_allocations
          .filter((allocation) => allocation.profile_id === member.id)
          .reduce((allocationSum, allocation) => allocationSum + allocation.amount, 0),
      0,
    );

    return {
      displayName: member.display_name,
      spent,
      remaining: member.discretionary_spending_limit - spent,
    };
  });

  const periodLabels = getExpenseReportPeriodLabels(selectedMonth);
  const pdfBytes = buildExpenseReportPdf({
    householdName: household.name,
    profileDisplayName: profile.display_name?.trim() || null,
    month: selectedMonth,
    generatedAt: getExpenseReportGeneratedLabel(),
    periodStartLabel: periodLabels.startLabel,
    periodEndLabel: periodLabels.endLabel,
    transactionCount: visibleExpenses.length,
    trackedCount: trackedExpenses.length,
    billCount: billExpenses.length,
    trackedTotal,
    billTotal,
    spendingLimit,
    remaining,
    personalSpendingEnabled,
    personalSpendingByMember,
    trackedTransactions: trackedExpenses.map(
      (expense): ExpenseReportTransaction => ({
        id: expense.id,
        name: expense.name,
        amount: expense.amount,
        date: expense.date,
        isTracked: expense.is_tracked,
        accountName: expense.account_name,
      }),
    ),
    billTransactions: billExpenses.map(
      (expense): ExpenseReportTransaction => ({
        id: expense.id,
        name: expense.name,
        amount: expense.amount,
        date: expense.date,
        isTracked: expense.is_tracked,
        accountName: expense.account_name,
      }),
    ),
  });

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${buildExpenseReportFilename(selectedMonth)}"`,
      "Cache-Control": "no-store",
    },
  });
}
