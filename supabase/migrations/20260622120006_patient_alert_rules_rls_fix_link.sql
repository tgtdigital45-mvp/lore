-- Use staff_has_approved_patient_link directly so staff policies do not break when
-- patients_select_consolidated requires an approved patient_hospital_links record.

DROP POLICY IF EXISTS "patient_alert_rules_select_staff" ON public.patient_alert_rules;
CREATE POLICY "patient_alert_rules_select_staff"
ON public.patient_alert_rules FOR SELECT TO authenticated
USING (public.staff_has_approved_patient_link(patient_id));

DROP POLICY IF EXISTS "patient_alert_rules_staff_insert" ON public.patient_alert_rules;
CREATE POLICY "patient_alert_rules_staff_insert"
ON public.patient_alert_rules FOR INSERT TO authenticated
WITH CHECK (public.staff_has_approved_patient_link(patient_id));

DROP POLICY IF EXISTS "patient_alert_rules_staff_update" ON public.patient_alert_rules;
CREATE POLICY "patient_alert_rules_staff_update"
ON public.patient_alert_rules FOR UPDATE TO authenticated
USING (public.staff_has_approved_patient_link(patient_id))
WITH CHECK (public.staff_has_approved_patient_link(patient_id));

DROP POLICY IF EXISTS "patient_alert_rules_staff_delete" ON public.patient_alert_rules;
CREATE POLICY "patient_alert_rules_staff_delete"
ON public.patient_alert_rules FOR DELETE TO authenticated
USING (public.staff_has_approved_patient_link(patient_id));
