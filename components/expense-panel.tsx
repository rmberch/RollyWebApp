"use client";

import { addExpense, deleteExpense, updateExpense } from "@/app/expenses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTransactionAmount } from "@/lib/rolly";
import { ChevronDown, ChevronUp, PencilLine, Trash2 } from "lucide-react";
import { useState } from "react";

type ExpenseAccount = {
  id: string;
  name: string;
  type: string;
};

type ExpenseRow = {
  id: string;
  name: string;
  amount: number;
  date: string;
  is_tracked: boolean;
  account_id: string | null;
  account_name: string | null;
  source: string;
};

type ExpensePanelProps = {
  accounts: ExpenseAccount[];
  trackedExpenses: ExpenseRow[];
  billExpenses: ExpenseRow[];
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

function ExpenseForm({
  accounts,
  expense,
  onSubmitAction,
  submitLabel,
}: {
  accounts: ExpenseAccount[];
  expense?: ExpenseRow;
  onSubmitAction: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={onSubmitAction} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      {expense ? <input type="hidden" name="expense_id" value={expense.id} /> : null}
      <div className="space-y-2">
        <Label htmlFor={expense ? `name-${expense.id}` : "name"} className="text-slate-900">
          Name
        </Label>
        <Input
          id={expense ? `name-${expense.id}` : "name"}
          name="name"
          defaultValue={expense?.name ?? ""}
          className="border-slate-300 bg-white text-slate-950"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={expense ? `amount-${expense.id}` : "amount"} className="text-slate-900">
          Amount
        </Label>
        <Input
          id={expense ? `amount-${expense.id}` : "amount"}
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={expense?.amount ?? ""}
          className="border-slate-300 bg-white text-slate-950"
          required
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor={expense ? `entry-type-${expense.id}` : "entry-type"}
          className="text-slate-900"
        >
          Entry type
        </Label>
        <select
          id={expense ? `entry-type-${expense.id}` : "entry-type"}
          name="entry_type"
          defaultValue={expense ? (expense.is_tracked ? "expense" : "bill") : "expense"}
          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
        >
          <option value="expense">Expense</option>
          <option value="bill">Bill</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={expense ? `account-${expense.id}` : "account"} className="text-slate-900">
          Method
        </Label>
        <select
          id={expense ? `account-${expense.id}` : "account"}
          name="account_id"
          defaultValue={expense?.account_id ?? accounts[0]?.id ?? ""}
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
      <div className="space-y-2">
        <Label htmlFor={expense ? `date-${expense.id}` : "date"} className="text-slate-900">
          Date
        </Label>
        <Input
          id={expense ? `date-${expense.id}` : "date"}
          name="date"
          type="date"
          defaultValue={expense?.date ?? new Date().toISOString().slice(0, 10)}
          className="border-slate-300 bg-white text-slate-950"
          required
        />
      </div>
      <Button className="w-full bg-sky-600 text-white hover:bg-sky-700">
        {submitLabel}
      </Button>
    </form>
  );
}

function ExpenseList({
  title,
  emptyText,
  expenses,
  accounts,
}: {
  title: string;
  emptyText: string;
  expenses: ExpenseRow[];
  accounts: ExpenseAccount[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
          {expenses.length}
        </span>
      </div>

      {expenses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => {
            const isExpanded = expanded === expense.id;

            return (
              <article
                key={expense.id}
                className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-slate-950">
                        {expense.name}
                      </h4>
                      <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                        {expense.account_name ?? "Deleted account"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{expense.date}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-slate-950">
                      {formatTransactionAmount(expense.amount)}
                    </p>
                    {expense.source === "manual" ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((current) =>
                              current === expense.id ? null : expense.id,
                            )
                          }
                          className="rounded-full border border-slate-300 p-2 text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          <PencilLine className="h-4 w-4" />
                        </button>
                        <form
                          action={deleteExpense}
                          onSubmit={(event) => {
                            if (
                              !window.confirm(
                                `Delete ${expense.name}? This will reverse its balance effect.`,
                              )
                            ) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="expense_id" value={expense.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-rose-300 p-2 text-rose-700 transition-colors hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </div>

                {isExpanded && expense.source === "manual" ? (
                  <div className="mt-4">
                    <ExpenseForm
                      accounts={accounts}
                      expense={expense}
                      onSubmitAction={updateExpense}
                      submitLabel="Save changes"
                    />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ExpensePanel({
  accounts,
  trackedExpenses,
  billExpenses,
}: ExpensePanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-white/70 bg-white/92 p-6 shadow-lg shadow-sky-100">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-950">Expense actions</h3>
          <p className="text-sm text-slate-700">
            Add manual expenses or one-off bills now, then edit or delete
            entries with balance reversal built in.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <ToggleButton
            expanded={showAddForm}
            onClick={() => setShowAddForm((current) => !current)}
          >
            Add transaction
          </ToggleButton>
          {showAddForm ? (
            <ExpenseForm
              accounts={accounts}
              onSubmitAction={addExpense}
              submitLabel="Save expense"
            />
          ) : null}
        </div>
      </section>

      <ExpenseList
        title="Bills"
        emptyText="Bills generated from recurring logic will appear here."
        expenses={billExpenses}
        accounts={accounts}
      />

      <ExpenseList
        title="Expenses"
        emptyText="No tracked expenses yet."
        expenses={trackedExpenses}
        accounts={accounts}
      />
    </div>
  );
}
