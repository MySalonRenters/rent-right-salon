CREATE TYPE public.app_role AS ENUM ('owner', 'renter');
CREATE TYPE public.billing_cycle AS ENUM ('weekly', 'monthly');
CREATE TYPE public.charge_status AS ENUM ('pending', 'paid', 'overdue', 'void');
CREATE TYPE public.payment_method AS ENUM ('card', 'cash', 'bank_transfer', 'other');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'revoked');
CREATE TYPE public.agreement_status AS ENUM ('draft', 'sent', 'signed');
CREATE TYPE public.agreement_kind AS ENUM ('template', 'upload');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
-- ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requested TEXT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;

  requested := COALESCE(NEW.raw_user_meta_data ->> 'role', 'owner');
  IF requested NOT IN ('owner', 'renter') THEN requested := 'owner'; END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested::public.app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  currency TEXT NOT NULL DEFAULT 'GBP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salons TO authenticated;
GRANT ALL ON public.salons TO service_role;
-- ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_salons_updated BEFORE UPDATE ON public.salons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.salon_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chair_id UUID,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (salon_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salon_members TO authenticated;
GRANT ALL ON public.salon_members TO service_role;
-- ALTER TABLE public.salon_members ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_members_updated BEFORE UPDATE ON public.salon_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.owns_salon(_salon_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.salons s WHERE s.id = _salon_id AND s.owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_salon_member(_salon_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.salon_members m WHERE m.salon_id = _salon_id AND m.user_id = auth.uid());
$$;

CREATE POLICY "salons_owner_all" ON public.salons FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "salons_member_select" ON public.salons FOR SELECT TO authenticated USING (public.is_salon_member(id));

CREATE POLICY "members_owner_all" ON public.salon_members FOR ALL TO authenticated USING (public.owns_salon(salon_id)) WITH CHECK (public.owns_salon(salon_id));
CREATE POLICY "members_select_own" ON public.salon_members FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.chairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rent_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  cycle public.billing_cycle NOT NULL DEFAULT 'weekly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chairs TO authenticated;
GRANT ALL ON public.chairs TO service_role;
-- ALTER TABLE public.chairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chairs_owner_all" ON public.chairs FOR ALL TO authenticated USING (public.owns_salon(salon_id)) WITH CHECK (public.owns_salon(salon_id));
CREATE POLICY "chairs_member_select" ON public.chairs FOR SELECT TO authenticated USING (public.is_salon_member(salon_id));
CREATE TRIGGER trg_chairs_updated BEFORE UPDATE ON public.chairs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.salon_members ADD CONSTRAINT salon_members_chair_fk FOREIGN KEY (chair_id) REFERENCES public.chairs(id) ON DELETE SET NULL;

CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  chair_id UUID REFERENCES public.chairs(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status public.invite_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;
-- ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invites_owner_all" ON public.invites FOR ALL TO authenticated USING (public.owns_salon(salon_id)) WITH CHECK (public.owns_salon(salon_id));

CREATE TABLE public.rent_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  chair_id UUID REFERENCES public.chairs(id) ON DELETE SET NULL,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  status public.charge_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_charges_salon ON public.rent_charges(salon_id);
CREATE INDEX idx_charges_renter ON public.rent_charges(renter_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rent_charges TO authenticated;
GRANT ALL ON public.rent_charges TO service_role;
-- ALTER TABLE public.rent_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "charges_owner_all" ON public.rent_charges FOR ALL TO authenticated USING (public.owns_salon(salon_id)) WITH CHECK (public.owns_salon(salon_id));
CREATE POLICY "charges_renter_select" ON public.rent_charges FOR SELECT TO authenticated USING (renter_id = auth.uid());
CREATE TRIGGER trg_charges_updated BEFORE UPDATE ON public.rent_charges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  charge_id UUID REFERENCES public.rent_charges(id) ON DELETE SET NULL,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  method public.payment_method NOT NULL DEFAULT 'card',
  reference TEXT,
  note TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_salon ON public.payments(salon_id);
CREATE INDEX idx_payments_renter ON public.payments(renter_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
-- ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_owner_all" ON public.payments FOR ALL TO authenticated USING (public.owns_salon(salon_id)) WITH CHECK (public.owns_salon(salon_id));
CREATE POLICY "payments_renter_select" ON public.payments FOR SELECT TO authenticated USING (renter_id = auth.uid());

CREATE TABLE public.agreement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agreement_templates TO authenticated;
GRANT ALL ON public.agreement_templates TO service_role;
-- ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_owner_all" ON public.agreement_templates FOR ALL TO authenticated USING (public.owns_salon(salon_id)) WITH CHECK (public.owns_salon(salon_id));
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.agreement_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chair_id UUID REFERENCES public.chairs(id) ON DELETE SET NULL,
  kind public.agreement_kind NOT NULL DEFAULT 'template',
  title TEXT NOT NULL,
  body TEXT,
  file_path TEXT,
  status public.agreement_status NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agreements TO authenticated;
GRANT ALL ON public.agreements TO service_role;
-- ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agreements_owner_select" ON public.agreements FOR SELECT TO authenticated USING (public.owns_salon(salon_id));
CREATE POLICY "agreements_owner_insert" ON public.agreements FOR INSERT TO authenticated WITH CHECK (public.owns_salon(salon_id));
CREATE POLICY "agreements_owner_update_unsigned" ON public.agreements FOR UPDATE TO authenticated USING (public.owns_salon(salon_id) AND status <> 'signed') WITH CHECK (public.owns_salon(salon_id));
CREATE POLICY "agreements_owner_delete_unsigned" ON public.agreements FOR DELETE TO authenticated USING (public.owns_salon(salon_id) AND status <> 'signed');
CREATE POLICY "agreements_renter_select" ON public.agreements FOR SELECT TO authenticated USING (renter_id = auth.uid());
CREATE POLICY "agreements_renter_sign" ON public.agreements FOR UPDATE TO authenticated USING (renter_id = auth.uid() AND status = 'sent') WITH CHECK (renter_id = auth.uid() AND status = 'signed');
CREATE TRIGGER trg_agreements_updated BEFORE UPDATE ON public.agreements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.agreement_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  typed_name TEXT NOT NULL,
  signature_path TEXT,
  agreement_snapshot TEXT NOT NULL,
  ip_address TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.agreement_signatures TO authenticated;
GRANT ALL ON public.agreement_signatures TO service_role;
-- ALTER TABLE public.agreement_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signatures_signer_insert" ON public.agreement_signatures FOR INSERT TO authenticated WITH CHECK (signer_id = auth.uid());
CREATE POLICY "signatures_signer_select" ON public.agreement_signatures FOR SELECT TO authenticated USING (signer_id = auth.uid());
CREATE POLICY "signatures_owner_select" ON public.agreement_signatures FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.agreements a WHERE a.id = agreement_id AND public.owns_salon(a.salon_id))
);

CREATE POLICY "agreement_files_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'agreements' AND (
  (storage.foldername(name))[1] = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.salons s WHERE s.owner_id = auth.uid() AND s.id::text = (storage.foldername(name))[2])
));
CREATE POLICY "agreement_files_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'agreements' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "agreement_files_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'agreements' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ===== 20260815150744_d2f72e6a-e495-4155-9d55-c4df8f0d681e.sql =====

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_salon(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_salon_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_salon(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_salon_member(uuid) TO authenticated;

-- ===== 20260815151818_89644017-89f7-4386-b44a-b78edeea8a3e.sql =====

CREATE POLICY "profiles_select_salon_members"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.salon_members m
    JOIN public.salons s ON s.id = m.salon_id
    WHERE m.user_id = profiles.id
      AND s.owner_id = auth.uid()
  )
);

