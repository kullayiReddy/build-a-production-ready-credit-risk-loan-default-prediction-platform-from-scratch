import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const applicantSchema = z.object({
  duration_months: z.number().int().min(4).max(72),
  credit_amount: z.number().min(250).max(20000),
  installment_rate_pct_income: z.number().int().min(1).max(4),
  age_years: z.number().int().min(18).max(80),
  existing_credits_count: z.number().int().min(1).max(4),
  present_residence_since: z.number().int().min(1).max(4),
  dependents: z.number().int().min(1).max(2),
  checking_status: z.string().min(1).max(60),
  credit_history: z.string().min(1).max(60),
  purpose: z.string().min(1).max(60),
  savings_status: z.string().min(1).max(60),
  employment_since: z.string().min(1).max(60),
  other_debtors: z.string().min(1).max(60),
  property_type: z.string().min(1).max(60),
  other_installment_plans: z.string().min(1).max(60),
  housing: z.string().min(1).max(60),
  job: z.string().min(1).max(60),
  telephone: z.string().min(1).max(60),
});

export type ApplicantForm = z.infer<typeof applicantSchema>;

/** Score one applicant with the exported champion model (server-side only). */
export const scoreApplicant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => applicantSchema.parse(input))
  .handler(async ({ data }) => {
    const { score } = await import("./credit-model.server");
    return score(data);
  });

/** Model card: metrics, leaderboard, global SHAP importance, data quality. */
export const getModelInfo = createServerFn({ method: "GET" }).handler(async () => {
  const { artefact, prettyFeature, rationaleFor } = await import("./credit-model.server");
  return {
    model_version: artefact.model_version,
    champion: artefact.champion,
    dataset: artefact.dataset,
    disclaimer: artefact.disclaimer,
    split: artefact.split,
    risk_thresholds: artefact.risk_thresholds,
    test_metrics: artefact.test_metrics,
    validation_leaderboard: artefact.validation_leaderboard,
    data_quality: artefact.data_quality,
    global_shap_importance: artefact.global_shap_importance.map((row) => ({
      ...row,
      label: prettyFeature(row.feature),
      rationale: rationaleFor(row.feature),
    })),
    features: Object.entries(artefact.feature_documentation).map(([feature, rationale]) => ({
      feature,
      label: prettyFeature(feature),
      rationale,
    })),
    feature_count: artefact.feature_names.length,
  };
});

export type ModelInfo = Awaited<ReturnType<typeof getModelInfo>>;
