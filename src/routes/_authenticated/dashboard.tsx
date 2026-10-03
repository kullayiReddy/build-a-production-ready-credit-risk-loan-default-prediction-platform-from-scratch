import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { AppShell, PageHeader } from "@/components/app-shell";
import { RiskBadge, StatCard } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { getModelInfo } from "@/lib/credit.functions";
import { percent, predictionsQuery, summarise } from "@/lib/predictions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Credit Risk Dashboard | Loan Default Prediction" },
      {
        name: "description",
        content:
          "Portfolio overview of scored loan applications: volume, high-risk share, measured model ROC-AUC and the latest predictions.",
      },
      { property: "og:title", content: "Credit Risk Dashboard | Loan Default Prediction" },
      {
        property: "og:description",
        content:
          "Portfolio overview of scored loan applications: volume, high-risk share and measured model performance.",
      },
    ],
  }),
  component: Dashboard,
});

const RISK_FILLS: Record<string, string> = {
  LOW: "var(--risk-low)",
  MEDIUM: "var(--risk-medium)",
  HIGH: "var(--risk-high)",
};

function Dashboard() {
  const modelInfoFn = useServerFn(getModelInfo);
  const model = useQuery({ queryKey: ["model-info"], queryFn: () => modelInfoFn() });
  const predictions = useQuery(predictionsQuery(200));

  const rows = predictions.data ?? [];
  const stats = summarise(rows);
  const distribution = (["LOW", "MEDIUM", "HIGH"] as const)
    .map((category) => ({ name: category, value: stats.counts[category] ?? 0 }))
    .filter((entry) => entry.value > 0);

  return (
    <AppShell>
      <PageHeader
        title="Portfolio risk overview"
        description="Every application scored by this platform is stored with its probability, risk band and contributing factors. Model metrics are the measured hold-out results of the champion model, not targets."
        aside={
          <Button asChild>
            <Link to="/predict">
              Score an application <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Predictions stored"
          value={predictions.isLoading ? "—" : String(stats.total)}
          hint="Applications scored and persisted"
        />
        <StatCard
          label="High-risk share"
          value={stats.total ? percent(stats.highRiskShare, 0) : "—"}
          hint="Scored at 60% default probability or above"
        />
        <StatCard
          label="Average probability"
          value={stats.total ? percent(stats.averageProbability) : "—"}
          hint="Mean estimated default probability"
        />
        <StatCard
          label="Model ROC-AUC (test)"
          value={model.data ? model.data.test_metrics.roc_auc.toFixed(3) : "—"}
          hint={model.data ? `${model.data.champion} · ${model.data.model_version}` : "Loading"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="panel overflow-hidden">
          <header className="flex items-center justify-between border-b border-border/70 px-5 py-4">
            <h2 className="text-sm font-semibold">Recent predictions</h2>
            <Link to="/history" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </header>
          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              {predictions.isLoading
                ? "Loading predictions…"
                : "No predictions yet — score an application to populate the portfolio."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="label-caps border-b border-border/70 text-left">
                    <th className="px-5 py-3 font-semibold">When</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Term</th>
                    <th className="px-5 py-3 font-semibold">Probability</th>
                    <th className="px-5 py-3 font-semibold">Band</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((row) => (
                    <tr key={row.id} className="border-b border-border/40 last:border-0">
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 font-mono">
                        {row.applicant_input?.credit_amount?.toLocaleString() ?? "—"} DM
                      </td>
                      <td className="px-5 py-3 font-mono">
                        {row.applicant_input?.duration_months ?? "—"} mo
                      </td>
                      <td className="px-5 py-3 font-mono">{percent(row.default_probability)}</td>
                      <td className="px-5 py-3">
                        <RiskBadge category={row.risk_category} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Risk distribution</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Bands: LOW below 30%, MEDIUM 30–60%, HIGH from 60%.
          </p>
          {distribution.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Nothing scored yet.</p>
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      stroke="var(--card)"
                    >
                      {distribution.map((entry) => (
                        <Cell key={entry.name} fill={RISK_FILLS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-2 text-sm">
                {(["LOW", "MEDIUM", "HIGH"] as const).map((category) => (
                  <li key={category} className="flex items-center justify-between">
                    <RiskBadge category={category} />
                    <span className="font-mono text-muted-foreground">
                      {stats.counts[category] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {model.data ? (
        <section className="panel mt-6 p-5">
          <h2 className="text-sm font-semibold">Model in production</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Champion", model.data.champion],
              ["Version", model.data.model_version],
              ["Dataset", model.data.dataset],
              [
                "Split",
                `${model.data.split.train} / ${model.data.split.validation} / ${model.data.split.test}`,
              ],
              ["Features after encoding", String(model.data.feature_count)],
              ["Default rate in data", percent(model.data.data_quality.default_rate, 0)],
              ["Test PR-AUC", model.data.test_metrics.pr_auc.toFixed(3)],
              ["Test recall", model.data.test_metrics.recall.toFixed(3)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="label-caps">{label}</dt>
                <dd className="mt-1 font-mono text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </AppShell>
  );
}
