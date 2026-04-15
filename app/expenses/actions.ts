"use server";

import { getAppDateString } from "@/lib/rolly";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function getSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return supabase;
}

function normalizeDate(value: FormDataEntryValue | null) {
  const date = String(value ?? "").trim();
  return date || getAppDateString();
}

export async function addExpense(formData: FormData) {
  const supabase = await getSupabase();

  const name = String(formData.get("name") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const accountId = String(formData.get("account_id") ?? "");
  const date = normalizeDate(formData.get("date"));
  const isTracked = String(formData.get("entry_type") ?? "expense") !== "bill";
  const isPersonalExpense =
    isTracked && String(formData.get("is_personal_expense") ?? "") === "on";
  const personalProfileId = isPersonalExpense
    ? String(formData.get("personal_profile_id") ?? "").trim() || null
    : null;

  const { error } = await supabase.rpc("add_expense_for_current_user", {
    expense_name: name,
    expense_amount: amount,
    expense_account_id: accountId,
    expense_date: date,
    expense_is_tracked: isTracked,
    expense_personal_profile_id: personalProfileId,
  });

  if (error) {
    redirect(`/expenses?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/expenses");
}

export async function updateExpense(formData: FormData) {
  const supabase = await getSupabase();

  const expenseId = String(formData.get("expense_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const accountId = String(formData.get("account_id") ?? "");
  const date = normalizeDate(formData.get("date"));
  const isTracked = String(formData.get("entry_type") ?? "expense") !== "bill";
  const isPersonalExpense =
    isTracked && String(formData.get("is_personal_expense") ?? "") === "on";
  const personalProfileId = isPersonalExpense
    ? String(formData.get("personal_profile_id") ?? "").trim() || null
    : null;

  const { error } = await supabase.rpc("update_expense_for_current_user", {
    target_expense_id: expenseId,
    expense_name: name,
    expense_amount: amount,
    expense_account_id: accountId,
    expense_date: date,
    expense_is_tracked: isTracked,
    expense_personal_profile_id: personalProfileId,
  });

  if (error) {
    redirect(`/expenses?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/expenses");
}

export async function deleteExpense(formData: FormData) {
  const supabase = await getSupabase();
  const expenseId = String(formData.get("expense_id") ?? "");

  const { error } = await supabase.rpc("delete_expense_for_current_user", {
    target_expense_id: expenseId,
  });

  if (error) {
    redirect(`/expenses?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/expenses");
}
