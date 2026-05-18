alter table leads add column if not exists is_newsletter boolean not null default false;
create index if not exists leads_is_newsletter_idx on leads(is_newsletter);
