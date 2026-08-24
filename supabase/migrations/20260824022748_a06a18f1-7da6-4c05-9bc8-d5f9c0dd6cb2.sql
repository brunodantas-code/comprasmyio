CREATE POLICY "homologation_units_update_auth"
ON public.homologation_units
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);