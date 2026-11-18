CREATE TABLE public.mobile_app_favorites (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 app_keys text[] NOT NULL DEFAULT '{}',
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT mobile_favorites_max_four CHECK (cardinality(app_keys) <= 4),
 CONSTRAINT mobile_favorites_known_apps CHECK (app_keys <@ ARRAY['supply','cash_flow','crm','legal','rh','site_survey','chamados','development','mytosis','wishlist','projects','cde']::text[])
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobile_app_favorites TO authenticated;
GRANT ALL ON public.mobile_app_favorites TO service_role;
ALTER TABLE public.mobile_app_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY mobile_favorites_read_own ON public.mobile_app_favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY mobile_favorites_insert_own ON public.mobile_app_favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY mobile_favorites_update_own ON public.mobile_app_favorites FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY mobile_favorites_delete_own ON public.mobile_app_favorites FOR DELETE TO authenticated USING (user_id = auth.uid());