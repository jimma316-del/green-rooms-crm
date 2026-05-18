-- Add notes field to tasks
alter table public.tasks add column if not exists notes text;

-- Extend type check constraint to include amend_quote
alter table public.tasks drop constraint if exists tasks_type_check;
alter table public.tasks add constraint tasks_type_check
  check (type in ('call','email','followup','site_survey','amend_quote','other'));
