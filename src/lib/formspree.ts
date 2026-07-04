/**
 * Sends the contact form to Formspree (https://formspree.io/f/mnjklkwp),
 * which forwards it to a real inbox. This exists because the previous
 * version of the contact form only called addLead() in the local data
 * store, meaning a real prospect could submit it, see a success message,
 * and nobody would ever actually receive it, that's fixed now.
 *
 * Formspree's own endpoint is the delivery mechanism; addLead() (called
 * separately, in Contact.tsx) is additional, not a replacement, so the
 * owner console's leads inbox still shows every submission too.
 */
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mnjklkwp'

export interface LeadFormPayload {
  name: string; phone: string; email: string; societyName: string
  city: string; flatCount: number; role: string; mainNeed: string; message?: string
}

export async function submitLeadToFormspree(payload: LeadFormPayload): Promise<void> {
  const res = await fetch(FORMSPREE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      name: payload.name, phone: payload.phone, email: payload.email,
      society_name: payload.societyName, city: payload.city, flat_count: payload.flatCount,
      role: payload.role, main_need: payload.mainNeed, message: payload.message ?? '',
      _subject: `Prangan One: new society enquiry from ${payload.name} (${payload.societyName})`,
    }),
  })
  if (!res.ok) {
    throw new Error(`Formspree responded with ${res.status}`)
  }
}
