export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type R = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] }

type TableDef<Row extends Record<string, unknown>, Insert extends Record<string, unknown>, Update extends Record<string, unknown>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: R[]
}

type UsersRow = { id: string; email: string; full_name: string; role: string; avatar_url: string | null; phone: string | null; created_at: string }
type UsersInsert = { id: string; email: string; full_name: string; role?: string; avatar_url?: string | null; phone?: string | null; created_at?: string }
type UsersUpdate = Partial<UsersInsert>

type LeadsRow = {
  id: string; created_at: string; updated_at: string; name: string; mobile: string | null; email: string | null
  address: string | null; postcode: string | null; project_type: string | null; budget_min: number | null
  budget_max: number | null; approx_size_sqm: number | null; notes: string | null; stage: string; pipeline: string
  lost_reason: string | null; lost_notes: string | null; lead_source: string | null; source_referrer: string | null
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; assigned_to: string | null
  calculator_data: Json | null; is_hot: boolean; tags: string[]
}
type LeadsInsert = {
  id?: string; created_at?: string; updated_at?: string; name: string; mobile?: string | null; email?: string | null
  address?: string | null; postcode?: string | null; project_type?: string | null; budget_min?: number | null
  budget_max?: number | null; approx_size_sqm?: number | null; notes?: string | null; stage?: string; pipeline?: string
  lost_reason?: string | null; lost_notes?: string | null; lead_source?: string | null; source_referrer?: string | null
  utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; assigned_to?: string | null
  calculator_data?: Json | null; is_hot?: boolean; tags?: string[]
}
type LeadsUpdate = Partial<LeadsInsert>

type ActivitiesRow = { id: string; lead_id: string; created_at: string; created_by: string; type: string; body: string | null; metadata: Json | null }
type ActivitiesInsert = { id?: string; lead_id: string; created_at?: string; created_by: string; type: string; body?: string | null; metadata?: Json | null }
type ActivitiesUpdate = Partial<ActivitiesInsert>

type TasksRow = { id: string; lead_id: string; created_by: string; assigned_to: string; title: string; due_date: string | null; completed_at: string | null; completed_by: string | null; priority: string; type: string }
type TasksInsert = { id?: string; lead_id: string; created_by: string; assigned_to: string; title: string; due_date?: string | null; completed_at?: string | null; completed_by?: string | null; priority?: string; type?: string }
type TasksUpdate = Partial<TasksInsert>

type QuotesRow = { id: string; lead_id: string; created_by: string; created_at: string; quote_number: string; status: string; total_amount: number; line_items: Json; notes: string | null; sent_at: string | null; viewed_at: string | null; responded_at: string | null; file_url: string | null }
type QuotesInsert = { id?: string; lead_id: string; created_by: string; created_at?: string; quote_number: string; status?: string; total_amount?: number; line_items?: Json; notes?: string | null; sent_at?: string | null; viewed_at?: string | null; responded_at?: string | null; file_url?: string | null }
type QuotesUpdate = Partial<QuotesInsert>

type PaymentsRow = { id: string; lead_id: string; type: string; amount: number; received_at: string; recorded_by: string; notes: string | null }
type PaymentsInsert = { id?: string; lead_id: string; type: string; amount: number; received_at?: string; recorded_by: string; notes?: string | null }
type PaymentsUpdate = Partial<PaymentsInsert>

type StageHistoryRow = { id: string; lead_id: string; from_stage: string | null; to_stage: string; changed_by: string; changed_at: string; note: string | null }
type StageHistoryInsert = { id?: string; lead_id: string; from_stage?: string | null; to_stage: string; changed_by: string; changed_at?: string; note?: string | null }
type StageHistoryUpdate = Partial<StageHistoryInsert>

export interface Database {
  public: {
    Tables: {
      users: TableDef<UsersRow, UsersInsert, UsersUpdate>
      leads: TableDef<LeadsRow, LeadsInsert, LeadsUpdate>
      activities: TableDef<ActivitiesRow, ActivitiesInsert, ActivitiesUpdate>
      tasks: TableDef<TasksRow, TasksInsert, TasksUpdate>
      quotes: TableDef<QuotesRow, QuotesInsert, QuotesUpdate>
      payments: TableDef<PaymentsRow, PaymentsInsert, PaymentsUpdate>
      stage_history: TableDef<StageHistoryRow, StageHistoryInsert, StageHistoryUpdate>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
