import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <AuthShell
      eyebrow="Sign In"
      title="Bring your household budget back into focus."
      description="Sign in to review balances, upcoming payments, and monthly spending from the same shared workspace."
    >
      <div className="mx-auto w-full max-w-md">
        <LoginForm />
      </div>
    </AuthShell>
  );
}
