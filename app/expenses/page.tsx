import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthenticatedAppContext } from "@/lib/app-context";
import { connection } from "next/server";
import { Suspense } from "react";

async function ExpensesContent() {
  await connection();
  const { household } = await getAuthenticatedAppContext();

  return (
    <AppShell
      currentPath="/expenses"
      householdName={household.name}
      subtitle="Expenses are next in the migration order. This screen is reserved for the monthly summary, tracked spending, and bill history."
    >
      <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
        <CardHeader>
          <CardTitle className="text-slate-950">Expenses are up next</CardTitle>
          <CardDescription className="text-slate-700">
            The next build slice will add the monthly summary, tracked expenses,
            bills, and previous-period history.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          The shell is ready, and the accounts slice is now in place to support
          expense routing.
        </CardContent>
      </Card>
    </AppShell>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={null}>
      <ExpensesContent />
    </Suspense>
  );
}