CREATE POLICY "profiles_select_my_salon_owner"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.salons s
    JOIN public.salon_members m ON m.salon_id = s.id
    WHERE s.owner_id = profiles.id
      AND m.user_id = auth.uid()
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS rent_charges_renter_period_uidx
  ON public.rent_charges (renter_id, period_start);

-- ===== 20260815152941_2119c476-0624-4653-9fb3-04a1ecc86640.sql =====


-- 1) Move SECURITY DEFINER helpers out of the exposed API schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION private.owns_salon(_salon_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.salons s WHERE s.id = _salon_id AND s.owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION private.is_salon_member(_salon_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.salon_members m WHERE m.salon_id = _salon_id AND m.user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.owns_salon(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_salon_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.owns_salon(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_salon_member(uuid) TO authenticated, service_role;

-- 2) Recreate policies against the private helpers
DROP POLICY IF EXISTS signatures_owner_select ON public.agreement_signatures;
CREATE POLICY signatures_owner_select ON public.agreement_signatures FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.agreements a WHERE a.id = agreement_signatures.agreement_id AND private.owns_salon(a.salon_id)));

DROP POLICY IF EXISTS templates_owner_all ON public.agreement_templates;
CREATE POLICY templates_owner_all ON public.agreement_templates FOR ALL TO authenticated
USING (private.owns_salon(salon_id)) WITH CHECK (private.owns_salon(salon_id));

DROP POLICY IF EXISTS agreements_owner_delete_unsigned ON public.agreements;
CREATE POLICY agreements_owner_delete_unsigned ON public.agreements FOR DELETE TO authenticated
USING (private.owns_salon(salon_id) AND status <> 'signed'::public.agreement_status);

DROP POLICY IF EXISTS agreements_owner_insert ON public.agreements;
CREATE POLICY agreements_owner_insert ON public.agreements FOR INSERT TO authenticated
WITH CHECK (private.owns_salon(salon_id));

DROP POLICY IF EXISTS agreements_owner_select ON public.agreements;
CREATE POLICY agreements_owner_select ON public.agreements FOR SELECT TO authenticated
USING (private.owns_salon(salon_id));

DROP POLICY IF EXISTS agreements_owner_update_unsigned ON public.agreements;
CREATE POLICY agreements_owner_update_unsigned ON public.agreements FOR UPDATE TO authenticated
USING (private.owns_salon(salon_id) AND status <> 'signed'::public.agreement_status)
WITH CHECK (private.owns_salon(salon_id));

DROP POLICY IF EXISTS chairs_member_select ON public.chairs;
CREATE POLICY chairs_member_select ON public.chairs FOR SELECT TO authenticated
USING (private.is_salon_member(salon_id));

DROP POLICY IF EXISTS chairs_owner_all ON public.chairs;
CREATE POLICY chairs_owner_all ON public.chairs FOR ALL TO authenticated
USING (private.owns_salon(salon_id)) WITH CHECK (private.owns_salon(salon_id));

DROP POLICY IF EXISTS invites_owner_all ON public.invites;
CREATE POLICY invites_owner_all ON public.invites FOR ALL TO authenticated
USING (private.owns_salon(salon_id)) WITH CHECK (private.owns_salon(salon_id));

DROP POLICY IF EXISTS payments_owner_all ON public.payments;
CREATE POLICY payments_owner_all ON public.payments FOR ALL TO authenticated
USING (private.owns_salon(salon_id)) WITH CHECK (private.owns_salon(salon_id));

DROP POLICY IF EXISTS charges_owner_all ON public.rent_charges;
CREATE POLICY charges_owner_all ON public.rent_charges FOR ALL TO authenticated
USING (private.owns_salon(salon_id)) WITH CHECK (private.owns_salon(salon_id));

DROP POLICY IF EXISTS members_owner_all ON public.salon_members;
CREATE POLICY members_owner_all ON public.salon_members FOR ALL TO authenticated
USING (private.owns_salon(salon_id)) WITH CHECK (private.owns_salon(salon_id));

DROP POLICY IF EXISTS salons_member_select ON public.salons;
CREATE POLICY salons_member_select ON public.salons FOR SELECT TO authenticated
USING (private.is_salon_member(id));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.owns_salon(uuid);
DROP FUNCTION IF EXISTS public.is_salon_member(uuid);

-- 3) Let invitees read their own pending invite
CREATE POLICY invites_invitee_select ON public.invites FOR SELECT TO authenticated
USING (
  status = 'pending'::public.invite_status
  AND expires_at > now()
  AND lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
);

