import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell, PageHeader } from "@/components/app-shell";
import { StatCard } from "@/components/risk-badge";
import { getModelInfo } from "@/lib/credit.functions";
import { percent } from "@/lib/predictions";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Model Performance | Credit Risk Platform" },
      {
        name: "description",
        content:
          "Measured hold-out metrics, ROC curve, confusion matrix and the validation leaderboard used to select the champion model.",
      },
      { property: "og:title", content: "Model Performance | Credit Risk Platform" },
      {
        property: "og:description",
        content:
          "Hold-out ROC-AUC, PR-AUC, confusion matrix and the model comparison behind the champion selection.",
      },
    ],
  }),
  component: Performance,
});

function Performance() {
  const modelInfoFn = useServerFn(getModelInfo);
  const { data, isLoading } = useQuery({ queryKey: ["model-info"], queryFn: () => modelInfoFn() });

  if (isLoading || !data) {
    return (
      <AppShell>
        <PageHeader title="Model performance" description="Loading measured metrics…" />
      </AppShell>
    );
  }

  const m = data.test_metrics;
  const cm = m.confusion_matrix;
  const rocData = m.roc_curve.filter((_, index) => index % 2 === 0);

  return (
    <AppShell>
      <PageHeader
        title="Model performance"
        description={`All figures below are measured on the held-out test split (${data.split.test} applications), evaluated once after model selection. Nothing here is estimated or targeted.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="ROC-AUC" value={m.roc_auc.toFixed(4)} hint="Ranking quality" />
        <StatCard label="PR-AUC" value={m.pr_auc.toFixed(4)} hint="Minority-class quality" />
        <StatCard label="Recall" value={m.recall.toFixed(4)} hint="Share of defaults caught" />
        <StatCard label="Precision" value={m.precision.toFixed(4)} hint="Flagged that default" />
        <StatCard label="F1" value={m.f1.toFixed(4)} hint="Precision/recall balance" />
        <StatCard label="Accuracy" value={m.accuracy.toFixed(4)} hint="Majority baseline is 0.70" />
        <StatCard label="Brier score" value={m.brier_score.toFixed(4)} hint="Lower is better" />
        <StatCard
          label="Threshold"
          value={m.threshold.toFixed(2)}
          hint="Cut-off for the reported class"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-sm font-semibold">ROC curve (test split)</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rocData} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="fpr"
                  type="number"
                  domain={[0, 1]}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <YAxis
                  dataKey="tpr"
                  type="number"
                  domain={[0, 1]}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v: number) => v.toFixed(1)}
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
                <Line
                  type="monotone"
                  dataKey="tpr"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Area under this curve is {m.roc_auc.toFixed(3)}; a coin flip would score 0.5.
          </p>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Confusion matrix</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            At a {m.threshold.toFixed(2)} cut-off. Missing a default (bottom left) is the expensive
            error, which is why selection favoured recall-aware metrics.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ["True negative", cm.true_negative, "Repaid, predicted repaid"],
              ["False positive", cm.false_positive, "Repaid, flagged as default"],
              ["False negative", cm.false_negative, "Default, missed"],
              ["True positive", cm.true_positive, "Default, caught"],
            ].map(([label, value, hint]) => (
              <div key={label as string} className="rounded-lg border border-border/60 p-4">
                <p className="label-caps">{label}</p>
                <p className="stat-value mt-1">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Recall of {percent(m.recall)} means roughly {percent(1 - m.recall)} of true defaults are
            not flagged at this threshold.
          </p>
        </section>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <header className="border-b border-border/70 px-5 py-4">
          <h2 className="text-sm font-semibold">Model comparison (validation split)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Every candidate was trained with and without class weighting. The champion was selected
            on validation PR-AUC — not accuracy, which a majority-class baseline already reaches at
            0.70.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="label-caps border-b border-border/70 text-left">
                <th className="px-5 py-3 font-semibold">Model</th>
                <th className="px-5 py-3 font-semibold">Weighted</th>
                <th className="px-5 py-3 font-semibold">ROC-AUC</th>
                <th className="px-5 py-3 font-semibold">PR-AUC</th>
                <th className="px-5 py-3 font-semibold">Precision</th>
                <th className="px-5 py-3 font-semibold">Recall</th>
                <th className="px-5 py-3 font-semibold">F1</th>
                <th className="px-5 py-3 font-semibold">Train time</th>
              </tr>
            </thead>
            <tbody>
              {data.validation_leaderboard.map((row) => {
                const champion = row.candidate === data.champion;
                return (
                  <tr
                    key={row.candidate}
                    className={
                      champion
                        ? "border-b border-border/40 bg-primary/10"
                        : "border-b border-border/40"
                    }
                  >
                    <td className="px-5 py-3">
                      {row.model.replace(/_/g, " ")}
                      {champion ? (
                        <span className="ml-2 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          CHAMPION
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {row.class_weighted ? "yes" : "no"}
                    </td>
                    <td className="px-5 py-3 font-mono">{row.roc_auc.toFixed(4)}</td>
                    <td className="px-5 py-3 font-mono">{row.pr_auc.toFixed(4)}</td>
                    <td className="px-5 py-3 font-mono">{row.precision.toFixed(3)}</td>
                    <td className="px-5 py-3 font-mono">{row.recall.toFixed(3)}</td>
                    <td className="px-5 py-3 font-mono">{row.f1.toFixed(3)}</td>
                    <td className="px-5 py-3 font-mono text-muted-foreground">
                      {row.training_time_seconds.toFixed(2)}s
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel mt-6 p-5">
        <h2 className="text-sm font-semibold">Data quality &amp; class imbalance</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Rows", String(data.data_quality.rows)],
            ["Duplicate rows", String(data.data_quality.duplicate_rows)],
            ["Default rate", percent(data.data_quality.default_rate, 0)],
            ["Imbalance ratio", `${data.data_quality.imbalance_ratio.toFixed(2)} : 1`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="label-caps">{label}</dt>
              <dd className="mt-1 font-mono">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Honest caveats: test performance sits below validation performance (ROC-AUC{" "}
          {m.roc_auc.toFixed(3)} against 0.822 on validation) — with {data.split.test} test rows the
          standard error is large. Class weighting also inflates probabilities, so the Brier score of{" "}
          {m.brier_score.toFixed(3)} shows the ranking is more trustworthy than the absolute
          percentages.
        </p>
      </section>
    </AppShell>
  );
}
