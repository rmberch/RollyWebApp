import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function Page() {
  return (
    <AuthShell
      eyebrow="Confirm Email"
      title="One more step and your household is ready."
      description="Use the link in your inbox to confirm your account, then you’ll come right back to finish setup or join a household."
    >
      <div className="mx-auto w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Card className="border-white/80 bg-white/92 shadow-2xl shadow-sky-100">
            <CardHeader>
              <CardTitle className="text-3xl text-slate-950">
                Check your email
              </CardTitle>
              <CardDescription className="text-base text-slate-700">
                Confirm your account to finish setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700">
                We sent a confirmation link to your inbox. Once you open it,
                you&apos;ll come back here and continue with household setup.
              </p>
              <Button
                asChild
                className="mt-4 w-full bg-slate-950 text-white hover:bg-slate-800"
              >
                <Link href="/auth/login">Back to sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthShell>
  );
}
