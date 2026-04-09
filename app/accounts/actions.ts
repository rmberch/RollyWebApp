"use server";

import { createClient } from "@/lib/supabase/server";
import { accountTypes, type AccountType } from "@/lib/rolly";
import { redirect } from "next/navigation";

function isAccountType(value: string): value is AccountType {
  return accountTypes.includes(value as AccountType);
}

async function getHouseholdId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.household_id) {
    redirect("/setup");
  }

  return { supabase, householdId: profile.household_id };
}

export async function addAccount(formData: FormData) {
  const { supabase, householdId } = await getHouseholdId();

  const name = String(formData.get("name") ?? "").trim();
  const typeValue = String(formData.get("type") ?? "");
  const balanceValue = Number(formData.get("current_balance") ?? 0);
  const wantsPrimary = formData.get("is_primary") === "on";

  if (!name) {
    redirect("/accounts?error=Account name is required");
  }

  if (!isAccountType(typeValue)) {
    redirect("/accounts?error=Invalid account type");
  }

  if (!Number.isFinite(balanceValue)) {
    redirect("/accounts?error=Balance must be a valid number");
  }

  const { count } = await supabase
    .from("accounts")
    .select("*", { count: "exact", head: true })
    .eq("household_id", householdId);

  const isPrimary = wantsPrimary || (count ?? 0) === 0;

  if (isPrimary) {
    await supabase
      .from("accounts")
      .update({ is_primary: false })
      .eq("household_id", householdId);
  }

  const { error } = await supabase.from("accounts").insert({
    household_id: householdId,
    name,
    type: typeValue,
    current_balance: balanceValue,
    initial_balance: balanceValue,
    is_primary: isPrimary,
  });

  if (error) {
    redirect(`/accounts?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/accounts");
}

export async function setPrimaryAccount(formData: FormData) {
  const { supabase, householdId } = await getHouseholdId();
  const accountId = String(formData.get("account_id") ?? "");

  if (!accountId) {
    redirect("/accounts?error=Account not found");
  }

  await supabase
    .from("accounts")
    .update({ is_primary: false })
    .eq("household_id", householdId);

  const { error } = await supabase
    .from("accounts")
    .update({ is_primary: true })
    .eq("household_id", householdId)
    .eq("id", accountId);

  if (error) {
    redirect(`/accounts?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/accounts");
}

export async function updateAccountBalance(formData: FormData) {
  const { supabase, householdId } = await getHouseholdId();
  const accountId = String(formData.get("account_id") ?? "");
  const nextBalance = Number(formData.get("current_balance") ?? 0);

  if (!accountId) {
    redirect("/accounts?error=Account not found");
  }

  if (!Number.isFinite(nextBalance) || nextBalance < 0) {
    redirect(`/accounts/${accountId}?error=Balance must be zero or greater`);
  }

  const { error } = await supabase
    .from("accounts")
    .update({ current_balance: nextBalance })
    .eq("household_id", householdId)
    .eq("id", accountId);

  if (error) {
    redirect(`/accounts/${accountId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/accounts/${accountId}`);
}

export async function setAccountPaymentDue(formData: FormData) {
  const { supabase, householdId } = await getHouseholdId();
  const accountId = String(formData.get("account_id") ?? "");
  const paymentAmount = Number(formData.get("payment_amount") ?? 0);
  const paymentDueDate = String(formData.get("payment_due_date") ?? "");

  if (!accountId) {
    redirect("/accounts?error=Account not found");
  }

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    redirect(`/accounts/${accountId}?error=Payment amount must be greater than zero`);
  }

  if (!paymentDueDate) {
    redirect(`/accounts/${accountId}?error=Due date is required`);
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("type")
    .eq("household_id", householdId)
    .eq("id", accountId)
    .maybeSingle();

  if (!account || !["credit", "loan"].includes(account.type)) {
    redirect(`/accounts/${accountId}?error=Payment due is only available for credit and loan accounts`);
  }

  const { error } = await supabase
    .from("accounts")
    .update({
      has_payment_due: true,
      payment_amount: paymentAmount,
      payment_due_date: paymentDueDate,
    })
    .eq("household_id", householdId)
    .eq("id", accountId);

  if (error) {
    redirect(`/accounts/${accountId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/accounts/${accountId}`);
}

export async function renameAccount(formData: FormData) {
  const { supabase, householdId } = await getHouseholdId();
  const accountId = String(formData.get("account_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!accountId) {
    redirect("/accounts?error=Account not found");
  }

  if (!name) {
    redirect(`/accounts/${accountId}?error=Account name is required`);
  }

  const { error } = await supabase
    .from("accounts")
    .update({ name })
    .eq("household_id", householdId)
    .eq("id", accountId);

  if (error) {
    redirect(`/accounts/${accountId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/accounts/${accountId}`);
}

export async function deleteAccount(formData: FormData) {
  const { supabase, householdId } = await getHouseholdId();
  const accountId = String(formData.get("account_id") ?? "");

  if (!accountId) {
    redirect("/accounts?error=Account not found");
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("id, is_primary")
    .eq("household_id", householdId)
    .eq("id", accountId)
    .maybeSingle();

  if (!account) {
    redirect("/accounts?error=Account not found");
  }

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("household_id", householdId)
    .eq("id", accountId);

  if (error) {
    redirect(`/accounts/${accountId}?error=${encodeURIComponent(error.message)}`);
  }

  if (account.is_primary) {
    const { data: nextPrimary } = await supabase
      .from("accounts")
      .select("id")
      .eq("household_id", householdId)
      .limit(1)
      .maybeSingle();

    if (nextPrimary) {
      await supabase
        .from("accounts")
        .update({ is_primary: true })
        .eq("household_id", householdId)
        .eq("id", nextPrimary.id);
    }
  }

  redirect("/accounts");
}

export async function makeAccountPayment(formData: FormData) {
  const { supabase } = await getHouseholdId();
  const destAccountId = String(formData.get("dest_account_id") ?? "");
  const sourceAccountId = String(formData.get("source_account_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const date = String(formData.get("date") ?? "").trim() || new Date().toISOString().slice(0, 10);

  const { error } = await supabase.rpc("make_account_payment_for_current_user", {
    dest_account_id: destAccountId,
    source_account_id: sourceAccountId,
    payment_amount: amount,
    payment_date: date,
  });

  if (error) {
    redirect(`/accounts/${destAccountId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/accounts/${destAccountId}`);
}

export async function makeAccountContribution(formData: FormData) {
  const { supabase } = await getHouseholdId();
  const destAccountId = String(formData.get("dest_account_id") ?? "");
  const sourceAccountId = String(formData.get("source_account_id") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const date = String(formData.get("date") ?? "").trim() || new Date().toISOString().slice(0, 10);
  const title = String(formData.get("title") ?? "").trim();

  const { error } = await supabase.rpc("make_account_contribution_for_current_user", {
    dest_account_id: destAccountId,
    source_account_id: sourceAccountId || null,
    contribution_amount: amount,
    contribution_date: date,
    contribution_title: sourceAccountId ? null : title,
  });

  if (error) {
    redirect(`/accounts/${destAccountId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/accounts/${destAccountId}`);
}

export async function scheduleAccountPayment(formData: FormData) {
  const { supabase } = await getHouseholdId();
  const destAccountId = String(formData.get("dest_account_id") ?? "");
  const sourceAccountId = String(formData.get("source_account_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const scheduledDate =
    String(formData.get("scheduled_date") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  const { error } = await supabase.rpc("schedule_payment_for_current_user", {
    dest_account_id: destAccountId,
    source_account_id: sourceAccountId,
    payment_amount: amount,
    scheduled_for: scheduledDate,
  });

  if (error) {
    redirect(`/accounts/${destAccountId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/accounts/${destAccountId}`);
}

export async function cancelScheduledPayment(formData: FormData) {
  const { supabase } = await getHouseholdId();
  const paymentId = String(formData.get("payment_id") ?? "");
  const accountId = String(formData.get("account_id") ?? "");

  const { error } = await supabase.rpc("cancel_scheduled_payment_for_current_user", {
    target_payment_id: paymentId,
  });

  if (error) {
    redirect(`/accounts/${accountId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/accounts/${accountId}`);
}
