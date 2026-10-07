-- Add 'snagging' to the tasks type constraint
-- Previously missing, causing snagging task saves to fail silently
alter table public.tasks drop constraint if exists tasks_type_check;
alter table public.tasks add constraint tasks_type_check
  check (type in (
    'quote','amend_quote','amend_design','in_person_meeting',
    'send_info','whatsapp','call','email','quote_followup','snagging'
  ))
  not valid;
