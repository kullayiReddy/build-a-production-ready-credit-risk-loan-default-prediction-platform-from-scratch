import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, BarChart3, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Credit Risk Platform · Loan default prediction" },
      {
        name: "description",
        content:
          "Loan default probability scoring with explainable risk factors, model evaluation and prediction history. Trained on the UCI Statlog German Credit dataset.",
      },
      { property: "og:title", content: "Credit Risk Platform · Loan default prediction" },
      {
        property: "og:description",
        content:
          "Loan default probability scoring with explainable risk factors, model evaluation and prediction history. Trained on the UCI Statlog German Credit dataset.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <ShieldAlert className="size-7" />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          Credit Risk Platform
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Loan default probability scoring with per-prediction explanations, model evaluation and
          prediction history — trained on the public UCI Statlog German Credit dataset.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in to continue
          </Link>
        </div>

        <div className="mt-12 grid w-full gap-4 sm:grid-cols-3">
          <div className="panel p-5 text-left">
            <ShieldAlert className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">Risk scoring</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Default probability and LOW / MEDIUM / HIGH risk band for every applicant.
            </p>
          </div>
          <div className="panel p-5 text-left">
            <Activity className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">Explainability</p>
            <p className="mt-1 text-xs text-muted-foreground">
              SHAP-style factor contributions show what pushes each score up or down.
            </p>
          </div>
          <div className="panel p-5 text-left">
            <BarChart3 className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">Measured performance</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Real test metrics from a held-out split — ROC-AUC 0.771, PR-AUC 0.570.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/80 px-4 py-6 sm:px-6">
        <p className="mx-auto max-w-4xl text-center text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Decision support only.</span> Scores are
          model estimates from a public research dataset — not credit approval decisions, not
          financial advice and not a substitute for regulated credit underwriting.
        </p>
      </footer>
    </div>
  );
}
