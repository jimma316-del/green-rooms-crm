alter table public.leads
  add column if not exists payment_1_amount integer,
  add column if not exists payment_1_due    date,
  add column if not exists payment_2_amount integer,
  add column if not exists payment_2_due    date;
