-- Replace task type options with new list.
-- NOT VALID skips checking existing rows so old types (followup, site_survey, other) are preserved.
alter table public.tasks drop constraint if exists tasks_type_check;
alter table public.tasks add constraint tasks_type_check
  check (type in ('amend_quote','amend_design','in_person_meeting','send_info','call','email'))
  not valid;
