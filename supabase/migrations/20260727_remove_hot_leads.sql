-- Merge final_followup into followup
UPDATE leads SET stage = 'followup' WHERE stage = 'final_followup';
