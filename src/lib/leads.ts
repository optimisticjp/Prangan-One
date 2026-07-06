import { supabase } from './supabase'
import type { PublicLead } from './types'

export interface LeadSubmission {
  name: string; phone: string; email: string
  societyName: string; city: string; flatCount: number
  role: string; mainNeed: string; message?: string
}

/**
 * The real, Supabase-backed version of the public lead form's
 * persistence (Contact.tsx also calls submitLeadToFormspree for real
 * email delivery, and addLead() for the local demo layer - this is the
 * third leg, the one that makes the owner console's Leads inbox show
 * the same real submissions from any device, not just whichever browser
 * happened to receive the email). public_leads_insert allows anyone to
 * write here, logged in or not, see supabase/schema.sql.
 */
export async function submitPublicLeadToSupabase(lead: LeadSubmission): Promise<void> {
  if (!supabase) return // silently a no-op when not configured - Formspree + local addLead already cover this case
  const { error } = await supabase.from('public_leads').insert({
    name: lead.name, phone: lead.phone, email: lead.email,
    society_name: lead.societyName, city: lead.city, flat_count: lead.flatCount,
    role: lead.role, main_need: lead.mainNeed, message: lead.message ?? null,
  })
  if (error) throw error
}

/**
 * The real, Supabase-backed version of the owner console's lead inbox
 * read (Leads.tsx). Only the owner role can read this table, see
 * public_leads_select in supabase/schema.sql - this call will correctly
 * return nothing/an error for anyone else, same as the RLS-enforced
 * tables elsewhere.
 */
export async function fetchPublicLeads(): Promise<PublicLead[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('public_leads')
    .select('id, name, phone, email, society_name, city, flat_count, role, main_need, message, status, internal_note, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, name: r.name, phone: r.phone, email: r.email,
    societyName: r.society_name, city: r.city, flatCount: r.flat_count,
    role: r.role, mainNeed: r.main_need, message: r.message ?? undefined,
    status: r.status, internalNote: r.internal_note ?? undefined, createdAt: r.created_at,
  }))
}

/** Updates a lead's status or internal note from the owner console - mirrors updateLeadStatus in the local store. */
export async function updateLeadInSupabase(id: string, patch: { status?: PublicLead['status']; internalNote?: string }): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('public_leads').update({
    ...(patch.status && { status: patch.status }),
    ...(patch.internalNote !== undefined && { internal_note: patch.internalNote }),
  }).eq('id', id)
  if (error) throw error
}
