import { logPayday } from "@/app/settings/actions";
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
import { formatDate } from "@/lib/rolly";

export function PaydayPromptCard({
  nextPayday,
  depositAccounts,
  defaultPaydayAccountId,
}: {
  nextPayday: string;
  depositAccounts: Array<{
    id: string;
    name: string;
  }>;
  defaultPaydayAccountId?: string | null;
}) {
  return (
    <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
      <CardHeader>
        <CardTitle className="text-slate-950">Log payday</CardTitle>
        <CardDescription className="text-slate-700">
          Your scheduled payday was {formatDate(nextPayday)}. Record the deposit
          the next time you’re in the app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={logPayday} className="space-y-4 rounded-2xl bg-slate-50 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="home-payday-amount" className="text-slate-900">
                Amount received
              </Label>
              <Input
                id="home-payday-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                className="border-slate-300 bg-white text-slate-950"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="home-payday-date" className="text-slate-900">
                Pay date
              </Label>
              <Input
                id="home-payday-date"
                name="pay_date"
                type="date"
                defaultValue={nextPayday}
                className="border-slate-300 bg-white text-slate-950"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="home-deposit-account" className="text-slate-900">
              Deposit account
            </Label>
            <select
              id="home-deposit-account"
              name="deposit_account_id"
              defaultValue={defaultPaydayAccountId ?? depositAccounts[0]?.id ?? ""}
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
              required
            >
              {depositAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <Button className="w-full bg-sky-600 text-white hover:bg-sky-700">
            Save paycheck
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
