import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, BarChart3, Gauge, History, LogOut, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/predict", label: "Risk predictor", icon: ShieldAlert },
  { to: "/explainability", label: "Explainability", icon: Activity },
  { to: "/performance", label: "Model performance", icon: BarChart3 },
  { to: "/history", label: "History", icon: History },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ShieldAlert className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight">Credit Risk Platform</span>
              <span className="block text-[11px] text-muted-foreground">
                Loan default prediction &amp; explainability
              </span>
            </span>
          </Link>
          <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:overflow-visible lg:pb-0">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-border/80 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-2 text-xs text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Decision support only.</span> Scores are
            model estimates from a public research dataset (UCI Statlog German Credit, 1,000
            applications). They are not credit approval decisions, not financial advice and not a
            substitute for regulated credit underwriting.
          </p>
          <p>
            Trained offline with scikit-learn and XGBoost; probabilities and explanations shown here
            come from the exported champion model, and every reported metric is measured, never
            estimated.
          </p>
        </div>
      </footer>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  aside,
}: {
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {aside}
    </div>
  );
}
