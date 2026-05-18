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
