import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ApplicantForm } from "./credit.functions";

export type PredictionRow = {
  id: string;
  applicant_input: ApplicantForm;
  default_probability: number;
  prediction: number;
  risk_category: string;
  explanation: { feature: string; impact: number; direction: string }[] | null;
  model_version_label: string;
  created_at: string;
};

export const predictionsQuery = (limit = 100) =>
  queryOptions({
    queryKey: ["predictions", limit],
    queryFn: async (): Promise<PredictionRow[]> => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PredictionRow[];
    },
  });

export type SavePredictionArgs = {
  applicant: ApplicantForm;
  default_probability: number;
  prediction: number;
  risk_category: string;
  explanation: unknown;
  model_version: string;
};

export async function savePrediction(args: SavePredictionArgs) {
  const { error } = await supabase.from("predictions").insert({
    applicant_input: args.applicant,
    default_probability: args.default_probability,
    prediction: args.prediction,
    risk_category: args.risk_category,
    explanation: args.explanation,
    model_version_label: args.model_version,
  } as never);
  if (error) throw new Error(error.message);
}

export function summarise(rows: PredictionRow[]) {
  const total = rows.length;
  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 } as Record<string, number>;
  let probabilitySum = 0;
  for (const row of rows) {
    counts[row.risk_category] = (counts[row.risk_category] ?? 0) + 1;
    probabilitySum += row.default_probability;
  }
  return {
    total,
    counts,
    highRiskShare: total ? (counts['HIGH'] ?? 0) / total : 0,
    averageProbability: total ? probabilitySum / total : 0,
  };
}

export const percent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