-- 4) Explicit UPDATE policy for agreement files in storage
CREATE POLICY agreement_files_update ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'agreements'
  AND ((storage.foldername(name))[1] = auth.uid()::text
       OR EXISTS (SELECT 1 FROM public.salons s WHERE s.owner_id = auth.uid() AND s.id::text = (storage.foldername(name))[1]))
)
WITH CHECK (
  bucket_id = 'agreements'
  AND ((storage.foldername(name))[1] = auth.uid()::text
       OR EXISTS (SELECT 1 FROM public.salons s WHERE s.owner_id = auth.uid() AND s.id::text = (storage.foldername(name))[1]))
);

-- ===== 20260824115319_18ffacfe-b7b9-460b-bb12-b0a34fe88db9.sql =====

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  charge_id uuid REFERENCES public.rent_charges(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('rent_due','rent_overdue','payment_received')),
  title text NOT NULL,
  body text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX notifications_dedupe ON public.notifications (user_id, type, charge_id) WHERE charge_id IS NOT NULL;
CREATE INDEX notifications_user_created ON public.notifications (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_owner_insert ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (private.owns_salon(salon_id));

CREATE POLICY notifications_owner_select ON public.notifications
  FOR SELECT TO authenticated USING (private.owns_salon(salon_id));

CREATE TRIGGER trg_notifications_updated BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.job_locks (
  job_name text PRIMARY KEY,
  locked_until timestamp with time zone NOT NULL,
  paused_reason text,
  paused_at timestamp with time zone,
  last_run_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.job_locks TO service_role;

-- ALTER TABLE public.job_locks ENABLE ROW LEVEL SECURITY;

-- ===== 20260824120646_ad1ae68f-0907-400f-8453-f27ee052a389.sql =====

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paddle_subscription_id text NOT NULL UNIQUE,
  paddle_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_paddle_id ON public.subscriptions(paddle_subscription_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.salon_owner_subscribed(_salon_id uuid, check_env text DEFAULT 'live')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.salons s
    WHERE s.id = _salon_id
      AND public.has_active_subscription(s.owner_id, check_env)
  );
$$;

REVOKE ALL ON FUNCTION public.salon_owner_subscribed(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salon_owner_subscribed(uuid, text) TO authenticated, service_role;

-- ===== 20260824120706_f60d421d-27ba-45ab-82cb-7ff3093870c6.sql =====

DROP FUNCTION IF EXISTS public.salon_owner_subscribed(uuid, text);
DROP FUNCTION IF EXISTS public.has_active_subscription(uuid, text);

CREATE OR REPLACE FUNCTION private.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.salon_owner_subscribed(_salon_id uuid, check_env text DEFAULT 'live')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.salons s
    WHERE s.id = _salon_id
      AND private.has_active_subscription(s.owner_id, check_env)
  );
$$;

REVOKE ALL ON FUNCTION private.has_active_subscription(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.salon_owner_subscribed(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_active_subscription(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.salon_owner_subscribed(uuid, text) TO authenticated, service_role;

-- ===== 20260829173955_fc622338-37b2-410f-9ea9-3cfa3e760697.sql =====

-- Track who signed and dual signature state
ALTER TABLE public.agreement_signatures
  ADD COLUMN IF NOT EXISTS signer_role TEXT NOT NULL DEFAULT 'renter';

ALTER TABLE public.agreement_signatures
  DROP CONSTRAINT IF EXISTS agreement_signatures_role_check;
ALTER TABLE public.agreement_signatures
  ADD CONSTRAINT agreement_signatures_role_check CHECK (signer_role IN ('owner','renter'));

CREATE UNIQUE INDEX IF NOT EXISTS agreement_signatures_unique_signer
  ON public.agreement_signatures (agreement_id, signer_id);

ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS owner_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renter_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_file_path TEXT;

-- Backfill existing renter signatures
UPDATE public.agreements a
SET renter_signed_at = a.signed_at
WHERE a.signed_at IS NOT NULL AND a.renter_signed_at IS NULL;

-- Renters may see signatures on their own agreements (so they can see the owner signed)
DROP POLICY IF EXISTS signatures_renter_select ON public.agreement_signatures;
CREATE POLICY signatures_renter_select ON public.agreement_signatures FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.agreements a WHERE a.id = agreement_signatures.agreement_id AND a.renter_id = auth.uid()));

-- Validate + apply signatures to the parent agreement
CREATE OR REPLACE FUNCTION private.apply_agreement_signature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  ag public.agreements%ROWTYPE;
  is_owner BOOLEAN;
BEGIN
  SELECT * INTO ag FROM public.agreements WHERE id = NEW.agreement_id;
  IF ag.id IS NULL THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.salons s WHERE s.id = ag.salon_id AND s.owner_id = NEW.signer_id)
    INTO is_owner;

  IF NEW.signer_role = 'owner' THEN
    IF NOT is_owner THEN RAISE EXCEPTION 'Only the salon owner can sign as owner'; END IF;
    UPDATE public.agreements SET owner_signed_at = NEW.signed_at WHERE id = ag.id;
  ELSIF NEW.signer_role = 'renter' THEN
    IF ag.renter_id <> NEW.signer_id THEN RAISE EXCEPTION 'Only the named renter can sign as renter'; END IF;
    UPDATE public.agreements SET renter_signed_at = NEW.signed_at WHERE id = ag.id;
  ELSE
    RAISE EXCEPTION 'Unknown signer role';
  END IF;

  UPDATE public.agreements
  SET status = 'signed', signed_at = GREATEST(owner_signed_at, renter_signed_at)
  WHERE id = ag.id AND owner_signed_at IS NOT NULL AND renter_signed_at IS NOT NULL;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.apply_agreement_signature() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_apply_agreement_signature ON public.agreement_signatures;
CREATE TRIGGER trg_apply_agreement_signature
AFTER INSERT ON public.agreement_signatures
FOR EACH ROW EXECUTE FUNCTION private.apply_agreement_signature();

-- Allow uploads into a salon folder owned by the uploader's salon (owner) as well as own folder
DROP POLICY IF EXISTS agreement_files_write ON storage.objects;
CREATE POLICY agreement_files_write ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'agreements'
  AND ((storage.foldername(name))[1] = auth.uid()::text
       OR EXISTS (SELECT 1 FROM public.salons s WHERE s.owner_id = auth.uid() AND s.id::text = (storage.foldername(name))[1]))
);

DROP POLICY IF EXISTS agreement_files_read ON storage.objects;
CREATE POLICY agreement_files_read ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'agreements'
  AND ((storage.foldername(name))[1] = auth.uid()::text
       OR EXISTS (SELECT 1 FROM public.salons s WHERE s.owner_id = auth.uid()
                  AND (s.id::text = (storage.foldername(name))[1] OR s.id::text = (storage.foldername(name))[2])))
);

