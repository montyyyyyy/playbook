-- Better Auth 1.7 core tables. Identity access is limited to playbook_auth.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE TABLE public.auth_user (
 id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
 "emailVerified" boolean NOT NULL DEFAULT false, image text,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX auth_user_email_lower ON public.auth_user(lower(email));
CREATE TABLE public.auth_session (
 id uuid PRIMARY KEY, token text NOT NULL UNIQUE, "userId" uuid NOT NULL REFERENCES public.auth_user(id) ON DELETE CASCADE,
 "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 "ipAddress" text, "userAgent" text
);
CREATE INDEX auth_session_user ON public.auth_session("userId");
CREATE TABLE public.auth_account (
 id uuid PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL,
 "userId" uuid NOT NULL REFERENCES public.auth_user(id) ON DELETE CASCADE,
 "accessToken" text, "refreshToken" text, "idToken" text,
 "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, scope text, password text,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 UNIQUE("providerId","accountId")
);
CREATE INDEX auth_account_user ON public.auth_account("userId");
CREATE TABLE public.auth_verification (
 id uuid PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamptz NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_verification_identifier ON public.auth_verification(identifier);
CREATE TABLE public.auth_rate_limit (id uuid PRIMARY KEY, key text UNIQUE NOT NULL, count integer NOT NULL, "lastRequest" bigint NOT NULL);
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES public.auth_user(id) ON DELETE CASCADE,
 display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 100), avatar_url text,
 role text NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','editor','viewer')),
 account_status text NOT NULL DEFAULT 'active' CHECK(account_status IN ('active','disabled')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.content_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 type text NOT NULL CHECK(type IN ('article','template','workshop','architecture','use_case')),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200), description text NOT NULL DEFAULT '' CHECK(length(description)<=2000),
 body text NOT NULL DEFAULT '' CHECK(length(body)<=100000), technology text NOT NULL DEFAULT '', category text NOT NULL DEFAULT '',
 tags text[] NOT NULL DEFAULT '{}', details jsonb NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','in_review','approved','published','archived')),
 technical_status text NOT NULL DEFAULT 'current' CHECK(technical_status IN ('current','review_required','outdated')),
 source_reference text NOT NULL DEFAULT '', created_by uuid REFERENCES public.profiles(id), updated_by uuid REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz,
 UNIQUE(type,slug)
);
CREATE INDEX content_status_type ON public.content_items(status,type);
CREATE INDEX content_creator ON public.content_items(created_by);
CREATE INDEX content_search ON public.content_items USING gin(to_tsvector('german',title || ' ' || description || ' ' || body));
CREATE TABLE public.content_assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), content_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
 storage_path text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text, filename text NOT NULL CHECK(filename ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$' AND filename NOT LIKE '%..%'),
 mime_type text NOT NULL CHECK(mime_type IN ('text/plain','text/markdown','text/csv','application/pdf','application/javascript')),
 size integer NOT NULL CHECK(size BETWEEN 1 AND 5242880), data bytea NOT NULL CHECK(octet_length(data)=size),
 created_at timestamptz NOT NULL DEFAULT now(), uploaded_by uuid REFERENCES public.profiles(id)
);
CREATE INDEX assets_content ON public.content_assets(content_id);
CREATE TABLE public.invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL CHECK(length(email)<=254),
 intended_role text NOT NULL DEFAULT 'viewer' CHECK(intended_role IN ('admin','editor','viewer')),
 invited_by uuid REFERENCES public.profiles(id), token_hash text NOT NULL UNIQUE CHECK(length(token_hash)=64),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','revoked')),
 created_at timestamptz NOT NULL DEFAULT now(), accepted_at timestamptz, expires_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX invitation_pending_email ON public.invitations(lower(email)) WHERE status='pending';
CREATE TABLE public.audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES public.profiles(id), action text NOT NULL,
 target_type text NOT NULL, target_id uuid, created_at timestamptz NOT NULL DEFAULT now(), metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX audit_created ON public.audit_events(created_at DESC);
CREATE TABLE private.request_limits (key text PRIMARY KEY, count integer NOT NULL, window_started timestamptz NOT NULL);
-- Session identity comes from a real unexpired database session, not an arbitrary user-id GUC.
CREATE FUNCTION private.actor_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT s."userId" FROM public.auth_session s JOIN public.profiles p ON p.id=s."userId"
 WHERE s.token=nullif(current_setting('app.session_token',true),'') AND s."expiresAt">now() AND p.account_status='active'
