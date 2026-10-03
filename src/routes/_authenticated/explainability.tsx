import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell, PageHeader } from "@/components/app-shell";
import { getModelInfo } from "@/lib/credit.functions";

export const Route = createFileRoute("/_authenticated/explainability")({
  head: () => ({
    meta: [
      { title: "Explainability | Credit Risk Platform" },
      {
        name: "description",
        content:
          "Global SHAP feature importance for the champion default-risk model, plus the credit rationale behind every engineered feature.",
      },
      { property: "og:title", content: "Explainability | Credit Risk Platform" },
      {
        property: "og:description",
        content:
          "Which features drive default risk across the portfolio, measured with SHAP on the held-out split.",
      },
    ],
  }),
  component: Explainability,
});

function Explainability() {
  const modelInfoFn = useServerFn(getModelInfo);
  const { data, isLoading } = useQuery({ queryKey: ["model-info"], queryFn: () => modelInfoFn() });

  if (isLoading || !data) {
    return (
      <AppShell>
        <PageHeader title="Explainability" description="Loading measured SHAP importance…" />
      </AppShell>
    );
  }

  const top = data.global_shap_importance.slice(0, 15);

  return (
    <AppShell>
      <PageHeader
        title="Explainability"
        description="Global importance is the mean absolute SHAP value per feature, computed with TreeSHAP on the held-out split during training. Per-applicant factors are shown on the predictor page."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Global feature importance (mean |SHAP|)</h2>
          <div className="mt-4" style={{ height: top.length * 30 + 20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={210}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => value.toFixed(3)}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="importance" fill="var(--chart-1)" radius={4} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">How to read this</h2>
          <ul className="mt-3 space-y-3 text-xs text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Checking-account standing</span> is the
              strongest single driver: an overdrawn or absent account signals cash-flow stress.
            </li>
            <li>
              <span className="font-medium text-foreground">Engineered features matter.</span> Four
              of the top ten — monthly instalment, loan-to-age, utilisation proxy and employment
              stability — are derived, not raw, which is the empirical case for the feature work.
            </li>
            <li>
              <span className="font-medium text-foreground">Importance is not direction.</span> Mean
              absolute SHAP says how much a feature moves the score, not which way; direction is
              per-applicant and shown with each prediction.
            </li>
            <li>
              Per-prediction factors in this app are log-odds path attributions, a fast
              approximation of the exact TreeSHAP values produced by the Python service.
            </li>
          </ul>
        </section>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <header className="border-b border-border/70 px-5 py-4">
          <h2 className="text-sm font-semibold">Feature dictionary</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Every numeric model input and why it could plausibly affect default risk.{" "}
            {data.feature_count} columns reach the model after one-hot encoding.
          </p>
        </header>
        <ul className="divide-y divide-border/50">
          {data.features.map((feature) => (
            <li key={feature.feature} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-6">
              <span className="font-mono text-xs text-primary sm:w-72 sm:shrink-0">
                {feature.feature}
              </span>
              <span className="text-sm text-muted-foreground">{feature.rationale}</span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
