import { createHousehold, joinHousehold } from "@/app/setup/actions";
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
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

type SetupPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

async function SetupContent({ searchParams }: SetupPageProps) {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.household_id) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,122,255,0.16),_transparent_35%),linear-gradient(180deg,#f7fbff_0%,#eef4ff_100%)] px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-700">
            Rolly Setup
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
            Let&apos;s connect this account to a household.
          </h1>
          <p className="text-base text-slate-600">
            {profile?.display_name
              ? `Hi ${profile.display_name}.`
              : "Almost there."}{" "}
            Create a new shared household or join an existing one with an
            invite code.
          </p>
        </div>

        {params.error ? (
          <div className="rounded-2xl border border-rose-200 bg-white/80 px-4 py-3 text-sm text-rose-700 shadow-sm">
            {params.error}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-white/70 bg-white/90 shadow-lg shadow-sky-100 text-slate-950">
            <CardHeader>
              <CardTitle>Create a household</CardTitle>
              <CardDescription>
                Start a new shared space for accounts, expenses, and bills.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createHousehold} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Household name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ryan & Partner"
                    required
                  />
                </div>
                <Button className="w-full text-sky-700">Create household</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/90 shadow-lg shadow-sky-100 text-slate-950">
            <CardHeader>
              <CardTitle>Join with invite code</CardTitle>
              <CardDescription>
                Use the code shared by the person who created the household.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={joinHousehold} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite_code">Invite code</Label>
                  <Input
                    id="invite_code"
                    name="invite_code"
                    placeholder="a1b2c3d4"
                    required
                  />
                </div>
                <Button variant="outline" className="w-full text-sky-100">
                  Join household
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function SetupPage(props: SetupPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef4ff_100%)] px-6 py-10">
          <div className="mx-auto w-full max-w-5xl rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-lg shadow-sky-100">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-700">
              Rolly Setup
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Loading setup...
            </h1>
          </div>
        </main>
      }
    >
      <SetupContent {...props} />
    </Suspense>
  );
}
