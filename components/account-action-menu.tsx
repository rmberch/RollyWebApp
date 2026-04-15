"use client";

import {
  cancelScheduledPayment,
  deleteAccount,
  makeAccountContribution,
  makeAccountPayment,
  renameAccount,
  scheduleAccountPayment,
  setAccountPaymentDue,
  updateAccountBalance,
} from "@/app/accounts/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  accountCanReceiveContribution,
  formatCurrency,
  formatDate,
  type AccountRow,
  type ScheduledPaymentRow,
} from "@/lib/rolly";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type AccountActionMenuProps = {
  account: AccountRow;
  supportsPaymentDue: boolean;
  sourceAccounts: Array<{
    id: string;
    name: string;
    current_balance: number;
  }>;
  scheduledPayments: ScheduledPaymentRow[];
};

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
      {active ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )}
    </button>
  );
}

export function AccountActionMenu({
  account,
  supportsPaymentDue,
  sourceAccounts,
  scheduledPayments,
}: AccountActionMenuProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scheduledSourceId, setScheduledSourceId] = useState(
    sourceAccounts[0]?.id ?? "",
  );
  const [scheduledAmount, setScheduledAmount] = useState(
    String(account.payment_amount ?? account.current_balance ?? ""),
  );
  const [paymentSourceId, setPaymentSourceId] = useState(
    sourceAccounts[0]?.id ?? "",
  );
  const [paymentAmount, setPaymentAmount] = useState(
    String(account.payment_amount ?? ""),
  );
  const [contributionSourceId, setContributionSourceId] = useState("");
  const [contributionTitle, setContributionTitle] = useState("");
  const canReceiveContribution = accountCanReceiveContribution(account.type);

  const toggle = (key: string) => {
    setExpanded((current) => (current === key ? null : key));
  };

  const contributionSourceOptions = sourceAccounts.filter(
    (sourceAccount) => sourceAccount.id !== account.id,
  );
  const scheduledSourceAccount =
    sourceAccounts.find((sourceAccount) => sourceAccount.id === scheduledSourceId) ??
    null;
  const selectedPaymentSourceAccount =
    sourceAccounts.find((sourceAccount) => sourceAccount.id === paymentSourceId) ??
    null;
  const selectedContributionSourceAccount =
    contributionSourceOptions.find(
      (sourceAccount) => sourceAccount.id === contributionSourceId,
    ) ?? null;
  const scheduledAmountValue = Number(scheduledAmount || 0);
  const paymentAmountValue = Number(paymentAmount || 0);
  const scheduledAmountTooHigh =
    !!scheduledSourceAccount &&
    Number.isFinite(scheduledAmountValue) &&
    scheduledAmountValue > scheduledSourceAccount.current_balance;
  const paymentAmountTooHigh =
    !!selectedPaymentSourceAccount &&
    Number.isFinite(paymentAmountValue) &&
    paymentAmountValue > selectedPaymentSourceAccount.current_balance;
  const contributionHasRequiredSourceOrTitle =
    contributionSourceId !== "" || contributionTitle.trim().length > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-white/70 bg-white/92 p-6 shadow-lg shadow-sky-100">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-950">
            Account actions
          </h3>
          <p className="text-sm text-slate-700">
            Use these actions to manage payments, deposits, and account details
            without leaving the page.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {supportsPaymentDue ? (
            <>
              <ActionButton
                active={expanded === "set-payment-due"}
                onClick={() => toggle("set-payment-due")}
              >
                Set Payment Due
              </ActionButton>
              {expanded === "set-payment-due" ? (
                <form
                  action={setAccountPaymentDue}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <input type="hidden" name="account_id" value={account.id} />
                  <div className="space-y-2">
                    <Label htmlFor="payment_amount" className="text-slate-900">
                      Statement balance
                    </Label>
                    <Input
                      id="payment_amount"
                      name="payment_amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      defaultValue={
                        account.payment_amount ?? account.current_balance
                      }
                      className="border-slate-300 bg-white text-slate-950"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="payment_due_date"
                      className="text-slate-900"
                    >
                      Due date
                    </Label>
                    <Input
                      id="payment_due_date"
                      name="payment_due_date"
                      type="date"
                      defaultValue={account.payment_due_date ?? ""}
                      className="border-slate-300 bg-white text-slate-950"
                      required
                    />
                  </div>
                  <Button className="w-full bg-slate-950 text-white hover:bg-slate-800">
                    Save payment due
                  </Button>
                </form>
              ) : null}

              <ActionButton
                active={expanded === "schedule-payment"}
                onClick={() => toggle("schedule-payment")}
              >
                Schedule Payment
              </ActionButton>
              {expanded === "schedule-payment" ? (
                <form
                  action={scheduleAccountPayment}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <input type="hidden" name="dest_account_id" value={account.id} />
                  <div className="space-y-2">
                    <Label
                      htmlFor="scheduled_source_account_id"
                      className="text-slate-900"
                    >
                      Source account
                    </Label>
                    <select
                      id="scheduled_source_account_id"
                      name="source_account_id"
                      value={scheduledSourceId}
                      onChange={(event) =>
                        setScheduledSourceId(event.target.value)
                      }
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                      required
                    >
                      {sourceAccounts.map((sourceAccount) => (
                        <option key={sourceAccount.id} value={sourceAccount.id}>
                          {sourceAccount.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="scheduled_amount"
                      className="text-slate-900"
                    >
                      Payment amount
                    </Label>
                    <Input
                      id="scheduled_amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={scheduledAmount}
                      onChange={(event) => setScheduledAmount(event.target.value)}
                      className="border-slate-300 bg-white text-slate-950"
                      required
                    />
                  </div>
                  {scheduledSourceAccount ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
                      <p className="font-medium text-slate-950">
                        {scheduledSourceAccount.name}
                      </p>
                      <p className="mt-1">
                        Available balance:{" "}
                        {formatCurrency(scheduledSourceAccount.current_balance)}
                      </p>
                    </div>
                  ) : null}
                  {scheduledAmountTooHigh ? (
                    <p className="text-sm font-medium text-rose-700">
                      Payment amount cannot exceed the selected source account
                      balance.
                    </p>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_date" className="text-slate-900">
                      Scheduled date
                    </Label>
                    <Input
                      id="scheduled_date"
                      name="scheduled_date"
                      type="date"
                      defaultValue={
                        account.payment_due_date ??
                        new Date().toISOString().slice(0, 10)
                      }
                      className="border-slate-300 bg-white text-slate-950"
                      required
                    />
                  </div>
                  <Button
                    className="w-full bg-slate-950 text-white hover:bg-slate-800"
                    disabled={!scheduledSourceAccount || scheduledAmountTooHigh}
                  >
                    Save scheduled payment
                  </Button>
                </form>
              ) : null}

              <ActionButton
                active={expanded === "make-payment"}
                onClick={() => toggle("make-payment")}
              >
                Make Payment
              </ActionButton>
              {expanded === "make-payment" ? (
                <form
                  action={makeAccountPayment}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <input type="hidden" name="dest_account_id" value={account.id} />
                  <div className="space-y-2">
                    <Label
                      htmlFor="payment_source_account_id"
                      className="text-slate-900"
                    >
                      Source account
                    </Label>
                    <select
                      id="payment_source_account_id"
                      name="source_account_id"
                      value={paymentSourceId}
                      onChange={(event) => setPaymentSourceId(event.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                      required
                    >
                      {sourceAccounts.map((sourceAccount) => (
                        <option key={sourceAccount.id} value={sourceAccount.id}>
                          {sourceAccount.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="payment_amount_now"
                      className="text-slate-900"
                    >
                      Payment amount
                    </Label>
                    <Input
                      id="payment_amount_now"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={paymentAmount}
                      onChange={(event) => setPaymentAmount(event.target.value)}
                      className="border-slate-300 bg-white text-slate-950"
                      required
                    />
                  </div>
                  {selectedPaymentSourceAccount ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
                      <p className="font-medium text-slate-950">
                        {selectedPaymentSourceAccount.name}
                      </p>
                      <p className="mt-1">
                        Available balance:{" "}
                        {formatCurrency(selectedPaymentSourceAccount.current_balance)}
                      </p>
                    </div>
                  ) : null}
                  {paymentAmountTooHigh ? (
                    <p className="text-sm font-medium text-rose-700">
                      Payment amount cannot exceed the selected source account
                      balance.
                    </p>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="payment_date_now" className="text-slate-900">
                      Payment date
                    </Label>
                    <Input
                      id="payment_date_now"
                      name="date"
                      type="date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      className="border-slate-300 bg-white text-slate-950"
                      required
                    />
                  </div>
                  <Button
                    className="w-full bg-sky-600 text-white hover:bg-sky-700"
                    disabled={
                      !selectedPaymentSourceAccount || paymentAmountTooHigh
                    }
                  >
                    Save payment
                  </Button>
                </form>
              ) : null}
            </>
          ) : canReceiveContribution ? (
            <>
              <ActionButton
                active={expanded === "make-contribution"}
                onClick={() => toggle("make-contribution")}
              >
                Make Contribution
              </ActionButton>
              {expanded === "make-contribution" ? (
                <form
                  action={makeAccountContribution}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <input type="hidden" name="dest_account_id" value={account.id} />
                  <div className="space-y-2">
                    <Label
                      htmlFor="contribution_source_account_id"
                      className="text-slate-900"
                    >
                      Source account
                    </Label>
                    <select
                      id="contribution_source_account_id"
                      name="source_account_id"
                      value={contributionSourceId}
                      onChange={(event) =>
                        setContributionSourceId(event.target.value)
                      }
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      <option value="">No source account</option>
                      {contributionSourceOptions.map((sourceAccount) => (
                        <option key={sourceAccount.id} value={sourceAccount.id}>
                          {sourceAccount.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedContributionSourceAccount ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
                      <p className="font-medium text-slate-950">
                        {selectedContributionSourceAccount.name}
                      </p>
                      <p className="mt-1">
                        Available balance:{" "}
                        {formatCurrency(
                          selectedContributionSourceAccount.current_balance,
                        )}
                      </p>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label
                      htmlFor="contribution_amount"
                      className="text-slate-900"
                    >
                      Contribution amount
                    </Label>
                    <Input
                      id="contribution_amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="border-slate-300 bg-white text-slate-950"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="contribution_date"
                      className="text-slate-900"
                    >
                      Contribution date
                    </Label>
                    <Input
                      id="contribution_date"
                      name="date"
                      type="date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      className="border-slate-300 bg-white text-slate-950"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="contribution_title"
                      className="text-slate-900"
                    >
                      Custom title
                    </Label>
                    <Input
                      id="contribution_title"
                      name="title"
                      placeholder="Birthday money from Mom"
                      value={contributionTitle}
                      onChange={(event) =>
                        setContributionTitle(event.target.value)
                      }
                      className="border-slate-300 bg-white text-slate-950"
                    />
                  </div>
                  {!contributionHasRequiredSourceOrTitle ? (
                    <p className="text-sm font-medium text-rose-700">
                      Choose a source account or enter a custom title before
                      saving this contribution.
                    </p>
                  ) : null}
                  <p className="text-sm text-slate-700">
                    Leave source account empty to record an outside deposit with
                    your own title.
                  </p>
                  <Button
                    className="w-full bg-sky-600 text-white hover:bg-sky-700"
                    disabled={!contributionHasRequiredSourceOrTitle}
                  >
                    Save contribution
                  </Button>
                </form>
              ) : null}
            </>
          ) : null}

          {supportsPaymentDue && scheduledPayments.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-950">
                Scheduled payment
              </p>
              {scheduledPayments.map((scheduledPayment) => (
                <div
                  key={scheduledPayment.id}
                  className="mt-3 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {formatCurrency(scheduledPayment.amount)} on{" "}
                    {formatDate(scheduledPayment.scheduled_date)}
                  </p>
                  <form
                    action={cancelScheduledPayment}
                    className="mt-3"
                    onSubmit={(event) => {
                      if (!window.confirm("Cancel this scheduled payment?")) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input
                      type="hidden"
                      name="payment_id"
                      value={scheduledPayment.id}
                    />
                    <input type="hidden" name="account_id" value={account.id} />
                    <Button
                      variant="outline"
                      className="w-full border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                    >
                      Cancel scheduled payment
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[24px] border border-white/70 bg-white/92 p-6 shadow-lg shadow-sky-100">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-950">Maintenance</h3>
          <p className="text-sm text-slate-700">
            Less common updates stay here so they are easy to reach when you
            need them.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <ActionButton
            active={expanded === "rename-account"}
            onClick={() => toggle("rename-account")}
          >
            Rename Account
          </ActionButton>
          {expanded === "rename-account" ? (
            <form
              action={renameAccount}
              className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <input type="hidden" name="account_id" value={account.id} />
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-900">
                  New account name
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={account.name}
                  className="border-slate-300 bg-white text-slate-950"
                  required
                />
              </div>
              <Button className="w-full bg-sky-600 text-white hover:bg-sky-700">
                Save name
              </Button>
            </form>
          ) : null}

          <ActionButton
            active={expanded === "update-balance"}
            onClick={() => toggle("update-balance")}
          >
            Update Balance
          </ActionButton>
          {expanded === "update-balance" ? (
            <form
              action={updateAccountBalance}
              className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <input type="hidden" name="account_id" value={account.id} />
              <div className="space-y-2">
                <Label htmlFor="current_balance" className="text-slate-900">
                  Updated balance
                </Label>
                <Input
                  id="current_balance"
                  name="current_balance"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={account.current_balance}
                  className="border-slate-300 bg-white text-slate-950"
                  required
                />
              </div>
              <p className="text-sm text-slate-700">
                Current saved balance: {formatCurrency(account.current_balance)}
              </p>
              <Button
                variant="outline"
                className="w-full border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
              >
                Save balance
              </Button>
            </form>
          ) : null}

          <ActionButton
            active={expanded === "delete-account"}
            onClick={() => toggle("delete-account")}
          >
            Delete Account
          </ActionButton>
          {expanded === "delete-account" ? (
            <form
              action={deleteAccount}
              onSubmit={(event) => {
                if (
                  !window.confirm(
                    `Delete ${account.name}? This removes the account from the household.`,
                  )
                ) {
                  event.preventDefault();
                }
              }}
              className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-4"
            >
              <input type="hidden" name="account_id" value={account.id} />
              <p className="text-sm leading-6 text-rose-900">
                Delete this account if you no longer need it. Existing linked
                records will remain, but they may lose their account connection.
              </p>
              <Button variant="destructive" className="w-full">
                Confirm delete
              </Button>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}
