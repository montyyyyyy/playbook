-- Better Auth's database rate limiter inserts without an explicit id.
ALTER TABLE public.auth_rate_limit ALTER COLUMN id SET DEFAULT gen_random_uuid();
-- Capture the actor before session revocation, including self-demotion.
CREATE OR REPLACE FUNCTION private.manage_user(target uuid,new_role text,new_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE previous public.profiles; actor uuid:=private.actor_id(); BEGIN
 IF private.actor_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(61720301);
 SELECT * INTO STRICT previous FROM public.profiles WHERE id=target FOR UPDATE;
 IF previous.role='admin' AND previous.account_status='active' AND (new_role<>'admin' OR new_status<>'active') AND
 (SELECT count(*) FROM public.profiles WHERE role='admin' AND account_status='active')<=1 THEN RAISE EXCEPTION 'Last administrator must remain active'; END IF;
 UPDATE public.profiles SET role=new_role,account_status=new_status,updated_at=now() WHERE id=target;
 IF new_status='disabled' OR new_role<>previous.role THEN DELETE FROM public.auth_session WHERE "userId"=target; END IF;
 INSERT INTO public.audit_events(actor_id,action,target_type,target_id,metadata) VALUES(actor,
 CASE WHEN new_status='disabled' THEN 'user_disabled' ELSE 'user_role_changed' END,'profile',target,jsonb_build_object('role',new_role,'status',new_status));
END $$;
