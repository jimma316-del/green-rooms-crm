-- Rename pre_start → schedule_sent for all existing leads
update leads set stage = 'schedule_sent' where stage = 'pre_start';

-- Add stage_order as a generated column so we can sort by pipeline position
alter table leads add column if not exists stage_order smallint generated always as (
  case stage
    when 'new_lead'           then 1
    when 'sent_sms'           then 2
    when 'sent_brochures'     then 3
    when 'site_survey_booked' then 4
    when 'quoting'            then 5
    when 'quote_sent'         then 6
    when 'followup'           then 7
    when 'final_followup'     then 8
    when 'job_booked'         then 9
    when 'schedule_sent'      then 10
    when 'in_build'           then 11
    when 'completion_due'     then 12
    when 'paid_closed'        then 13
    when 'review_followup'    then 14
    when 'lost'               then 15
    else 99
  end
) stored;

create index if not exists leads_stage_order_idx on leads(stage_order);
