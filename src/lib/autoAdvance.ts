import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

type Client = SupabaseClient<Database>

export async function autoAdvanceSiteVisits(supabase: Client) {
  try {
    // Fetch all site_survey_booked leads that have a site_visit_date set
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, name, site_visit_date')
      .eq('stage', 'site_survey_booked')

    if (error) {
      console.error('[autoAdvance] fetch error:', error.message)
      return
    }

    const now = new Date()
    const due = (leads ?? []).filter(
      l => l.site_visit_date && new Date(l.site_visit_date) <= now
    )

    if (!due.length) return

    for (const lead of due) {
      const siteVisitTitle = `${lead.name} Site Visit`
      const quoteTitle = `${lead.name} Quote`

      const { error: stageErr } = await supabase
        .from('leads')
        .update({ stage: 'quoting' })
        .eq('id', lead.id)

      if (stageErr) {
        console.error(`[autoAdvance] stage update failed for ${lead.id}:`, stageErr.message)
        continue
      }

      await supabase.from('stage_history').insert({
        lead_id: lead.id,
        from_stage: 'site_survey_booked',
        to_stage: 'quoting',
        changed_by: null,
        note: 'Auto-advanced after site visit',
      })

      await supabase.from('activities').insert({
        lead_id: lead.id,
        created_by: null,
        type: 'stage_change',
        body: 'Auto-advanced to Quoting after site visit',
      })

      await supabase
        .from('tasks')
        .update({ title: quoteTitle })
        .eq('lead_id', lead.id)
        .eq('title', siteVisitTitle)
        .is('completed_at', null)
    }
  } catch (err) {
    console.error('[autoAdvance] unexpected error:', err)
  }
}

export async function autoAdvanceOnJobDates(supabase: Client) {
  try {
    const today = new Date().toISOString().slice(0, 10)

    // Leads in the sales pipeline that have job dates set
    const { data: leads } = await supabase
      .from('leads')
      .select('id, stage, job_date, job_end_date')
      .eq('pipeline', 'sales')
      .not('job_date', 'is', null)

    if (!leads?.length) return

    for (const lead of leads) {
      const fromStage = lead.stage

      let toStage: string
      if (lead.job_end_date && lead.job_end_date <= today) {
        toStage = 'awaiting_payment'
      } else if (lead.job_date! <= today) {
        toStage = 'in_build'
      } else {
        toStage = 'schedule_sent_to_client'
      }

      const { error } = await supabase
        .from('leads')
        .update({ stage: toStage, pipeline: 'project' })
        .eq('id', lead.id)

      if (error) {
        console.error(`[autoAdvance] job dates update failed for ${lead.id}:`, error.message)
        continue
      }

      await supabase.from('stage_history').insert({
        lead_id: lead.id,
        from_stage: fromStage,
        to_stage: toStage,
        changed_by: null,
        note: 'Auto-moved to project pipeline — job dates set',
      })

      await supabase.from('activities').insert({
        lead_id: lead.id,
        created_by: null,
        type: 'stage_change',
        body: `Auto-moved to project pipeline (${toStage.replace(/_/g, ' ')}) — job dates set`,
      })
    }
  } catch (err) {
    console.error('[autoAdvance] job dates error:', err)
  }
}

export async function autoAdvanceToAwaitingPayment(supabase: Client) {
  try {
    const today = new Date().toISOString().slice(0, 10)

    const { data: leads } = await supabase
      .from('leads')
      .select('id')
      .eq('stage', 'in_build')
      .not('job_end_date', 'is', null)
      .lte('job_end_date', today)

    if (!leads?.length) return

    for (const lead of leads) {
      const { error } = await supabase
        .from('leads')
        .update({ stage: 'awaiting_payment' })
        .eq('id', lead.id)

      if (error) {
        console.error(`[autoAdvance] awaiting_payment update failed for ${lead.id}:`, error.message)
        continue
      }

      await supabase.from('stage_history').insert({
        lead_id: lead.id,
        from_stage: 'in_build',
        to_stage: 'awaiting_payment',
        changed_by: null,
        note: 'Auto-advanced — build end date passed',
      })

      await supabase.from('activities').insert({
        lead_id: lead.id,
        created_by: null,
        type: 'stage_change',
        body: 'Auto-advanced to Awaiting Payment — build end date passed',
      })
    }
  } catch (err) {
    console.error('[autoAdvance] awaiting_payment error:', err)
  }
}
