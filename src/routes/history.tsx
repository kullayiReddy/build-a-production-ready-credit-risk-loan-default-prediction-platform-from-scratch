import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { percent, predictionsQuery } from "@/lib/predictions";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Prediction History | Credit Risk Platform" },
      {
        name: "description",
        content:
          "Audit trail of every scored loan application: inputs, default probability, risk band, model version and timestamp.",
      },
      { property: "og:title", content: "Prediction History | Credit Risk Platform" },
      {
        property: "og:description",
        content: "Audit trail of scored loan applications with probabilities and model versions.",
      },
    ],
  }),
  component: HistoryPage,
});

const BANDS = ["ALL", "LOW", "MEDIUM", "HIGH"] as const;

function HistoryPage() {
  const predictions = useQuery(predictionsQuery(200));
  const [band, setBand] = useState<(typeof BANDS)[number]>("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = (predictions.data ?? []).filter(
    (row) => band === "ALL" || row.risk_category === band,
  );

  return (
    <AppShell>
      <PageHeader
        title="Prediction history"
        description="Each scored application is stored with its inputs, probability, risk band and the model version that produced it — the audit trail a credit-risk process needs. No names or identifiers are collected."
        aside={
          <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
            {BANDS.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={band === option ? "secondary" : "ghost"}
                onClick={() => setBand(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        }
      />

      <section className="panel overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-muted-foreground">
            {predictions.isLoading ? "Loading…" : "No predictions recorded for this filter."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label-caps border-b border-border/70 text-left">
                  <th className="px-5 py-3 font-semibold">Timestamp</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Term</th>
                  <th className="px-5 py-3 font-semibold">Purpose</th>
                  <th className="px-5 py-3 font-semibold">Probability</th>
                  <th className="px-5 py-3 font-semibold">Class</th>
                  <th className="px-5 py-3 font-semibold">Band</th>
                  <th className="px-5 py-3 font-semibold">Model</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Fragment key={row.id}>
                    <tr className="border-b border-border/40">
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 font-mono">
                        {row.applicant_input?.credit_amount?.toLocaleString() ?? "—"} DM
                      </td>
                      <td className="px-5 py-3 font-mono">
                        {row.applicant_input?.duration_months ?? "—"} mo
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {row.applicant_input?.purpose?.replace(/_/g, " ") ?? "—"}
                      </td>
                      <td className="px-5 py-3 font-mono">{percent(row.default_probability)}</td>
                      <td className="px-5 py-3 font-mono">{row.prediction}</td>
                      <td className="px-5 py-3">
                        <RiskBadge category={row.risk_category} />
                      </td>
                      <td className="px-5 py-3 font-mono text-muted-foreground">
                        {row.model_version_label}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                        >
                          {expanded === row.id ? "Hide" : "Factors"}
                        </Button>
                      </td>
                    </tr>
                    {expanded === row.id ? (
                      <tr className="border-b border-border/40 bg-secondary/30">
                        <td colSpan={9} className="px-5 py-4">
                          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {(row.explanation ?? []).map((item) => (
                              <li
                                key={item.feature}
                                className="rounded-md border border-border/60 bg-card px-3 py-2"
                              >
                                <p className="font-mono text-xs">{item.feature}</p>
                                <p
                                  className={
                                    item.direction === "increases_risk"
                                      ? "text-xs text-risk-high"
                                      : "text-xs text-risk-low"
                                  }
                                >
                                  {item.impact > 0 ? "+" : ""}
                                  {item.impact.toFixed(3)} log-odds
                                </p>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
