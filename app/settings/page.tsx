import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthenticatedAppContext } from "@/lib/app-context";
import { connection } from "next/server";
import { Suspense } from "react";

async function SettingsContent() {
  await connection();
  const { household } = await getAuthenticatedAppContext();

  return (
    <AppShell
      currentPath="/settings"
      householdName={household.name}
      subtitle="Settings will eventually hold account management, recurring expenses, spending limits, and household sharing controls."
    >
      <Card className="border-white/70 bg-white/92 shadow-lg shadow-sky-100">
        <CardHeader>
          <CardTitle className="text-slate-950">Settings placeholder</CardTitle>
          <CardDescription className="text-slate-700">
            This route is in place so the app shell matches the multi-tab shape
            from the migration spec.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          The next meaningful work here will likely be recurring expenses and
          household preferences once the core accounts and expenses flows are
          stable.
        </CardContent>
      </Card>
    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
