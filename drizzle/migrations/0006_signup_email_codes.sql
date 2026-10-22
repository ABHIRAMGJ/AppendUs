CREATE TABLE public.signup_codes (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  attempts int NOT NULL DEFAULT 0
);
GRANT ALL ON public.signup_codes TO service_role;
ALTER TABLE public.signup_codes ENABLE ROW LEVEL SECURITY;
-- No policies: only trusted server code may read or write codes.