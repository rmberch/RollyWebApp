"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/rolly";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type PersonalSpendingMember = {
  id: string;
  display_name: string;
  spent: number;
  remaining: number;
  discretionary_spending_limit: number;
};

export function PersonalSpendingCard({
  members,
}: {
  members: PersonalSpendingMember[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="text-slate-950">Personal spending</CardTitle>
          <CardDescription className="text-slate-700">
            Remaining discretionary spending for each household member this
            cycle.
          </CardDescription>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
            expanded
              ? "border-sky-300 bg-sky-50 text-sky-950"
              : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <span>{expanded ? "Hide member limits" : "Show member limits"}</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </CardHeader>
      {expanded ? (
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm font-semibold text-slate-950">
                {member.display_name}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatCurrency(member.remaining)}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Spent {formatCurrency(member.spent)} of{" "}
                {formatCurrency(member.discretionary_spending_limit)}
              </p>
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}
