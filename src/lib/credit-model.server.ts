/**
 * Server-side inference for the exported XGBoost champion.
 *
 * The artefact in `src/ml/web_model.json` is produced by
 * `python -m src.models.export_web_model` in the Python repo and is verified
 * there to reproduce the scikit-learn pipeline's probabilities to 1e-6.
 * Feature engineering below mirrors `src/features/engineering.py` exactly.
 */

import artefactJson from "@/ml/web_model.json";

export type TreeNode = {
  nodeid: number;
  split?: string;
  split_condition?: number;
  yes?: number;
  no?: number;
  children?: TreeNode[];
  leaf?: number;
};

export type Artefact = {
  model_version: string;
  champion: string;
  base_score: number;
  feature_names: string[];
  numeric_features: string[];
  categorical_features: string[];
  categories: Record<string, string[]>;
  trees: TreeNode[];
  risk_thresholds: { low_max: number; medium_max: number };
  feature_documentation: Record<string, string>;
  test_metrics: {
    roc_auc: number;
    pr_auc: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    brier_score: number;
    threshold: number;
    confusion_matrix: {
      true_negative: number;
      false_positive: number;
      false_negative: number;
      true_positive: number;
    };
    roc_curve: { fpr: number; tpr: number }[];
    calibration_curve?: { predicted: number; observed: number }[];
  };
  validation_leaderboard: {
    candidate: string;
    model: string;
    class_weighted: boolean;
    training_time_seconds: number;
    roc_auc: number;
    pr_auc: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
  }[];
  global_shap_importance: { feature: string; importance: number }[];
  data_quality: {
    rows: number;
    columns: number;
    duplicate_rows: number;
    iqr_outliers: Record<string, number>;
    class_counts: Record<string, number>;
    default_rate: number;
    imbalance_ratio: number;
  };
  split: { train: number; validation: number; test: number };
  dataset: string;
  disclaimer: string;
};

export const artefact = artefactJson as unknown as Artefact;

export type ApplicantInput = {
  duration_months: number;
  credit_amount: number;
  installment_rate_pct_income: number;
  age_years: number;
  existing_credits_count: number;
  present_residence_since: number;
  dependents: number;
  checking_status: string;
  credit_history: string;
  purpose: string;
  savings_status: string;
  employment_since: string;
  other_debtors: string;
  property_type: string;
  other_installment_plans: string;
  housing: string;
  job: string;
  telephone: string;
};

const EMPLOYMENT_STABILITY: Record<string, number> = {
  unemployed: 0,
  lt_1_year: 1,
  "1_to_4_years": 2,
  "4_to_7_years": 3,
  ge_7_years: 4,
};

const CREDIT_HISTORY_SCORE: Record<string, number> = {
  past_delay_in_paying: 0,
  critical_or_other_credits: 1,
  no_credit_taken_all_paid: 2,
  all_paid_this_bank: 3,
  existing_credits_paid_duly: 4,
};

const SAVINGS_SCORE: Record<string, number> = {
  unknown_or_none: 0,
  lt_100_dm: 1,
  "100_to_500_dm": 2,
  "500_to_1000_dm": 3,
  ge_1000_dm: 4,
};

const CHECKING_SCORE: Record<string, number> = {
  lt_0_dm: 0,
  "0_to_200_dm": 1,
  ge_200_dm: 2,
  no_checking_account: 3,
};

const COLLATERAL_PROPERTY = new Set(["real_estate", "building_society_or_life_insurance"]);

/** Row-wise arithmetic and static maps only — identical to the Python transformer. */
export function engineerFeatures(input: ApplicantInput): Record<string, number> {
  const monthlyInstalment = input.credit_amount / input.duration_months;
  return {
    duration_months: input.duration_months,
    credit_amount: input.credit_amount,
    installment_rate_pct_income: input.installment_rate_pct_income,
    age_years: input.age_years,
    existing_credits_count: input.existing_credits_count,
    present_residence_since: input.present_residence_since,
    dependents: input.dependents,
    monthly_installment_estimate: monthlyInstalment,
    log_credit_amount: Math.log1p(input.credit_amount),
    loan_to_age_ratio: input.credit_amount / input.age_years,
    duration_years: input.duration_months / 12,
    debt_service_burden: input.installment_rate_pct_income * input.existing_credits_count,
    residual_income_share: 100 - input.installment_rate_pct_income,
    employment_stability_score: EMPLOYMENT_STABILITY[input.employment_since] ?? 0,
    credit_history_length_score: CREDIT_HISTORY_SCORE[input.credit_history] ?? 0,
    savings_score: SAVINGS_SCORE[input.savings_status] ?? 0,
    checking_score: CHECKING_SCORE[input.checking_status] ?? 0,
    has_collateral: COLLATERAL_PROPERTY.has(input.property_type) ? 1 : 0,
    has_guarantor: input.other_debtors !== "none" ? 1 : 0,
    has_other_installment_plans: input.other_installment_plans !== "none" ? 1 : 0,
    credit_utilisation_proxy: (monthlyInstalment * input.installment_rate_pct_income) / 100,
  };
}