-- ===== 20260829174542_46cfabac-b0fe-468b-9445-0a3a7af2df4f.sql =====

CREATE TABLE public.agreement_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  version integer NOT NULL,
  title text NOT NULL,
  body text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agreement_id, version)
);

GRANT SELECT ON public.agreement_versions TO authenticated;
GRANT ALL ON public.agreement_versions TO service_role;

-- ALTER TABLE public.agreement_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agreement_versions_party_select" ON public.agreement_versions
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.agreements a
  WHERE a.id = agreement_versions.agreement_id
    AND (private.owns_salon(a.salon_id) OR a.renter_id = auth.uid())
));

CREATE OR REPLACE FUNCTION private.record_agreement_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version integer;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.title IS NOT DISTINCT FROM OLD.title
     AND NEW.body IS NOT DISTINCT FROM OLD.body THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
  FROM public.agreement_versions WHERE agreement_id = NEW.id;

  INSERT INTO public.agreement_versions (agreement_id, version, title, body, created_by)
  VALUES (NEW.id, next_version, NEW.title, NEW.body, auth.uid());

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_record_agreement_version
AFTER INSERT OR UPDATE OF title, body ON public.agreements
FOR EACH ROW EXECUTE FUNCTION private.record_agreement_version();

INSERT INTO public.agreement_versions (agreement_id, version, title, body, created_by)
SELECT a.id, 1, a.title, a.body, NULL FROM public.agreements a;

