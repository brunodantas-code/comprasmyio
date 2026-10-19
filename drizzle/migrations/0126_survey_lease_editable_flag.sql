DO $$ DECLARE d text; BEGIN
 d := pg_get_functiondef('public.survey_point_edit_lease(uuid,text,uuid,boolean,boolean)'::regprocedure);
 d := replace(d, 'v_lock.user_id = auth.uid() AND (v_lock.session_id = _session_id OR NOT _acquire OR _release)', 'v_lock.user_id = auth.uid() AND v_lock.session_id = _session_id');
 EXECUTE d;
END $$;