/** Engineering + one-hot encoding, in the artefact's exact column order. */
export function vectorise(input: ApplicantInput): Record<string, number> {
  const numeric = engineerFeatures(input);
  const row: Record<string, number> = {};
  for (const name of artefact.numeric_features) row[name] = numeric[name] ?? 0;
  for (const column of artefact.categorical_features) {
    const value = (input as unknown as Record<string, string>)[column];
    for (const category of artefact.categories[column] ?? []) {
      // handle_unknown="ignore": an unseen category leaves every dummy at 0
      row[`${column}_${category}`] = value === category ? 1 : 0;
    }
  }
  return row;
}

function childOf(node: TreeNode, id: number): TreeNode {
  const child = node.children?.find((c) => c.nodeid === id);
  if (!child) throw new Error(`Malformed tree: missing node ${id}`);
  return child;
}

/** Mean of the leaves below a node — the fallback node value for path attribution. */
function subtreeMean(node: TreeNode): number {
  if (node.leaf !== undefined) return node.leaf;
  const leaves: number[] = [];
  const stack: TreeNode[] = [node];
  while (stack.length) {
    const current = stack.pop()!;
    if (current.leaf !== undefined) leaves.push(current.leaf);
    else for (const child of current.children ?? []) stack.push(child);
  }
  return leaves.reduce((a, b) => a + b, 0) / leaves.length;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export type Contribution = {
  feature: string;
  impact: number;
  direction: "increases_risk" | "decreases_risk";
  rationale: string;
};

export type ScoreResult = {
  default_probability: number;
  prediction: 0 | 1;
  risk_category: "LOW" | "MEDIUM" | "HIGH";
  model_version: string;
  explanation: Contribution[];
  disclaimer: string;
};

export function riskCategory(probability: number): "LOW" | "MEDIUM" | "HIGH" {
  const { low_max, medium_max } = artefact.risk_thresholds;
  if (probability < low_max) return "LOW";
  if (probability < medium_max) return "MEDIUM";
  return "HIGH";
}

/** Human label for a one-hot column, e.g. `purpose_car_used` -> `Purpose: car used`. */
export function prettyFeature(name: string): string {
  for (const column of artefact.categorical_features) {
    if (name.startsWith(`${column}_`)) {
      const category = name.slice(column.length + 1).replace(/_/g, " ");
      return `${column.replace(/_/g, " ")}: ${category}`;
    }
  }
  return name.replace(/_/g, " ");
}

export function rationaleFor(name: string): string {
  const documented = artefact.feature_documentation[name];
  if (documented) return documented;
  for (const column of artefact.categorical_features) {
    if (name.startsWith(`${column}_`)) {
      return `Category indicator derived from ${column.replace(/_/g, " ")}.`;
    }
  }
  return "Model input feature.";
}

/**
 * Score one applicant.
 *
 * Contributions are log-odds path attributions (Saabas): each split credits the
 * change in node value along the decision path to its split feature. Internal
 * node values use the mean of the leaves below them, so these are an
 * approximation of the exact TreeSHAP values computed by the Python service.
 */
export function score(input: ApplicantInput, topK = 8): ScoreResult {
  const row = vectorise(input);
  let margin = Math.log(artefact.base_score / (1 - artefact.base_score));
  const contributions = new Map<string, number>();

  for (const tree of artefact.trees) {
    let node = tree;
    let nodeValue = subtreeMean(node);
    while (node.leaf === undefined) {
      const feature = node.split!;
      const value = Math.fround(row[feature] ?? 0);
      const nextId = value < node.split_condition! ? node.yes! : node.no!;
      const child = childOf(node, nextId);
      const childValue = subtreeMean(child);
      contributions.set(feature, (contributions.get(feature) ?? 0) + (childValue - nodeValue));
      node = child;
      nodeValue = childValue;
    }
    margin += node.leaf;
  }

  const probability = sigmoid(margin);
  const explanation: Contribution[] = [...contributions.entries()]
    .filter(([, impact]) => Math.abs(impact) > 1e-6)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, topK)
    .map(([feature, impact]) => ({
      feature,
      impact: Number(impact.toFixed(4)),
      direction: impact >= 0 ? "increases_risk" : "decreases_risk",
      rationale: rationaleFor(feature),
    }));

  return {
    default_probability: Number(probability.toFixed(4)),
    prediction: probability >= artefact.test_metrics.threshold ? 1 : 0,
    risk_category: riskCategory(probability),
    model_version: artefact.model_version,
    explanation,
    disclaimer: artefact.disclaimer,
  };
}
