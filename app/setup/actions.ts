"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createHousehold(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect("/setup?error=Household name is required");
  }

  const { error } = await supabase.rpc("create_household_for_current_user", {
    household_name: name,
  });

  if (error) {
    redirect(`/setup?error=${encodeURIComponent(error?.message ?? "Unable to create household")}`);
  }

  redirect("/");
}

export async function joinHousehold(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const inviteCode = String(formData.get("invite_code") ?? "")
    .trim()
    .toLowerCase();

  if (!inviteCode) {
    redirect("/setup?error=Invite code is required");
  }

  const { error } = await supabase.rpc("join_household_for_current_user", {
    household_invite_code: inviteCode,
  });

  if (error) {
    redirect(`/setup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}
