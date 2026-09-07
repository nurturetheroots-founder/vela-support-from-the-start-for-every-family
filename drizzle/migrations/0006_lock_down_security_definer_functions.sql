-- Trigger-only functions: never callable via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_epds_responses_complete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- RLS helper + member RPCs: signed-in users only, never anonymous
REVOKE ALL ON FUNCTION public.is_family_caregiver(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_family_invite() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_family_invite(text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_family_caregiver(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_family_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_family_invite(text, text) TO authenticated;