-- ===== 20260902195057_8233b704-bf3a-4e93-abc0-29182ac01766.sql =====

ALTER TABLE public.subscriptions
  ALTER COLUMN paddle_subscription_id DROP NOT NULL,
  ALTER COLUMN paddle_customer_id DROP NOT NULL;

ALTER TABLE public.subscriptions
  ADD COLUMN stripe_subscription_id text UNIQUE,
  ADD COLUMN stripe_customer_id text;

CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

-- ===== 20260902202800_a91e6f0c-ee2b-4ccb-95ad-daaf641ef367.sql =====

ALTER TABLE public.chairs
  ADD COLUMN IF NOT EXISTS fee_paid_by text NOT NULL DEFAULT 'salon';

ALTER TABLE public.chairs
  DROP CONSTRAINT IF EXISTS chairs_fee_paid_by_check;

ALTER TABLE public.chairs
  ADD CONSTRAINT chairs_fee_paid_by_check CHECK (fee_paid_by IN ('salon', 'renter'));

-- ===== 20260904041836_71b1a026-58ae-4c15-89ff-7bc4c4449889.sql =====

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS bank_transfer_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS bank_sort_code text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_payment_reference text;

CREATE SEQUENCE IF NOT EXISTS public.payment_receipt_seq START 1000;
GRANT USAGE, SELECT ON SEQUENCE public.payment_receipt_seq TO authenticated;
GRANT ALL ON SEQUENCE public.payment_receipt_seq TO service_role;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS receipt_number text,
  ADD COLUMN IF NOT EXISTS receipt_issued_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.set_payment_receipt_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    NEW.receipt_number := 'RC-' || to_char(now(), 'YYYY') || '-' || nextval('public.payment_receipt_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_receipt_number ON public.payments;
CREATE TRIGGER payments_receipt_number
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_payment_receipt_number();

-- ===== 20260905134130_810bb918-fefd-4eeb-88a9-d115174ee42b.sql =====


-- 1) Lock signed agreements based on real signature state (status alone was unreliable)
DROP POLICY IF EXISTS agreements_owner_update_unsigned ON public.agreements;
DROP POLICY IF EXISTS agreements_owner_delete_unsigned ON public.agreements;

