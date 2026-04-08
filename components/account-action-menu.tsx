"use client";

import {
  deleteAccount,
  renameAccount,
  setAccountPaymentDue,
  updateAccountBalance,
} from "@/app/accounts/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, type AccountRow } from "@/lib/rolly";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type AccountActionMenuProps = {
  account: AccountRow;
  supportsPaymentDue: boolean;
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
      {active ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );
}

function PlaceholderPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
      <p className="font-medium text-slate-950">{title}</p>
      <p className="mt-2">{body}</p>
    </div>
  );
}

export function AccountActionMenu({
  account,
  supportsPaymentDue,
}: AccountActionMenuProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (key: string) => {
    setExpanded((current) => (current === key ? null : key));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-white/70 bg-white/92 p-6 shadow-lg shadow-sky-100">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-950">
            Account actions
          </h3>
          <p className="text-sm text-slate-700">
            Common account tasks stay at the top and expand only when you need
            them.
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
                <form action={setAccountPaymentDue} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
                      defaultValue={account.payment_amount ?? account.current_balance}
                      className="border-slate-300 bg-white text-slate-950"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_due_date" className="text-slate-900">
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
                <PlaceholderPanel
                  title="Schedule Payment"
                  body="This is the next payment flow to implement. It will let you choose a source account, amount, and payment date from this detail view."
                />
              ) : null}

              <ActionButton
                active={expanded === "make-payment"}
                onClick={() => toggle("make-payment")}
              >
                Make Payment
              </ActionButton>
              {expanded === "make-payment" ? (
                <PlaceholderPanel
                  title="Make Payment"
                  body="This action is queued next as well. It will support one-off payments or contributions directly from the account detail screen."
                />
              ) : null}
            </>
          ) : (
            <>
              <ActionButton
                active={expanded === "make-payment"}
                onClick={() => toggle("make-payment")}
              >
                Make Payment
              </ActionButton>
              {expanded === "make-payment" ? (
                <PlaceholderPanel
                  title="Make Payment"
                  body="For checking and savings accounts this will become the one-off contribution flow. It is planned for the next account-actions pass."
                />
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className="rounded-[24px] border border-white/70 bg-white/92 p-6 shadow-lg shadow-sky-100">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-950">Maintenance</h3>
          <p className="text-sm text-slate-700">
            Less common actions live here so they stay available without taking
            over the page.
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
            <form action={renameAccount} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
            <form action={updateAccountBalance} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
