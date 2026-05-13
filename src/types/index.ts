export type UserRole = 'admin' | 'sales' | 'operations'

export type Pipeline = 'sales' | 'project' | 'lost'

export type SalesStage =
  | 'new_lead'
  | 'sent_sms'
  | 'sent_brochures'
  | 'site_survey_booked'
  | 'quoting'
  | 'quote_sent'
  | 'followup'
  | 'final_followup'
  | 'job_booked'

export type ProjectStage =
  | 'pre_start'
  | 'job_booked'
  | 'in_build'
  | 'completion_due'
  | 'paid_closed'
  | 'review_followup'

export type LostStage = 'lost'

export type Stage = SalesStage | ProjectStage | LostStage

export type LostReason =
  | 'too_expensive'
  | 'went_with_competitor'
  | 'delayed_indefinitely'
  | 'no_response'
  | 'planning_issue'
  | 'diy'
  | 'not_suitable'
  | 'other'

export type LeadSource =
  | 'manual'
  | 'referral'
  | 'instagram'
  | 'facebook'
  | 'google'
  | 'google_organic'
  | 'phone'
  | 'other'
  | 'website_form'
  | 'calculator'

export type ProjectType =
  | 'garden_room'
  | 'office'
  | 'gym'
  | 'golf_sim'
  | 'studio'
  | 'other'

export type ActivityType =
  | 'note'
  | 'call'
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'stage_change'
  | 'task_created'
  | 'task_completed'
  | 'file_uploaded'
  | 'quote_created'
  | 'quote_sent'
  | 'payment_recorded'
  | 'lead_created'

export type TaskType = 'amend_quote' | 'amend_design' | 'in_person_meeting' | 'send_info' | 'call' | 'email'

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  amend_quote:       'Amend Quote',
  amend_design:      'Amend Design',
  in_person_meeting: 'In Person Meeting',
  send_info:         'Send Info',
  call:              'Call',
  email:             'Email',
}
export type TaskPriority = 'low' | 'normal' | 'high'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  phone?: string
  created_at: string
}

export interface Lead {
  id: string
  created_at: string
  updated_at: string
  name: string
  mobile?: string
  email?: string
  address?: string
  postcode?: string
  project_type?: ProjectType
  budget_min?: number
  budget_max?: number
  approx_size_sqm?: number
  notes?: string
  stage: Stage
  pipeline: Pipeline
  lost_reason?: LostReason
  lost_notes?: string
  lead_source?: LeadSource
  source_referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  assigned_to?: string
  calculator_data?: Record<string, unknown>
  is_hot: boolean
  tags: string[]
  assigned_user?: User
  open_tasks_count?: number
  last_activity_at?: string
}

export interface Activity {
  id: string
  lead_id: string
  created_at: string
  created_by: string
  type: ActivityType
  body?: string
  metadata?: Record<string, unknown>
  created_by_user?: User
}

export interface Task {
  id: string
  lead_id: string
  created_by: string
  assigned_to: string
  title: string
  due_date?: string
  completed_at?: string
  completed_by?: string
  priority: TaskPriority
  type: TaskType
  lead?: Lead
  assigned_user?: User
}

export interface Quote {
  id: string
  lead_id: string
  created_by: string
  created_at: string
  quote_number: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected'
  total_amount: number
  line_items: QuoteLineItem[]
  notes?: string
  sent_at?: string
  viewed_at?: string
  responded_at?: string
  file_url?: string
}

export interface QuoteLineItem {
  description: string
  quantity: number
  unit_price: number
}

export interface Payment {
  id: string
  lead_id: string
  type: 'deposit' | 'final' | 'other'
  amount: number
  received_at: string
  recorded_by: string
  notes?: string
}

export interface StageHistory {
  id: string
  lead_id: string
  from_stage?: Stage
  to_stage: Stage
  changed_by: string
  changed_at: string
  note?: string
  changed_by_user?: User
}

// Stage config for labels, pipeline grouping, colours
export const STAGE_CONFIG: Record<string, { label: string; pipeline: Pipeline; color: string }> = {
  new_lead:             { label: 'New Lead',              pipeline: 'sales',   color: 'bg-slate-100 text-slate-700' },
  sent_sms:             { label: 'Sent SMS',              pipeline: 'sales',   color: 'bg-yellow-100 text-yellow-800' },
  sent_brochures:       { label: 'Sent Brochures',        pipeline: 'sales',   color: 'bg-blue-100 text-blue-800' },
  site_survey_booked:   { label: 'Site Survey Booked',    pipeline: 'sales',   color: 'bg-purple-100 text-purple-800' },
  quoting:              { label: 'Quoting',               pipeline: 'sales',   color: 'bg-indigo-100 text-indigo-800' },
  quote_sent:           { label: 'Quote Sent',            pipeline: 'sales',   color: 'bg-orange-100 text-orange-800' },
  followup:             { label: 'Follow-Up',             pipeline: 'sales',   color: 'bg-amber-100 text-amber-800' },
  final_followup:       { label: 'Final Follow-Up',       pipeline: 'sales',   color: 'bg-rose-100 text-rose-800' },
  job_booked:           { label: 'Job Booked',            pipeline: 'sales',   color: 'bg-green-100 text-green-800' },
  pre_start:            { label: 'Pre-Start',             pipeline: 'project', color: 'bg-teal-100 text-teal-800' },
  in_build:             { label: 'In Build',              pipeline: 'project', color: 'bg-sky-100 text-sky-800' },
  completion_due:       { label: 'Completion Due',        pipeline: 'project', color: 'bg-rose-100 text-rose-800' },
  paid_closed:          { label: 'Paid / Closed',         pipeline: 'project', color: 'bg-emerald-100 text-emerald-800' },
  review_followup:      { label: 'Review Follow-Up',      pipeline: 'project', color: 'bg-lime-100 text-lime-800' },
  lost:                 { label: 'Lost',                  pipeline: 'lost',    color: 'bg-red-100 text-red-700' },
}

export const SALES_STAGES: SalesStage[] = [
  'new_lead', 'sent_sms', 'sent_brochures', 'site_survey_booked',
  'quoting', 'quote_sent', 'followup', 'final_followup', 'job_booked',
]

export const PROJECT_STAGES: ProjectStage[] = [
  'pre_start', 'job_booked', 'in_build', 'completion_due', 'paid_closed', 'review_followup',
]

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  too_expensive:       'Too Expensive',
  went_with_competitor:'Went with Competitor',
  delayed_indefinitely:'Delayed Indefinitely',
  no_response:         'No Response',
  planning_issue:      'Planning Issue',
  diy:                 'DIY',
  not_suitable:        'Not Suitable',
  other:               'Other',
}

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  manual:       'Manual Entry',
  referral:     'Referral',
  instagram:    'Instagram',
  facebook:     'Facebook',
  google:         'Google - Paid',
  google_organic: 'Google - Organic',
  phone:        'Phone Call',
  other:        'Other',
  website_form: 'Website Form',
  calculator:   'Calculator',
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  garden_room: 'Garden Room',
  office:      'Home Office',
  gym:         'Gym / Fitness',
  golf_sim:    'Golf Simulator',
  studio:      'Studio',
  other:       'Other',
}
