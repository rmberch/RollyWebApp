"use client";

import {
  addRecurringExpense,
  deleteRecurringExpense,
  toggleRecurringExpense,
  updateRecurringExpense,
} from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatCurrency,
  formatDate,
  getRecurringFrequencyLabel,
  recurringFrequencies,
  type RecurringExpenseRow,
} from "@/lib/rolly";
import { ChevronDown, ChevronUp, PencilLine, Trash2 } from "lucide-react";
import { useState } from "react";

type RecurringAccount = {
  id: string;
  name: string;
  type: string;
};

function ToggleButton({
  expanded,
  children,
  onClick,
}: {
  expanded: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
        expanded
          ? "border-sky-300 bg-sky-50 text-sky-950"
          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span>{children}</span>
      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );
}

function RecurringForm({
  accounts,
  recurring,
  submitLabel,
  action,
}: {
  accounts: RecurringAccount[];
  recurring?: RecurringExpenseRow;
  submitLabel: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form
      action={action}
      className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
    >
      {recurring ? (
        <>
          <input type="hidden" name="recurring_id" value={recurring.id} />
          <input
            type="hidden"
            name="is_active"
            value={recurring.is_active ? "true" : "false"}
          />
        </>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={recurring ? `recurring-name-${recurring.id}` : "recurring-name"} className="text-slate-900">
          Name
        </Label>
        <Input
          id={recurring ? `recurring-name-${recurring.id}` : "recurring-name"}
          name="name"
          defaultValue={recurring?.name ?? ""}
          className="border-slate-300 bg-white text-slate-950"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={recurring ? `recurring-type-${recurring.id}` : "recurring-type"} className="text-slate-900">
            Kind
          </Label>
          <select
            id={recurring ? `recurring-type-${recurring.id}` : "recurring-type"}
            name="type"
            defaultValue={recurring?.type ?? "bill"}
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value="bill">Bill</option>
            <option value="subscription">Subscription</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={recurring ? `recurring-frequency-${recurring.id}` : "recurring-frequency"} className="text-slate-900">
            Frequency
          </Label>
          <select
            id={recurring ? `recurring-frequency-${recurring.id}` : "recurring-frequency"}
            name="frequency"
            defaultValue={recurring?.frequency ?? "monthly"}
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            {recurringFrequencies.map((frequency) => (
              <option key={frequency} value={frequency}>
                {getRecurringFrequencyLabel(frequency)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={recurring ? `recurring-amount-${recurring.id}` : "recurring-amount"} className="text-slate-900">
            Amount
          </Label>
          <Input
            id={recurring ? `recurring-amount-${recurring.id}` : "recurring-amount"}
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={recurring?.amount ?? ""}
            className="border-slate-300 bg-white text-slate-950"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={recurring ? `recurring-due-${recurring.id}` : "recurring-due"} className="text-slate-900">
            Next due date
          </Label>
          <Input
            id={recurring ? `recurring-due-${recurring.id}` : "recurring-due"}
            name="next_due_date"
            type="date"
            defaultValue={recurring?.next_due_date ?? new Date().toISOString().slice(0, 10)}
            className="border-slate-300 bg-white text-slate-950"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={recurring ? `recurring-account-${recurring.id}` : "recurring-account"} className="text-slate-900">
          Billing account
        </Label>
        <select
          id={recurring ? `recurring-account-${recurring.id}` : "recurring-account"}
          name="account_id"
          defaultValue={recurring?.account_id ?? accounts[0]?.id ?? ""}
          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
          required
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800">
        <input
          type="checkbox"
          name="amount_varies"
          defaultChecked={recurring?.amount_varies ?? false}
          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-300"
        />
        Amount varies
      </label>

      <p className="text-sm text-slate-700">
        Bills and subscriptions can bill to checking, savings, or credit
        accounts. Loan accounts are excluded.
      </p>

      <Button className="w-full bg-slate-950 text-white hover:bg-slate-800">
        {submitLabel}
      </Button>
    </form>
  );
}

export function RecurringSettingsCard({
  recurringExpenses,
  accounts,
}: {
  recurringExpenses: RecurringExpenseRow[];
  accounts: RecurringAccount[];
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <ToggleButton
        expanded={showAddForm}
        onClick={() => setShowAddForm((current) => !current)}
      >
        Add recurring item
      </ToggleButton>
      {showAddForm ? (
        <RecurringForm
          accounts={accounts}
          submitLabel="Save recurring item"
          action={addRecurringExpense}
        />
      ) : null}

      {recurringExpenses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
          No recurring bills or subscriptions yet.
        </div>
      ) : (
        <div className="space-y-3">
          {recurringExpenses.map((recurring) => {
            const isExpanded = expandedItemId === recurring.id;
            const accountName =
              accounts.find((account) => account.id === recurring.account_id)?.name ??
              "Deleted account";

            return (
              <article
                key={recurring.id}
                className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-slate-950">
                        {recurring.name}
                      </h4>
                      <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                        {recurring.type === "bill" ? "Bill" : "Subscription"}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          recurring.is_active
                            ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                            : "border-slate-300 bg-slate-100 text-slate-800"
                        }`}
                      >
                        {recurring.is_active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">
                      {accountName} · {getRecurringFrequencyLabel(recurring.frequency)}
                    </p>
                    <p className="text-sm text-slate-700">
                      Next due {formatDate(recurring.next_due_date)}
                      {recurring.amount_varies ? " · Amount varies" : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-slate-950">
                      {formatCurrency(recurring.amount)}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedItemId((current) =>
                          current === recurring.id ? null : recurring.id,
                        )
                      }
                      className="rounded-full border border-slate-300 p-2 text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <PencilLine className="h-4 w-4" />
                    </button>
                    <form action={toggleRecurringExpense}>
                      <input type="hidden" name="recurring_id" value={recurring.id} />
                      <input
                        type="hidden"
                        name="is_active"
                        value={recurring.is_active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100"
                      >
                        {recurring.is_active ? "Pause" : "Resume"}
                      </button>
                    </form>
                    <form
                      action={deleteRecurringExpense}
                      onSubmit={(event) => {
                        if (!window.confirm(`Delete ${recurring.name}?`)) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="recurring_id" value={recurring.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-rose-300 p-2 text-rose-700 transition-colors hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-4">
                    <RecurringForm
                      accounts={accounts}
                      recurring={recurring}
                      submitLabel="Save changes"
                      action={updateRecurringExpense}
                    />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
