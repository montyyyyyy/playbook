CREATE FUNCTION private.user_active(user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=user_id AND account_status='active')
$$;
REVOKE ALL ON FUNCTION private.user_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.user_active(uuid) TO playbook_auth;
CREATE FUNCTION private.audit_invitation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 INSERT INTO public.audit_events(actor_id,action,target_type,target_id,metadata) VALUES(NEW.invited_by,'user_invited','invitation',NEW.id,jsonb_build_object('role',NEW.intended_role)); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.audit_invitation() FROM PUBLIC;
CREATE TRIGGER audit_invitation AFTER INSERT ON public.invitations FOR EACH ROW EXECUTE FUNCTION private.audit_invitation();
