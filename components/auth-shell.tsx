import Link from "next/link";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#eef6ff_45%,_#f8fafc_100%)] px-6 py-10">
      <div className="absolute inset-0 opacity-80">
        <div className="absolute left-[-8rem] top-[-7rem] h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute bottom-[-6rem] right-[-5rem] h-56 w-56 rounded-full bg-cyan-200/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-[0.95fr,1.05fr] lg:items-center">
          <div className="space-y-6">
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-sky-200 bg-white/85 px-4 py-2 text-sm font-medium text-sky-900 shadow-sm"
            >
              Rolly
            </Link>
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">
                {eyebrow}
              </p>
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                {title}
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-700">
                {description}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Households
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Shared budgets, invite codes, and side-by-side visibility.
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Accounts
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Credit, loan, savings, and checking flows in one place.
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Clarity
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Payment and contribution history stays easy to follow.
                </p>
              </div>
            </div>
          </div>

          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
