import { supabase } from './supabase'
import type { QuoteInput, QuotePolish } from './quoteStudio'

/**
 * Optional, explicitly invoked AI assistance.
 * Requires Supabase Auth and an activated Edge Function. Never called by the
 * browser-only drafting flow; no customer details are persisted by this code.
 */
export async function requestQuotePolish(input: QuoteInput): Promise<QuotePolish> {
  if (!supabase) throw new Error('AI assistance is not configured yet.')
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Sign in with your email first to use AI assistance.')
  const { data, error } = await supabase.functions.invoke('quote-assist', {
    body: {
      service: input.service.trim(),
      details: input.details.trim(),
      language: input.language,
    },
  })
  if (error) throw new Error('Claude is not available right now. Your manual draft is unaffected.')
  if (!data || typeof data.introduction !== 'string' || typeof data.scope !== 'string' || typeof data.closing !== 'string')
    throw new Error('Claude returned an invalid suggestion. Please try again later.')
  return {
    introduction: data.introduction.slice(0, 300),
    scope: data.scope.slice(0, 900),
    closing: data.closing.slice(0, 300),
  }
}

export async function sendQuoteMagicLink(email: string): Promise<void> {
  if (!supabase) throw new Error('Sign-in is not configured yet.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email.')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + '/tools/quote' },
  })
  if (error) throw new Error('Could not send sign-in link. Please try again.')
}
