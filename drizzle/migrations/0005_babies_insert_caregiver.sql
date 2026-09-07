CREATE POLICY babies_insert_caregiver ON public.babies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_family_caregiver(parent_id));