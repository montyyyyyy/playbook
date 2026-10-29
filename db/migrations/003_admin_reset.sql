CREATE FUNCTION private.issue_reset(target uuid,reset_token text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF private.actor_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=target AND account_status='active') OR length(reset_token)<>64 THEN RAISE EXCEPTION 'Invalid target'; END IF;
 DELETE FROM public.auth_verification WHERE value=target::text AND identifier LIKE 'reset-password:%';
 INSERT INTO public.auth_verification(id,identifier,value,"expiresAt") VALUES(gen_random_uuid(),'reset-password:'||reset_token,target::text,now()+interval '30 minutes');
 INSERT INTO public.audit_events(actor_id,action,target_type,target_id) VALUES(private.actor_id(),'password_reset_issued','profile',target);
END $$;
REVOKE ALL ON FUNCTION private.issue_reset(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.issue_reset(uuid,text) TO playbook_app;
