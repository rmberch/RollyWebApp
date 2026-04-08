import {
  setPrimaryAccount,
} from "@/app/accounts/actions";
import { AccountActionMenu } from "@/components/account-action-menu";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthenticatedAppContext } from "@/lib/app-context";
import {
  formatCurrency,
  formatDate,
  getAccountHeroMutedTextClass,
  getAccountHeroSurfaceClass,
  getAccountHeroTextClass,
  getAccountTypeLabel,
  type AccountRow,
} from "@/lib/rolly";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

type AccountDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

async function AccountDetailContent({
  params,
  searchParams,
}: AccountDetailPageProps) {
  await connection();

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { household, profile, supabase } = await getAuthenticatedAppContext();

  const { data: accountData } = await supabase
    .from("accounts")
    .select(
      "id, name, type, current_balance, initial_balance, has_payment_due, payment_due_date, payment_amount, is_primary",
    )
    .eq("id", id)
    .maybeSingle();

  if (!accountData) {
    notFound();
  }

  const account = accountData as AccountRow;
  const supportsPaymentDue =
    account.type === "credit" || account.type === "loan";

  return (
    <AppShell
      currentPath="/accounts"
      householdName={household.name}
      subtitle={`Review and update ${account.name}. ${profile.display_name ? `${profile.display_name}, ` : ""}this is the beginning of the account detail flow from the iOS app.`}
    >
      {query.error ? (
        <div className="rounded-2xl border border-rose-200 bg-white/90 px-4 py-3 text-sm font-medium text-rose-800 shadow-sm">
          {query.error}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button asChild variant="outline" className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100">
          <Link href="/accounts">Back to accounts</Link>
        </Button>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-6">
          <section
            className={`rounded-[30px] border p-6 shadow-xl shadow-slate-200 ${getAccountHeroSurfaceClass(account.type)}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <p
                  className={`text-sm font-semibold uppercase tracking-[0.2em] ${getAccountHeroMutedTextClass(account.type)}`}
                >
                  {getAccountTypeLabel(account.type)}
                </p>
                <h2
                  className={`text-3xl font-semibold tracking-tight ${getAccountHeroTextClass(account.type)}`}
                >
                  {account.name}
                </h2>
                <p
                  className={`text-5xl font-semibold tracking-tight ${getAccountHeroTextClass(account.type)}`}
                >
                  {formatCurrency(account.current_balance)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {account.is_primary ? (
                  <Badge className="border-amber-300 bg-amber-100 text-amber-950">
                    Primary account
                  </Badge>
                ) : (
                  <form action={setPrimaryAccount}>
                    <input type="hidden" name="account_id" value={account.id} />
                    <Button className="bg-white text-slate-950 hover:bg-slate-100">
                      Set primary
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {account.has_payment_due ? (
              <div className="mt-6 rounded-[22px] border border-white/70 bg-white/75 p-4">
                <p className="text-sm font-medium text-slate-900">
                  Payment due: {formatCurrency(account.payment_amount)}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Due {formatDate(account.payment_due_date)}
                </p>
              </div>
            ) : supportsPaymentDue ? (
              <div className="mt-6 rounded-[22px] border border-white/70 bg-white/75 p-4 text-sm text-slate-800">
                No payment due is currently set for this account.
              </div>
            ) : null}
          </section>

          <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
            <CardHeader>
              <CardTitle className="text-slate-950">Account overview</CardTitle>
              <CardDescription className="text-slate-700">
                This matches the first pieces of the account detail screen from
                the migration spec.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm text-slate-800 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Type
                </p>
                <p className="mt-2 text-base font-medium text-slate-950">
                  {getAccountTypeLabel(account.type)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Starting balance
                </p>
                <p className="mt-2 text-base font-medium text-slate-950">
                  {formatCurrency(account.initial_balance)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Payment due
                </p>
                <p className="mt-2 text-base font-medium text-slate-950">
                  {account.has_payment_due
                    ? formatCurrency(account.payment_amount)
                    : "None set"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Due date
                </p>
                <p className="mt-2 text-base font-medium text-slate-950">
                  {formatDate(account.payment_due_date)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <AccountActionMenu
          account={account}
          supportsPaymentDue={supportsPaymentDue}
        />
      </section>
    </AppShell>
  );
}

export default function AccountDetailPage(props: AccountDetailPageProps) {
  return (
    <Suspense fallback={null}>
      <AccountDetailContent {...props} />
    </Suspense>
  );
}
