alter table public.tasks drop constraint if exists tasks_type_check;
alter table public.tasks add constraint tasks_type_check
  check (type in ('quote','amend_quote','amend_design','in_person_meeting','send_info','whatsapp','call','email'))
  not valid;
