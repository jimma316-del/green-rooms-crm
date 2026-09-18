import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoAdvanceSiteVisits, autoAdvanceToAwaitingPayment, autoAdvanceOnJobDates } from '@/lib/autoAdvance'
import { LeadHeader } from '@/components/leads/LeadHeader'
import { LeadContact } from '@/components/leads/LeadContact'
import { LeadProject } from '@/components/leads/LeadProject'
import { LeadDates } from '@/components/leads/LeadDates'
import { TasksList } from '@/components/tasks/TasksList'
import { ActivityFeed } from '@/components/leads/ActivityFeed'
import { LeadAnalytics } from '@/components/leads/LeadAnalytics'
import { MergeBanner } from '@/components/leads/MergeBanner'
import { SignOffRecord } from '@/components/leads/SignOffRecord'
import { NewQuoteButton } from '@/components/quotes/NewQuoteButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LeadPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const admin = createAdminClient()
  await Promise.all([
    autoAdvanceSiteVisits(supabase),
    autoAdvanceToAwaitingPayment(admin),
    autoAdvanceOnJobDates(admin),
  ])

  const [
    { data: lead },
    { data: tasks },
    { data: activities },
    { data: assessment },
    { data: quotes },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('*, users(id, full_name, avatar_url)')
      .eq('id', id)
      .single(),
    supabase
      .from('tasks')
      .select('*, users!tasks_assigned_to_fkey(full_name)')
      .eq('lead_id', id)
      .is('completed_at', null)
      .order('due_date', { ascending: true }),
    supabase
      .from('activities')
      .select('id, type, body, created_at, users(full_name, avatar_url)')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('site_assessments')
      .select('id, width_m, depth_m, updated_at')
      .eq('lead_id', id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('quotes')
      .select('id, quote_ref, created_at, quote_versions(id, version_number, status, total_pence, is_current)')
      .eq('lead_id', id)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  if (!lead) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedLead = lead as any

  // Check for duplicate leads with same email
  let duplicateLead: { id: string; name: string; created_at: string } | null = null
  if (typedLead.email) {
    const { data: dups } = await supabase
      .from('leads')
      .select('id, name, created_at')
      .eq('email', typedLead.email)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(1)
    if (dups && dups.length > 0) duplicateLead = dups[0] as { id: string; name: string; created_at: string }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
      <LeadHeader lead={lead} />

      {duplicateLead && (
        <MergeBanner leadId={id} duplicate={duplicateLead} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Left column */}
        <div className="md:col-span-1 space-y-4">
          <LeadContact lead={lead} />
          <LeadDates lead={lead} />
          <LeadAnalytics calculatorData={typedLead.calculator_data as Record<string, unknown> | null} createdAt={typedLead.created_at} />
          {typedLead.signed_off_at && (
            <SignOffRecord
              signedOffAt={typedLead.signed_off_at}
              satisfied={typedLead.sign_off_satisfied ?? null}
              details={typedLead.sign_off_details ?? null}
              comments={typedLead.sign_off_comments ?? null}
              customerSigUrl={typedLead.customer_sig_url ?? null}
              pmSigUrl={typedLead.pm_sig_url ?? null}
            />
          )}
        </div>

        {/* Right column */}
        <div className="md:col-span-2 space-y-4">
          <LeadProject lead={lead} />

          {/* Assessment & Quote card */}
          <div className="bg-white rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-[var(--primary)] mb-3">Site Assessment & Quote</h2>
            <div className="grid grid-cols-2 gap-3">
              <a href={`/leads/${id}/assessment`}
                className="flex flex-col gap-1 p-3 rounded-lg border border-gray-200 hover:border-[var(--primary)] hover:bg-gray-50 transition-colors">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assessment</span>
                {assessment ? (
                  <>
                    <span className="text-sm font-medium text-gray-900">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(assessment as any).width_m}m × {(assessment as any).depth_m}m
                    </span>
                    <span className="text-xs text-green-600">✓ Completed — edit ↗</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-400">Not started</span>
                    <span className="text-xs text-[var(--primary)]">Start assessment ↗</span>
                  </>
                )}
              </a>

              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {quotes && (quotes as any[]).length > 0 ? (() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const q = (quotes as any[])[0]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const currentV = (q.quote_versions ?? []).find((v: any) => v.is_current) ?? q.quote_versions?.[0]
                const totalPence = currentV?.total_pence ?? 0
                return (
                  <a href={`/leads/${id}/quotes/${q.id}`}
                    className="flex flex-col gap-1 p-3 rounded-lg border border-gray-200 hover:border-[var(--primary)] hover:bg-gray-50 transition-colors">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quote</span>
                    <span className="text-sm font-medium text-gray-900">{q.quote_ref}</span>
                    <span className="text-xs text-gray-500 capitalize">
                      {currentV?.status ?? 'draft'}
                      {totalPence > 0 && ` · £${(totalPence / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`}
                    </span>
                    <span className="text-xs text-[var(--primary)]">Edit quote ↗</span>
                  </a>
                )
              })() : (
                <NewQuoteButton leadId={id} hasAssessment={!!assessment} />
              )}
            </div>
          </div>

          <TasksList tasks={tasks ?? []} leadId={id} />
          <ActivityFeed activities={activities ?? []} leadId={id} />
        </div>
      </div>
    </div>
  )
}
