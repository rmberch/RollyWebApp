"use client";

import { cn } from "@/lib/utils";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/setup`,
        },
      });
      if (error) throw error;
      router.replace(data.session ? "/setup" : "/auth/sign-up-success");
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-white/80 bg-white/92 shadow-2xl shadow-sky-100">
        <CardHeader>
          <CardTitle className="text-3xl text-slate-950">Create account</CardTitle>
          <CardDescription className="text-base text-slate-700">
            Start with your display name so your household can recognize you
            right away.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="display-name" className="text-slate-900">
                  Display name
                </Label>
                <Input
                  id="display-name"
                  type="text"
                  placeholder="Ryan"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="border-slate-300 bg-white text-slate-950"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-900">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-slate-300 bg-white text-slate-950"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password" className="text-slate-900">
                    Password
                  </Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-slate-300 bg-white text-slate-950"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password" className="text-slate-900">
                    Repeat password
                  </Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="border-slate-300 bg-white text-slate-950"
                />
              </div>
              {error ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                className="w-full bg-slate-950 text-white hover:bg-slate-800"
                disabled={isLoading}
              >
                {isLoading ? "Creating an account..." : "Create account"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm text-slate-700">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-sky-800 underline underline-offset-4"
              >
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
