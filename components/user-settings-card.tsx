"use client";

import {
  logPayday,
  updateDisplayName,
  updatePaydaySettings,
} from "@/app/settings/actions";
import { createClient } from "@/lib/supabase/client";
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
import { getPaydayFrequencyLabel, paydayFrequencies } from "@/lib/rolly";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function ActionButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
        active
          ? "border-sky-300 bg-sky-50 text-sky-950"
          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span>{children}</span>
      {active ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );
}

export function UserSettingsCard({
  displayName,
  nextPayday,
  paydayFrequency,
  defaultPaydayAccountId,
  depositAccounts,
}: {
  displayName: string | null | undefined;
  nextPayday?: string | null;
  paydayFrequency?: string | null;
  defaultPaydayAccountId?: string | null;
  depositAccounts: Array<{
    id: string;
    name: string;
  }>;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (key: string) => {
    setExpanded((current) => (current === key ? null : key));
  };

  const logout = async () => {
    if (!window.confirm("Sign out of Rolly on this device?")) {
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  };

  return (
    <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
      <CardHeader>
        <CardTitle className="text-slate-950">User</CardTitle>
        <CardDescription className="text-slate-700">
          Signed in as {displayName?.trim() || "Household member"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            Current display name
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {displayName?.trim() || "Household member"}
          </p>
          <p className="mt-2 text-sm text-slate-700">
            {nextPayday && paydayFrequency
              ? `Next payday ${nextPayday} · ${getPaydayFrequencyLabel(
                  paydayFrequency as (typeof paydayFrequencies)[number],
                )}`
              : "Payday reminders are not configured yet."}
          </p>
        </div>

        <div className="space-y-3">
          <ActionButton
            active={expanded === "display-name"}
            onClick={() => toggle("display-name")}
          >
            Update display name
          </ActionButton>
          {expanded === "display-name" ? (
            <form
              action={updateDisplayName}
              className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="space-y-2">
                <Label htmlFor="display_name" className="text-slate-900">
                  Display name
                </Label>
                <Input
                  id="display_name"
                  name="display_name"
                  type="text"
                  defaultValue={displayName ?? ""}
                  placeholder="Ryan"
                  className="border-slate-300 bg-white text-slate-950"
                />
              </div>
              <p className="text-sm text-slate-700">
                Leave blank only if you want the app to fall back to
                &quot;Household member.&quot;
              </p>
              <Button className="w-full bg-slate-950 text-white hover:bg-slate-800">
                Save display name
              </Button>
            </form>
          ) : null}

          <ActionButton
            active={expanded === "payday-settings"}
            onClick={() => toggle("payday-settings")}
          >
            Update payday settings
          </ActionButton>
          {expanded === "payday-settings" ? (
            <form
              action={updatePaydaySettings}
              className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="next_payday" className="text-slate-900">
                    Next payday
                  </Label>
                  <Input
                    id="next_payday"
                    name="next_payday"
                    type="date"
                    defaultValue={nextPayday ?? new Date().toISOString().slice(0, 10)}
                    className="border-slate-300 bg-white text-slate-950"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payday_frequency" className="text-slate-900">
                    Frequency
                  </Label>
                  <select
                    id="payday_frequency"
                    name="payday_frequency"
                    defaultValue={paydayFrequency ?? "biWeekly"}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                  >
                    {paydayFrequencies.map((frequency) => (
                      <option key={frequency} value={frequency}>
                        {getPaydayFrequencyLabel(frequency)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_payday_account_id" className="text-slate-900">
                  Default deposit account
                </Label>
                <select
                  id="default_payday_account_id"
                  name="default_payday_account_id"
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
              <Button className="w-full bg-slate-950 text-white hover:bg-slate-800">
                Save payday settings
              </Button>
            </form>
          ) : null}

          {nextPayday && paydayFrequency ? (
            <>
              <ActionButton
                active={expanded === "log-payday"}
                onClick={() => toggle("log-payday")}
              >
                Log payday
              </ActionButton>
              {expanded === "log-payday" ? (
                <form
                  action={logPayday}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="payday_amount" className="text-slate-900">
                        Amount received
                      </Label>
                      <Input
                        id="payday_amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="border-slate-300 bg-white text-slate-950"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pay_date" className="text-slate-900">
                        Pay date
                      </Label>
                      <Input
                        id="pay_date"
                        name="pay_date"
                        type="date"
                        defaultValue={nextPayday}
                        className="border-slate-300 bg-white text-slate-950"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deposit_account_id" className="text-slate-900">
                      Deposit account
                    </Label>
                    <select
                      id="deposit_account_id"
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
              ) : null}
            </>
          ) : null}

          <ActionButton
            active={expanded === "sign-out"}
            onClick={() => toggle("sign-out")}
          >
            Sign out
          </ActionButton>
          {expanded === "sign-out" ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                This will sign you out on this device and send you back to the
                sign-in screen.
              </p>
              <Button
                type="button"
                onClick={logout}
                variant="outline"
                className="w-full border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
              >
                Confirm sign out
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
