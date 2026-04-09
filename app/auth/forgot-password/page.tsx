import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
  return (
    <AuthShell
      eyebrow="Reset Password"
      title="Recover access without leaving the flow."
      description="Enter your email and Rolly will send a reset link so you can get back to your accounts and spending history."
    >
      <div className="mx-auto w-full max-w-md">
        <ForgotPasswordForm />
      </div>
    </AuthShell>
  );
}
