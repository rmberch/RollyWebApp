import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountRow, formatCurrency, getAccountSurfaceClass } from "@/lib/rolly";
import Link from "next/link";

type AccountCardProps = {
  account: AccountRow;
  action?: React.ReactNode;
};

export function AccountCard({ account, action }: AccountCardProps) {
  return (
    <article
      className={`rounded-[22px] border p-5 shadow-sm ${getAccountSurfaceClass(account.type)}`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-950">
                {account.name}
              </h3>
            </div>
            <p className="text-sm text-slate-700">
              Current balance
            </p>
          </div>
          <div className="flex items-center gap-2">
            {account.is_primary ? (
              <Badge className="border-amber-300 bg-amber-100 text-amber-950">
                Primary
              </Badge>
            ) : null}
            {action}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-3xl font-semibold tracking-tight text-slate-950">
              {formatCurrency(account.current_balance)}
            </p>
            {account.initial_balance !== null ? (
              <p className="mt-1 text-sm text-slate-700">
                Started at {formatCurrency(account.initial_balance)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {account.has_payment_due && account.payment_amount ? (
              <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-800">
                <p className="font-medium text-slate-900">
                  Payment due {formatCurrency(account.payment_amount)}
                </p>
                <p className="mt-1 text-slate-700">
                  {account.payment_due_date ?? "Due date not set"}
                </p>
              </div>
            ) : null}
            <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
              <Link href={`/accounts/${account.id}`}>View details</Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
