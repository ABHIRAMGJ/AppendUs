CREATE TABLE public.email_verified (
  user_id uuid PRIMARY KEY,
  verified_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_verified TO authenticated;
GRANT ALL ON public.email_verified TO service_role;
ALTER TABLE public.email_verified ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own verification" ON public.email_verified FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin read verification" ON public.email_verified FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
-- Existing email/password accounts already confirmed their email by link.
INSERT INTO public.email_verified (user_id)
SELECT id FROM auth.users
WHERE email_confirmed_at IS NOT NULL
  AND coalesce(raw_app_meta_data->>'provider', 'email') = 'email'
ON CONFLICT DO NOTHING;