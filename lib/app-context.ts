import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getAuthenticatedAppContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, household_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.household_id) {
    redirect("/setup");
  }

  const { data: household } = await supabase
    .from("households")
    .select("id, name, invite_code")
    .eq("id", profile.household_id)
    .maybeSingle();

  if (!household) {
    redirect("/setup");
  }

  return {
    supabase,
    user,
    profile,
    household,
  };
}
