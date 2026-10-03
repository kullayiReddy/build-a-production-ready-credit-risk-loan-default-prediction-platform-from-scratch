ALTER TABLE public.predictions ADD COLUMN user_id uuid;

DROP POLICY "Anyone can record a prediction" ON public.predictions;
DROP POLICY "Signed-in users can read predictions" ON public.predictions;

CREATE POLICY "Users can read own predictions"
ON public.predictions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can record own predictions"
ON public.predictions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND default_probability >= 0 AND default_probability <= 1
  AND prediction = ANY (ARRAY[0, 1])
  AND risk_category = ANY (ARRAY['LOW', 'MEDIUM', 'HIGH'])
);

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY "Signed-in users can read model versions" ON public.model_versions;

CREATE POLICY "Admins can read model versions"
ON public.model_versions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));