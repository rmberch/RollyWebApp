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

  return { supabase, user };
}

export async function updateSpendingLimit(formData: FormData) {
  const { supabase } = await getSupabase();

  const spendingLimitValue = Number(formData.get("spending_limit"));

  if (!Number.isFinite(spendingLimitValue) || spendingLimitValue < 0) {
    redirect("/settings?error=Spending limit must be zero or greater");
  }

  const normalizedLimit = Number(spendingLimitValue.toFixed(2));

  const { error } = await supabase.rpc(
    "update_spending_limit_for_current_user",
    {
      new_spending_limit: normalizedLimit,
    },
  );

  if (error) {
    redirect(
      `/settings?error=${encodeURIComponent(
        error.message || "Unable to update spending limit",
      )}`,
    );
  }

  redirect("/settings?success=Spending%20limit%20updated");
}

export async function updateDisplayName(formData: FormData) {
  const { supabase, user } = await getSupabase();

  const displayName = String(formData.get("display_name") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName || null })
    .eq("id", user.id);

  if (error) {
    redirect(
      `/settings?error=${encodeURIComponent(
        error.message || "Unable to update display name",
      )}`,
    );
  }

  redirect("/settings?success=Profile%20updated");
}

export async function updatePersonalSpendingSettings(formData: FormData) {
  const { supabase } = await getSupabase();

  const personalEnabled = String(formData.get("personal_spending_enabled") ?? "") === "on";
  const memberLimits = Array.from(formData.entries())
    .filter(([key]) => key.startsWith("member_limit_"))
    .map(([key, value]) => {
      const memberId = key.replace("member_limit_", "");
      const numericValue = Number(value ?? 0);

      return {
        member_id: memberId,
        discretionary_spending_limit:
          Number.isFinite(numericValue) && numericValue >= 0
            ? Number(numericValue.toFixed(2))
            : 0,
      };
    });

  const { error } = await supabase.rpc(
    "update_personal_spending_settings_for_current_user",
    {
      personal_enabled: personalEnabled,
      member_limits: memberLimits,
    },
  );

  if (error) {
    redirect(
      `/settings?error=${encodeURIComponent(
        error.message || "Unable to update personal spending settings",
      )}`,
    );
  }

  redirect("/settings?success=Personal%20spending%20settings%20updated");
}

function normalizeDate(value: FormDataEntryValue | null) {
  const date = String(value ?? "").trim();
  return date || getAppDateString();
}

export async function addRecurringExpense(formData: FormData) {
  const { supabase } = await getSupabase();

  const { error } = await supabase.rpc("add_recurring_expense_for_current_user", {
    recurring_name: String(formData.get("name") ?? "").trim(),
    recurring_amount: Number(formData.get("amount") ?? 0),
    recurring_amount_varies:
      String(formData.get("amount_varies") ?? "") === "on",
    recurring_account_id: String(formData.get("account_id") ?? ""),
    recurring_type: String(formData.get("type") ?? "bill"),
    recurring_frequency: String(formData.get("frequency") ?? "monthly"),
    recurring_next_due_date: normalizeDate(formData.get("next_due_date")),
  });

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings?success=Recurring%20item%20saved");
}

export async function updateRecurringExpense(formData: FormData) {
  const { supabase } = await getSupabase();

  const { error } = await supabase.rpc(
    "update_recurring_expense_for_current_user",
    {
      target_recurring_id: String(formData.get("recurring_id") ?? ""),
      recurring_name: String(formData.get("name") ?? "").trim(),
      recurring_amount: Number(formData.get("amount") ?? 0),
      recurring_amount_varies:
        String(formData.get("amount_varies") ?? "") === "on",
      recurring_account_id: String(formData.get("account_id") ?? ""),
      recurring_type: String(formData.get("type") ?? "bill"),
      recurring_frequency: String(formData.get("frequency") ?? "monthly"),
      recurring_next_due_date: normalizeDate(formData.get("next_due_date")),
      recurring_is_active: String(formData.get("is_active") ?? "true") !== "false",
    },
  );

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings?success=Recurring%20item%20updated");
}

export async function deleteRecurringExpense(formData: FormData) {
  const { supabase } = await getSupabase();

  const { error } = await supabase.rpc(
    "delete_recurring_expense_for_current_user",
    {
      target_recurring_id: String(formData.get("recurring_id") ?? ""),
    },
  );

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings?success=Recurring%20item%20deleted");
}

export async function toggleRecurringExpense(formData: FormData) {
  const { supabase } = await getSupabase();

  const { error } = await supabase.rpc(
    "set_recurring_expense_active_for_current_user",
    {
      target_recurring_id: String(formData.get("recurring_id") ?? ""),
      recurring_is_active: String(formData.get("is_active") ?? "true") === "true",
    },
  );

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings?success=Recurring%20item%20updated");
}

export async function updatePaydaySettings(formData: FormData) {
  const { supabase } = await getSupabase();

  const { error } = await supabase.rpc(
    "update_payday_settings_for_current_user",
    {
      payday_next_date: normalizeDate(formData.get("next_payday")),
      payday_schedule: String(formData.get("payday_frequency") ?? ""),
      payday_account_id: String(formData.get("default_payday_account_id") ?? ""),
    },
  );

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings?success=Payday%20settings%20updated");
}

export async function logPayday(formData: FormData) {
  const { supabase } = await getSupabase();

  const { error } = await supabase.rpc("log_payday_for_current_user", {
    pay_amount: Number(formData.get("amount") ?? 0),
    pay_date: normalizeDate(formData.get("pay_date")),
    deposit_account_id: String(formData.get("deposit_account_id") ?? "") || null,
  });

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}
