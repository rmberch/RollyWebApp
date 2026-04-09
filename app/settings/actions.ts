"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function updateSpendingLimit(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

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
