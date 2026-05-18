-- Migrate old project stages to new ones
update leads set stage = 'schedule_sent_to_client', pipeline = 'project' where stage = 'schedule_sent';
update leads set stage = 'snagging',                pipeline = 'project' where stage = 'completion_due';
update leads set stage = 'snagging',                pipeline = 'project' where stage = 'review_followup';

-- Recreate stage_order with updated project stage ordering
alter table leads drop column if exists stage_order;
alter table leads add column stage_order smallint generated always as (
  case stage
    when 'new_lead'                then 1
    when 'sent_sms'                then 2
    when 'sent_brochures'          then 3
    when 'site_survey_booked'      then 4
    when 'quoting'                 then 5
    when 'quote_sent'              then 6
    when 'followup'                then 7
    when 'final_followup'          then 8
    when 'job_booked'              then 9
    when 'doors_windows_ordered'   then 10
    when 'final_designs_confirmed' then 11
    when 'design_book_created'     then 12
    when 'schedule_sent_to_client' then 13
    when 'in_build'                then 14
    when 'paid_closed'             then 15
    when 'snagging'                then 16
    when 'lost'                    then 17
    else 99
  end
) stored;

create index if not exists leads_stage_order_idx on leads(stage_order);
