-- Enable Realtime on leads table so the CRM can receive live INSERT notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
