-- Model registry: one row per trained model version
CREATE TABLE public.model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  algorithm text NOT NULL,
  roc_auc double precision NOT NULL,
  pr_auc double precision NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.model_versions TO anon;
GRANT SELECT ON public.model_versions TO authenticated;
GRANT ALL ON public.model_versions TO service_role;

ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Model versions are publicly readable"
  ON public.model_versions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Audit trail: one row per scored application
CREATE TABLE public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_input jsonb NOT NULL,
  default_probability double precision NOT NULL,
  prediction integer NOT NULL,
  risk_category text NOT NULL,
  explanation jsonb,
  model_version_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX predictions_created_at_idx ON public.predictions (created_at DESC);
CREATE INDEX predictions_risk_category_idx ON public.predictions (risk_category);

GRANT SELECT, INSERT ON public.predictions TO anon;
GRANT SELECT, INSERT ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Demo/portfolio app: scores carry no personal data, so history is public.
CREATE POLICY "Predictions are publicly readable"
  ON public.predictions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can record a prediction"
  ON public.predictions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    default_probability >= 0
    AND default_probability <= 1
    AND prediction IN (0, 1)
    AND risk_category IN ('LOW', 'MEDIUM', 'HIGH')
  );

-- Validation trigger instead of a CHECK on a time-dependent rule
CREATE OR REPLACE FUNCTION public.validate_prediction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.created_at > now() + interval '1 minute' THEN
    RAISE EXCEPTION 'created_at cannot be in the future';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER predictions_validate
  BEFORE INSERT OR UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.validate_prediction();
