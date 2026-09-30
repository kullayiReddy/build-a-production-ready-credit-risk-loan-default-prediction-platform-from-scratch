/** Browser-safe form metadata for the applicant form (no model artefact import). */

export type NumericField = {
  name:
    | "duration_months"
    | "credit_amount"
    | "installment_rate_pct_income"
    | "age_years"
    | "existing_credits_count"
    | "present_residence_since"
    | "dependents";
  label: string;
  min: number;
  max: number;
  step: number;
  hint: string;
};

export const NUMERIC_FIELDS: NumericField[] = [
  {
    name: "credit_amount",
    label: "Loan amount (DM)",
    min: 250,
    max: 20000,
    step: 50,
    hint: "Requested exposure in Deutsche Mark, as recorded in the source dataset.",
  },
  {
    name: "duration_months",
    label: "Term (months)",
    min: 4,
    max: 72,
    step: 1,
    hint: "Longer terms expose the lender to more future income shocks.",
  },
  {
    name: "installment_rate_pct_income",
    label: "Instalment rate (% of disposable income)",
    min: 1,
    max: 4,
    step: 1,
    hint: "The dataset's debt-service indicator, banded 1 (lightest) to 4 (heaviest).",
  },
  {
    name: "age_years",
    label: "Age (years)",
    min: 18,
    max: 80,
    step: 1,
    hint: "Proxy for career stage and accumulated financial buffer.",
  },
  {
    name: "existing_credits_count",
    label: "Existing credits at this bank",
    min: 1,
    max: 4,
    step: 1,
    hint: "Current debt burden across the banking relationship.",
  },
  {
    name: "present_residence_since",
    label: "Years at current residence",
    min: 1,
    max: 4,
    step: 1,
    hint: "Residential stability, a classic behavioural stability signal.",
  },
  {
    name: "dependents",
    label: "Dependents",
    min: 1,
    max: 2,
    step: 1,
    hint: "More dependents reduce income available for debt service.",
  },
];

export type CategoricalField = {
  name:
    | "checking_status"
    | "credit_history"
    | "purpose"
    | "savings_status"
    | "employment_since"
    | "other_debtors"
    | "property_type"
    | "other_installment_plans"
    | "housing"
    | "job"
    | "telephone";
  label: string;
  options: { value: string; label: string }[];
};

const opt = (value: string, label: string) => ({ value, label });

export const CATEGORICAL_FIELDS: CategoricalField[] = [
  {
    name: "checking_status",
    label: "Checking account status",
    options: [
      opt("lt_0_dm", "Overdrawn (< 0 DM)"),
      opt("0_to_200_dm", "0 – 200 DM"),
      opt("ge_200_dm", "200 DM or more"),
      opt("no_checking_account", "No checking account"),
    ],
  },
  {
    name: "credit_history",
    label: "Credit history",
    options: [
      opt("past_delay_in_paying", "Past delays in paying"),
      opt("critical_or_other_credits", "Critical account / other credits"),
      opt("no_credit_taken_all_paid", "No credits taken or all paid"),
      opt("all_paid_this_bank", "All credits at this bank paid"),
      opt("existing_credits_paid_duly", "Existing credits paid duly"),
    ],
  },
  {
    name: "purpose",
    label: "Loan purpose",
    options: [
      opt("car_new", "New car"),
      opt("car_used", "Used car"),
      opt("furniture_equipment", "Furniture / equipment"),
      opt("radio_television", "Radio / television"),
      opt("domestic_appliances", "Domestic appliances"),
      opt("repairs", "Repairs"),
      opt("education", "Education"),
      opt("retraining", "Retraining"),
      opt("business", "Business"),
      opt("other", "Other"),
    ],
  },
  {
    name: "savings_status",
    label: "Savings balance",
    options: [
      opt("unknown_or_none", "Unknown / none"),
      opt("lt_100_dm", "Under 100 DM"),
      opt("100_to_500_dm", "100 – 500 DM"),
      opt("500_to_1000_dm", "500 – 1000 DM"),
      opt("ge_1000_dm", "1000 DM or more"),
    ],
  },
  {
    name: "employment_since",
    label: "Employment tenure",
    options: [
      opt("unemployed", "Unemployed"),
      opt("lt_1_year", "Under 1 year"),
      opt("1_to_4_years", "1 – 4 years"),
      opt("4_to_7_years", "4 – 7 years"),
      opt("ge_7_years", "7 years or more"),
    ],
  },
  {
    name: "other_debtors",
    label: "Guarantor / co-applicant",
    options: [
      opt("none", "None"),
      opt("co_applicant", "Co-applicant"),
      opt("guarantor", "Guarantor"),
    ],
  },
  {
    name: "property_type",
    label: "Property",
    options: [
      opt("real_estate", "Real estate"),
      opt("building_society_or_life_insurance", "Savings agreement / life insurance"),
      opt("car_or_other", "Car or other"),
      opt("unknown_or_none", "Unknown / none"),
    ],
  },
  {
    name: "other_installment_plans",
    label: "Other instalment plans",
    options: [opt("none", "None"), opt("bank", "At another bank"), opt("stores", "At stores")],
  },
  {
    name: "housing",
    label: "Housing",
    options: [opt("own", "Owner"), opt("rent", "Renting"), opt("for_free", "Rent free")],
  },
  {
    name: "job",
    label: "Employment category",
    options: [
      opt("unemployed_unskilled_non_resident", "Unemployed / unskilled non-resident"),
      opt("unskilled_resident", "Unskilled resident"),
      opt("skilled_employee_or_official", "Skilled employee / official"),
      opt("management_self_employed_highly_qualified", "Management / self-employed"),
    ],
  },
  {
    name: "telephone",
    label: "Registered telephone",
    options: [opt("none", "No"), opt("yes", "Yes")],
  },
];

export const DEFAULT_APPLICANT = {
  duration_months: 24,
  credit_amount: 4500,
  installment_rate_pct_income: 3,
  age_years: 34,
  existing_credits_count: 1,
  present_residence_since: 2,
  dependents: 1,
  checking_status: "lt_0_dm",
  credit_history: "existing_credits_paid_duly",
  purpose: "car_used",
  savings_status: "lt_100_dm",
  employment_since: "1_to_4_years",
  other_debtors: "none",
  property_type: "car_or_other",
  other_installment_plans: "none",
  housing: "own",
  job: "skilled_employee_or_official",
  telephone: "none",
};

export const RISK_COPY: Record<string, { label: string; blurb: string }> = {
  LOW: {
    label: "Low risk",
    blurb: "Estimated default probability below 30%. Routine review.",
  },
  MEDIUM: {
    label: "Medium risk",
    blurb: "Estimated default probability between 30% and 60%. Analyst review suggested.",
  },
  HIGH: {
    label: "High risk",
    blurb: "Estimated default probability of 60% or more. Enhanced review suggested.",
  },
};
