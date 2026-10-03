DROP POLICY IF EXISTS "Predictions are publicly readable" ON public.predictions;
CREATE POLICY "Signed-in users can read predictions"
ON public.predictions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Model versions are publicly readable" ON public.model_versions;
CREATE POLICY "Signed-in users can read model versions"
ON public.model_versions FOR SELECT TO authenticated USING (true);