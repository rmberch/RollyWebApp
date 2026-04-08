import { AuthButton } from "@/components/auth-button";
import { cn } from "@/lib/utils";
import { Home, Landmark, Receipt, Settings } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
];

type AppShellProps = {
  children: ReactNode;
  currentPath: string;
  householdName: string;
  subtitle: string;
};

export function AppShell({
  children,
  currentPath,
  householdName,
  subtitle,
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,122,255,0.18),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#edf3fb_100%)] px-6 py-8 text-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-24">
        <header className="flex flex-col gap-6 rounded-[28px] border border-white/70 bg-white/88 p-6 shadow-xl shadow-sky-100 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-800">
                Rolly
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {householdName}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-700">
                {subtitle}
              </p>
            </div>
            <AuthButton />
          </div>

          <nav className="hidden flex-wrap gap-3 sm:flex">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = currentPath === href;

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-sky-300 bg-sky-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </header>

        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = currentPath === href;

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-sky-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
