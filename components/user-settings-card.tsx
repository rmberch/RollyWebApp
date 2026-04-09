"use client";

import { updateDisplayName } from "@/app/settings/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

export function UserSettingsCard({
  displayName,
}: {
  displayName: string | null | undefined;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (key: string) => {
    setExpanded((current) => (current === key ? null : key));
  };

  const logout = async () => {
    if (!window.confirm("Sign out of Rolly on this device?")) {
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  };

  return (
    <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
      <CardHeader>
        <CardTitle className="text-slate-950">User</CardTitle>
        <CardDescription className="text-slate-700">
          Signed in as {displayName?.trim() || "Household member"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            Current display name
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {displayName?.trim() || "Household member"}
          </p>
        </div>

        <div className="space-y-3">
          <ActionButton
            active={expanded === "display-name"}
            onClick={() => toggle("display-name")}
          >
            Update display name
          </ActionButton>
          {expanded === "display-name" ? (
            <form
              action={updateDisplayName}
              className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="space-y-2">
                <Label htmlFor="display_name" className="text-slate-900">
                  Display name
                </Label>
                <Input
                  id="display_name"
                  name="display_name"
                  type="text"
                  defaultValue={displayName ?? ""}
                  placeholder="Ryan"
                  className="border-slate-300 bg-white text-slate-950"
                />
              </div>
              <p className="text-sm text-slate-700">
                Leave blank only if you want the app to fall back to
                &quot;Household member.&quot;
              </p>
              <Button className="w-full bg-slate-950 text-white hover:bg-slate-800">
                Save display name
              </Button>
            </form>
          ) : null}

          <ActionButton
            active={expanded === "sign-out"}
            onClick={() => toggle("sign-out")}
          >
            Sign out
          </ActionButton>
          {expanded === "sign-out" ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                This will sign you out on this device and send you back to the
                sign-in screen.
              </p>
              <Button
                type="button"
                onClick={logout}
                variant="outline"
                className="w-full border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
              >
                Confirm sign out
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
