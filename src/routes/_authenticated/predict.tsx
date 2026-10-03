import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORICAL_FIELDS,
  DEFAULT_APPLICANT,
  NUMERIC_FIELDS,
  RISK_COPY,
} from "@/lib/credit-fields";
import { scoreApplicant, type ApplicantForm } from "@/lib/credit.functions";
import { percent, savePrediction } from "@/lib/predictions";

export const Route = createFileRoute("/_authenticated/predict")({
  head: () => ({
    meta: [
      { title: "Loan Risk Predictor | Credit Risk Platform" },
      {
        name: "description",
        content:
          "Enter applicant and loan details to get an explained default probability, risk band and the factors driving the score.",
      },
      { property: "og:title", content: "Loan Risk Predictor | Credit Risk Platform" },
      {
        property: "og:description",
        content: "Score a loan application and see which factors drive the default probability.",
      },
    ],
  }),
  component: Predictor,
});

type Result = Awaited<ReturnType<typeof scoreApplicant>>;

function humanise(name: string) {
  return name.replace(/_/g, " ");
}

function Predictor() {
  const [form, setForm] = useState<ApplicantForm>(DEFAULT_APPLICANT as ApplicantForm);
  const [result, setResult] = useState<Result | null>(null);
  const score = useServerFn(scoreApplicant);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: ApplicantForm) => {
      const scored = await score({ data: input });
      await savePrediction({
        applicant: input,
        default_probability: scored.default_probability,
        prediction: scored.prediction,
        risk_category: scored.risk_category,
        explanation: scored.explanation,
        model_version: scored.model_version,
      });
      return scored;
    },
    onSuccess: (scored) => {
      setResult(scored);
      void queryClient.invalidateQueries({ queryKey: ["predictions"] });
      toast.success(`Scored: ${percent(scored.default_probability)} default probability`);
    },
    onError: (error: Error) => toast.error(error.message || "Scoring failed"),
  });

  const chartData = (result?.explanation ?? [])
    .slice()
    .sort((a, b) => b.impact - a.impact)
    .map((item) => ({
      name: humanise(item.feature),
      impact: item.impact,
      direction: item.direction,
    }));

  return (
    <AppShell>
      <PageHeader
        title="Loan risk predictor"
        description="Fields mirror the UCI Statlog German Credit schema the model was trained on. Inputs are validated on the server before scoring, and protected attributes are deliberately excluded from the model."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <form
          className="panel p-5"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(form);
          }}
        >
          <h2 className="text-sm font-semibold">Applicant &amp; loan details</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {NUMERIC_FIELDS.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  type="number"
                  inputMode="numeric"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={form[field.name]}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      [field.name]: Number(event.target.value),
                    }))
                  }
                  required
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">{field.hint}</p>
              </div>
            ))}

            {CATEGORICAL_FIELDS.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Select
                  value={form[field.name]}
                  onValueChange={(value) =>
                    setForm((previous) => ({ ...previous, [field.name]: value }))
                  }
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Predict default risk
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setForm(DEFAULT_APPLICANT as ApplicantForm);
                setResult(null);
              }}
            >
              Reset
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="panel p-5">
            <h2 className="text-sm font-semibold">Prediction result</h2>
            {!result ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Submit the form to score this application.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="label-caps">Default probability</p>
                    <p className="stat-value mt-1 text-4xl">
                      {percent(result.default_probability)}
                    </p>
                  </div>
                  <RiskBadge category={result.risk_category} size="lg" />
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, result.default_probability * 100)}%` }}
                  />
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="label-caps">Predicted class</dt>
                    <dd className="mt-1 font-mono">
                      {result.prediction} ({result.prediction === 1 ? "default" : "repaid"})
                    </dd>
                  </div>
                  <div>
                    <dt className="label-caps">Model version</dt>
                    <dd className="mt-1 font-mono">{result.model_version}</dd>
                  </div>
                </dl>

                <p className="rounded-md border border-border/60 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                  {RISK_COPY[result.risk_category]?.blurb} {result.disclaimer}
                </p>
              </div>
            )}
          </section>

          {result ? (
            <section className="panel p-5">
              <h2 className="text-sm font-semibold">Why this score</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Log-odds contributions along the model's decision paths. Bars to the right push the
                probability up; bars to the left are protective.
              </p>
              <div className="mt-4" style={{ height: chartData.length * 38 + 20 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 34 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={186}
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
                    <Bar dataKey="impact" radius={4} barSize={16}>
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.direction === "increases_risk"
                              ? "var(--risk-high)"
                              : "var(--risk-low)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                {result.explanation.map((item) => (
                  <li key={item.feature} className="flex gap-3">
                    <span
                      className={
                        item.direction === "increases_risk"
                          ? "w-14 shrink-0 font-mono text-risk-high"
                          : "w-14 shrink-0 font-mono text-risk-low"
                      }
                    >
                      {item.impact > 0 ? "+" : ""}
                      {item.impact.toFixed(2)}
                    </span>
                    <span>
                      <span className="font-medium text-foreground">
                        {humanise(item.feature)}
                      </span>{" "}
                      — {item.rationale}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