$$;
CREATE FUNCTION private.actor_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT role FROM public.profiles WHERE id=private.actor_id()
$$;
REVOKE ALL ON FUNCTION private.actor_id(), private.actor_role() FROM PUBLIC;
GRANT USAGE ON SCHEMA public,private TO playbook_app,playbook_auth;
GRANT EXECUTE ON FUNCTION private.actor_id(), private.actor_role() TO playbook_app;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['auth_user','auth_session','auth_account','auth_verification','auth_rate_limit'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY auth_only ON public.%I TO playbook_auth USING (true) WITH CHECK (true)',t);
 EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO playbook_auth',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['profiles','content_items','content_assets','invitations','audit_events'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 END LOOP;
END $$;
ALTER TABLE private.request_limits ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles,public.content_items,public.content_assets,public.invitations,public.audit_events TO playbook_app;
GRANT INSERT ON public.content_items,public.content_assets,public.invitations TO playbook_app;
GRANT UPDATE ON public.content_items TO playbook_app;
GRANT UPDATE(display_name) ON public.profiles TO playbook_app;
CREATE POLICY profile_read ON public.profiles FOR SELECT TO playbook_app USING(id=private.actor_id() OR private.actor_role()='admin');
CREATE POLICY profile_name ON public.profiles FOR UPDATE TO playbook_app USING(id=private.actor_id()) WITH CHECK(id=private.actor_id());
CREATE POLICY content_read ON public.content_items FOR SELECT TO playbook_app USING(
 private.actor_role()='admin' OR (private.actor_id() IS NOT NULL AND status='published') OR
 (private.actor_role()='editor' AND created_by=private.actor_id() AND status IN ('draft','in_review')));
CREATE POLICY content_create ON public.content_items FOR INSERT TO playbook_app WITH CHECK(
 private.actor_role()='admin' OR (private.actor_role()='editor' AND created_by=private.actor_id() AND status='draft'));
CREATE POLICY content_update ON public.content_items FOR UPDATE TO playbook_app USING(
 private.actor_role()='admin' OR (private.actor_role()='editor' AND created_by=private.actor_id() AND status IN ('draft','in_review')))
 WITH CHECK(private.actor_role()='admin' OR (private.actor_role()='editor' AND created_by=private.actor_id() AND status IN ('draft','in_review')));
CREATE POLICY asset_read ON public.content_assets FOR SELECT TO playbook_app USING(EXISTS(SELECT 1 FROM public.content_items c WHERE c.id=content_id));
CREATE POLICY asset_insert ON public.content_assets FOR INSERT TO playbook_app WITH CHECK(
 private.actor_role()='admin' OR (private.actor_role()='editor' AND uploaded_by=private.actor_id() AND EXISTS(SELECT 1 FROM public.content_items c WHERE c.id=content_id AND c.created_by=private.actor_id() AND c.status IN ('draft','in_review'))));
CREATE POLICY invite_read ON public.invitations FOR SELECT TO playbook_app USING(private.actor_role()='admin');
CREATE POLICY invite_insert ON public.invitations FOR INSERT TO playbook_app WITH CHECK(private.actor_role()='admin' AND invited_by=private.actor_id() AND status='pending' AND expires_at>now() AND expires_at<=now()+interval '8 days');
CREATE POLICY audit_read ON public.audit_events FOR SELECT TO playbook_app USING(private.actor_role()='admin');
-- Immutable attribution and publication restrictions also cover direct SQL updates/upserts.
CREATE FUNCTION private.guard_content() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=private.actor_id(); actor_role text:=private.actor_role(); BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' THEN NEW.created_by:=actor; NEW.created_at:=now();
 ELSE NEW.created_by:=OLD.created_by; NEW.created_at:=OLD.created_at; NEW.id:=OLD.id;
 END IF;
 IF actor_role NOT IN ('admin','editor') THEN RAISE EXCEPTION 'Write denied' USING ERRCODE='42501'; END IF;
 IF actor_role='editor' AND ((TG_OP='INSERT' AND NEW.status<>'draft') OR NEW.status NOT IN ('draft','in_review') OR NEW.created_by<>actor) THEN
 RAISE EXCEPTION 'Publication denied' USING ERRCODE='42501'; END IF;
 NEW.updated_by:=actor; NEW.updated_at:=now();
 IF actor_role='admin' AND NEW.status='published' THEN NEW.published_at:=coalesce(NEW.published_at,now());
 ELSIF TG_OP='INSERT' THEN NEW.published_at:=NULL;
 ELSE NEW.published_at:=OLD.published_at; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER guard_content BEFORE INSERT OR UPDATE ON public.content_items FOR EACH ROW EXECUTE FUNCTION private.guard_content();
CREATE FUNCTION private.audit_content() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 INSERT INTO public.audit_events(actor_id,action,target_type,target_id,metadata) VALUES(private.actor_id(),
 CASE WHEN TG_OP='INSERT' THEN 'content_created' WHEN NEW.status='published' THEN 'content_published' WHEN NEW.status='archived' THEN 'content_archived' ELSE 'content_updated' END,
 'content',NEW.id,jsonb_build_object('status',NEW.status)); RETURN NEW; END $$;
CREATE TRIGGER audit_content AFTER INSERT OR UPDATE ON public.content_items FOR EACH ROW EXECUTE FUNCTION private.audit_content();
CREATE FUNCTION private.manage_user(target uuid,new_role text,new_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE previous public.profiles; BEGIN
 IF private.actor_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(61720301);
 SELECT * INTO STRICT previous FROM public.profiles WHERE id=target FOR UPDATE;
 IF previous.role='admin' AND previous.account_status='active' AND (new_role<>'admin' OR new_status<>'active') AND
 (SELECT count(*) FROM public.profiles WHERE role='admin' AND account_status='active')<=1 THEN RAISE EXCEPTION 'Last administrator must remain active'; END IF;
 UPDATE public.profiles SET role=new_role,account_status=new_status,updated_at=now() WHERE id=target;
 IF new_status='disabled' OR new_role<>previous.role THEN DELETE FROM public.auth_session WHERE "userId"=target; END IF;
 INSERT INTO public.audit_events(actor_id,action,target_type,target_id,metadata) VALUES(private.actor_id(),
 CASE WHEN new_status='disabled' THEN 'user_disabled' ELSE 'user_role_changed' END,'profile',target,jsonb_build_object('role',new_role,'status',new_status));
END $$;
CREATE FUNCTION private.accept_invitation(invite_hash text,password_hash text,display_name text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE inv public.invitations; user_id uuid:=gen_random_uuid(); BEGIN
 SELECT * INTO inv FROM public.invitations WHERE token_hash=invite_hash AND status='pending' AND expires_at>now() FOR UPDATE;
 IF inv.id IS NULL THEN RAISE EXCEPTION 'Invalid or expired invitation'; END IF;
 IF length(display_name) NOT BETWEEN 1 AND 100 OR length(password_hash)<64 THEN RAISE EXCEPTION 'Invalid account data'; END IF;
 INSERT INTO public.auth_user(id,name,email,"emailVerified") VALUES(user_id,display_name,lower(inv.email),true);
 INSERT INTO public.auth_account(id,"accountId","providerId","userId",password) VALUES(gen_random_uuid(),user_id::text,'credential',user_id,password_hash);
 INSERT INTO public.profiles(id,display_name,role) VALUES(user_id,display_name,inv.intended_role);
 UPDATE public.invitations SET status='accepted',accepted_at=now() WHERE id=inv.id;
 INSERT INTO public.audit_events(actor_id,action,target_type,target_id) VALUES(user_id,'invitation_accepted','invitation',inv.id);
 RETURN user_id;
END $$;
CREATE FUNCTION private.limit_request(request_key text,maximum integer,seconds integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE total integer; BEGIN
 IF length(request_key)>256 OR maximum NOT BETWEEN 1 AND 100 OR seconds NOT BETWEEN 1 AND 86400 THEN RAISE EXCEPTION 'Invalid limit'; END IF;
 INSERT INTO private.request_limits(key,count,window_started) VALUES(request_key,1,now()) ON CONFLICT(key) DO UPDATE SET
 count=CASE WHEN private.request_limits.window_started<now()-make_interval(secs=>seconds) THEN 1 ELSE private.request_limits.count+1 END,
 window_started=CASE WHEN private.request_limits.window_started<now()-make_interval(secs=>seconds) THEN now() ELSE private.request_limits.window_started END RETURNING count INTO total;
 RETURN total<=maximum;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.manage_user(uuid,text,text) TO playbook_app;
GRANT EXECUTE ON FUNCTION private.accept_invitation(text,text,text),private.limit_request(text,integer,integer) TO playbook_auth;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
