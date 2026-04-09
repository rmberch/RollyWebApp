import { AuthShell } from "@/components/auth-shell";
import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <AuthShell
      eyebrow="Create Account"
      title="Start your web household in a familiar rhythm."
      description="Create your account, choose the display name your household will see, and then move straight into create-or-join setup."
    >
      <div className="mx-auto w-full max-w-md">
        <SignUpForm />
      </div>
    </AuthShell>
  );
}