-- 2) Subscription gate helper (any environment counts, so preview/live both work)
CREATE OR REPLACE FUNCTION private.salon_owner_can_manage(_salon_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.salons s
    JOIN public.subscriptions sub ON sub.user_id = s.owner_id
    WHERE s.id = _salon_id
      AND s.owner_id = auth.uid()
      AND (
        (sub.status IN ('active','trialing','past_due')
          AND (sub.current_period_end IS NULL OR sub.current_period_end > now()))
        OR (sub.status = 'canceled' AND sub.current_period_end > now())
      )
  );
$$;

REVOKE ALL ON FUNCTION private.salon_owner_can_manage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.salon_owner_can_manage(uuid) TO authenticated;

-- 3) agreements: owner writes require an unsigned agreement AND an active plan
CREATE POLICY agreements_owner_update_unsigned ON public.agreements
FOR UPDATE TO authenticated
USING (
  private.owns_salon(salon_id)
  AND (owner_signed_at IS NULL OR renter_signed_at IS NULL)
  AND status <> 'signed'::agreement_status
  AND private.salon_owner_can_manage(salon_id)
)
WITH CHECK (private.owns_salon(salon_id));

CREATE POLICY agreements_owner_delete_unsigned ON public.agreements
FOR DELETE TO authenticated
USING (
  private.owns_salon(salon_id)
  AND (owner_signed_at IS NULL OR renter_signed_at IS NULL)
  AND status <> 'signed'::agreement_status
);

DROP POLICY IF EXISTS agreements_owner_insert ON public.agreements;
CREATE POLICY agreements_owner_insert ON public.agreements
FOR INSERT TO authenticated
WITH CHECK (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));

-- 4) Split owner "ALL" policies into read (always) + write (requires active plan)
DROP POLICY IF EXISTS chairs_owner_all ON public.chairs;
CREATE POLICY chairs_owner_select ON public.chairs
FOR SELECT TO authenticated USING (private.owns_salon(salon_id));
CREATE POLICY chairs_owner_write ON public.chairs
FOR INSERT TO authenticated
WITH CHECK (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));
CREATE POLICY chairs_owner_update ON public.chairs
FOR UPDATE TO authenticated
USING (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id))
WITH CHECK (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));
CREATE POLICY chairs_owner_delete ON public.chairs
FOR DELETE TO authenticated
USING (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));

DROP POLICY IF EXISTS invites_owner_all ON public.invites;
CREATE POLICY invites_owner_select ON public.invites
FOR SELECT TO authenticated USING (private.owns_salon(salon_id));
CREATE POLICY invites_owner_insert ON public.invites
FOR INSERT TO authenticated
WITH CHECK (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));
CREATE POLICY invites_owner_update ON public.invites
FOR UPDATE TO authenticated
USING (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id))
WITH CHECK (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));
CREATE POLICY invites_owner_delete ON public.invites
FOR DELETE TO authenticated
USING (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));

