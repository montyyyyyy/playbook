CREATE FUNCTION private.revoke_invitation(invite_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF private.actor_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 UPDATE public.invitations SET status='revoked' WHERE id=invite_id AND status='pending';
 IF FOUND THEN INSERT INTO public.audit_events(actor_id,action,target_type,target_id) VALUES(private.actor_id(),'invitation_revoked','invitation',invite_id); END IF;
END $$;
REVOKE ALL ON FUNCTION private.revoke_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.revoke_invitation(uuid) TO playbook_app;
