-- With advanced.database.generateId='uuid', the PostgreSQL adapter uses database defaults.
ALTER TABLE public.auth_user ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.auth_session ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.auth_account ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.auth_verification ALTER COLUMN id SET DEFAULT gen_random_uuid();