DROP POLICY IF EXISTS charges_owner_all ON public.rent_charges;
CREATE POLICY charges_owner_select ON public.rent_charges
FOR SELECT TO authenticated USING (private.owns_salon(salon_id));
CREATE POLICY charges_owner_insert ON public.rent_charges
FOR INSERT TO authenticated
WITH CHECK (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));
CREATE POLICY charges_owner_update ON public.rent_charges
FOR UPDATE TO authenticated
USING (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id))
WITH CHECK (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));
CREATE POLICY charges_owner_delete ON public.rent_charges
FOR DELETE TO authenticated
USING (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));

DROP POLICY IF EXISTS payments_owner_all ON public.payments;
CREATE POLICY payments_owner_select ON public.payments
FOR SELECT TO authenticated USING (private.owns_salon(salon_id));
CREATE POLICY payments_owner_insert ON public.payments
FOR INSERT TO authenticated
WITH CHECK (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));
CREATE POLICY payments_owner_update ON public.payments
FOR UPDATE TO authenticated
USING (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id))
WITH CHECK (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));
CREATE POLICY payments_owner_delete ON public.payments
FOR DELETE TO authenticated
USING (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));

DROP POLICY IF EXISTS members_owner_all ON public.salon_members;
CREATE POLICY members_owner_select ON public.salon_members
FOR SELECT TO authenticated USING (private.owns_salon(salon_id));
CREATE POLICY members_owner_insert ON public.salon_members
FOR INSERT TO authenticated
WITH CHECK (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));
CREATE POLICY members_owner_update ON public.salon_members
FOR UPDATE TO authenticated
USING (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id))
WITH CHECK (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));
CREATE POLICY members_owner_delete ON public.salon_members
FOR DELETE TO authenticated
USING (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));

DROP POLICY IF EXISTS templates_owner_all ON public.agreement_templates;
CREATE POLICY templates_owner_select ON public.agreement_templates
FOR SELECT TO authenticated USING (private.owns_salon(salon_id));
CREATE POLICY templates_owner_insert ON public.agreement_templates
FOR INSERT TO authenticated
WITH CHECK (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));
CREATE POLICY templates_owner_update ON public.agreement_templates
FOR UPDATE TO authenticated
USING (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id))
WITH CHECK (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));
CREATE POLICY templates_owner_delete ON public.agreement_templates
FOR DELETE TO authenticated
USING (private.owns_salon(salon_id) AND private.salon_owner_can_manage(salon_id));

-- ===== 20260906195339_840cceff-ba95-4c08-b450-464f36af8a2b.sql =====

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_account_env text,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean NOT NULL DEFAULT false;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_session_id_key
  ON public.payments (stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- ===== 20260911195653_72a16d9d-45a0-443c-8792-4982ecd03ffc.sql =====

CREATE TABLE public.meta_registration_events (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'eligible' CHECK (status IN ('eligible', 'processing', 'sent', 'blocked')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.meta_registration_events TO service_role;
-- ALTER TABLE public.meta_registration_events ENABLE ROW LEVEL SECURITY;

INSERT INTO public.meta_registration_events (user_id, status, blocked_reason, occurred_at)
SELECT id, 'blocked', 'account_existed_before_meta_registration_tracking', created_at
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requested TEXT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;

  requested := COALESCE(NEW.raw_user_meta_data ->> 'role', 'owner');
  IF requested NOT IN ('owner', 'renter') THEN requested := 'owner'; END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested::public.app_role)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.meta_registration_events (user_id, occurred_at)
  VALUES (NEW.id, COALESCE(NEW.created_at, now()))
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_meta_registration_events_updated
BEFORE UPDATE ON public.meta_registration_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

REVOKE ALL ON public.meta_registration_events FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ===== 20260911195703_84f979e4-0bc5-4146-9905-f3be5b7d0245.sql =====

CREATE POLICY "service_role_only_meta_registration_events"
ON public.meta_registration_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ===== 20260911195745_c71c0d16-31c0-44a4-9433-86d047f1e9e8.sql =====

ALTER TABLE public.meta_registration_events
ADD COLUMN browser_sent_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.claim_meta_registration_event(_user_id UUID)
RETURNS TABLE(event_id UUID, occurred_at TIMESTAMPTZ, status TEXT, browser_sent_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.meta_registration_events AS event
  SET status = 'processing', updated_at = now()
  WHERE event.user_id = _user_id
    AND event.status = 'eligible'
  RETURNING event.event_id, event.occurred_at, event.status, event.browser_sent_at;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_meta_registration_event(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_meta_registration_event(UUID) TO service_role;


