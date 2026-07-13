import { useState } from 'react'
import { CheckCircle2, Mail, Facebook, Instagram, Youtube, AlertCircle } from 'lucide-react'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'
import { useData } from '../../lib/store'
import { reportError } from '../../lib/monitoring'
import { submitLeadToFormspree } from '../../lib/formspree'
import { submitPublicLeadToSupabase } from '../../lib/leads'

const socialLinks = [
  { href: 'https://www.facebook.com/pranganone/', icon: Facebook, label: 'Prangan One on Facebook' },
  { href: 'https://www.instagram.com/pranganone/', icon: Instagram, label: 'Prangan One on Instagram' },
  { href: 'https://www.youtube.com/@PranganOne', icon: Youtube, label: 'Prangan One on YouTube' },
]

const copy = {
  en: {
    title: 'Contact', desc: 'Request a society setup, or ask a question. We respond directly, no ticket queue.',
    h1: 'Request Society Setup', sub: 'Tell us about your society, we\u2019ll reach out directly.',
    name: 'Your name', phone: 'Phone number', email: 'Email', societyName: 'Society name',
    city: 'City / locality', flatCount: 'Number of flats', role: 'Your role', mainNeed: 'Main need', message: 'Message (optional)',
    roleOptions: ['Chairman', 'Secretary', 'Treasurer', 'Resident', 'Other'],
    needOptions: ['Billing', 'Complaints', 'Notices', 'Full app'],
    submit: 'Send request', thanks: 'Thanks, we\u2019ve got your request. We\u2019ll reach out shortly.',
    orEmail: 'Prefer email?',
    follow: 'Follow Prangan One',
    sending: 'Sending...',
    error: 'Couldn\u2019t send that, please try again, or email us directly at care@pranganone.com.',
  },
  gu: {
    title: 'સંપર્ક', desc: 'સોસાયટી સેટઅપની વિનંતી કરો, અથવા સવાલ પૂછો. અમે આપને સીધો જવાબ આપીશું.',
    h1: 'સોસાયટી સેટઅપની વિનંતી કરો', sub: 'કૃપા કરીને આપની સોસાયટી વિશે જણાવો. અમે સીધો સંપર્ક કરીશું.',
    name: 'આપનું નામ', phone: 'ફોન નંબર', email: 'ઈમેલ', societyName: 'સોસાયટીનું નામ',
    city: 'શહેર / વિસ્તાર', flatCount: 'ફ્લેટની સંખ્યા', role: 'આપની ભૂમિકા', mainNeed: 'મુખ્ય જરૂરિયાત', message: 'સંદેશ (વૈકલ્પિક)',
    roleOptions: ['પ્રમુખ', 'મંત્રી', 'ખજાનચી', 'રહેવાસી', 'અન્ય'],
    needOptions: ['બિલિંગ', 'ફરિયાદ', 'નોટિસ', 'આખી એપ'],
    submit: 'વિનંતી મોકલો', thanks: 'વિનંતી મોકલી છે. અમે ટૂંક સમયમાં સંપર્ક કરીશું.',
    orEmail: 'ઈમેલ કરવો છે?',
    follow: 'Prangan One ને ફોલો કરો',
    sending: 'મોકલાય છે...',
    error: 'વિનંતી મોકલી શકાઈ નથી. કૃપા કરીને ફરી પ્રયાસ કરો અથવા care@pranganone.com પર ઈમેલ કરો.',
  },
}

export default function Contact() {
  const [lang, setLang] = usePublicLang()
  const t = copy[lang]
  usePageMeta(t.title, t.desc)
  const { addLead } = useData()

  const [form, setForm] = useState({
    name: '', phone: '', email: '', societyName: '', city: '',
    flatCount: '', role: t.roleOptions[0], mainNeed: t.needOptions[0], message: '',
  })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(false)

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.societyName.trim()) return
    setSending(true); setError(false)
    const payload = {
      name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(),
      societyName: form.societyName.trim(), city: form.city.trim(), flatCount: Number(form.flatCount) || 0,
      role: form.role, mainNeed: form.mainNeed, message: form.message.trim() || undefined,
    }
    try {
      await submitLeadToFormspree(payload)
      addLead(payload) // kept locally too, so the demo/local owner console still shows it
      try {
        await submitPublicLeadToSupabase(payload) // the real, shared record - what the owner console reads when configured, see Leads.tsx
      } catch (err) {
        // Formspree already delivered the email successfully at this point,
        // the actual inquiry reached us either way - don't tell someone
        // their message failed just because this second, additional write
        // didn't land. Report it so we know the shared record is dropping,
        // but deliberately do not surface an error to the user here.
        reportError(err, { where: 'contact_supabase_lead' })
      }
      setSent(true)
    } catch (err) {
      // The primary path (Formspree) failed - the user genuinely didn't get
      // through, so they see the error, and we get told the primary path is down.
      reportError(err, { where: 'contact_formspree' })
      setError(true)
    } finally {
      setSending(false)
    }
  }

  const inputClass = "w-full rounded-xl border border-cream-300 bg-white px-3.5 min-h-[46px] text-[14.5px] focus:outline-none focus:ring-2 focus:ring-saffron-400/50 focus:border-saffron-400"

  return (
    <PublicLayout lang={lang} setLang={setLang}>
      <section className="px-5 pt-14 pb-16 max-w-lg mx-auto">
        <h1 className="text-[28px] font-bold text-center">{t.h1}</h1>
        <p className="text-[14.5px] text-navy-500 text-center mt-2 mb-7">{t.sub}</p>

        {sent ? (
          <div className="rounded-2xl bg-green-50 border border-green-200 px-5 py-6 text-center">
            <CheckCircle2 size={30} className="text-paid mx-auto mb-2" />
            <p className="text-[15px] text-navy-700 font-semibold">{t.thanks}</p>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); submit() }}>
            <label htmlFor="contact-name" className="sr-only">{t.name}</label>
            <input id="contact-name" className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t.name} autoComplete="name" required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label htmlFor="contact-phone" className="sr-only">{t.phone}</label>
              <input id="contact-phone" className={inputClass} type="tel" pattern="[0-9+ ()-]{7,15}" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t.phone} autoComplete="tel" required />
              <label htmlFor="contact-email" className="sr-only">{t.email}</label>
              <input id="contact-email" className={inputClass} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={t.email} autoComplete="email" required />
            </div>
            <label htmlFor="contact-society" className="sr-only">{t.societyName}</label>
            <input id="contact-society" className={inputClass} value={form.societyName} onChange={e => setForm({ ...form, societyName: e.target.value })} placeholder={t.societyName} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label htmlFor="contact-city" className="sr-only">{t.city}</label>
              <input id="contact-city" className={inputClass} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder={t.city} autoComplete="address-level2" />
              <label htmlFor="contact-flatcount" className="sr-only">{t.flatCount}</label>
              <input id="contact-flatcount" className={inputClass} type="number" min="1" value={form.flatCount} onChange={e => setForm({ ...form, flatCount: e.target.value })} placeholder={t.flatCount} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label htmlFor="contact-role" className="sr-only">{t.role}</label>
              <select id="contact-role" className={inputClass} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {t.roleOptions.map(r => <option key={r}>{r}</option>)}
              </select>
              <label htmlFor="contact-need" className="sr-only">{t.mainNeed}</label>
              <select id="contact-need" className={inputClass} value={form.mainNeed} onChange={e => setForm({ ...form, mainNeed: e.target.value })}>
                {t.needOptions.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <label htmlFor="contact-message" className="sr-only">{t.message}</label>
            <textarea id="contact-message" className={inputClass + ' min-h-[80px] py-2.5'} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder={t.message} />
            {error && <p className="text-[13px] text-over flex items-start gap-1.5"><AlertCircle size={15} className="shrink-0 mt-0.5" /> {t.error}</p>}
            <button type="submit" disabled={!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.societyName.trim() || sending}
              className="w-full rounded-xl bg-navy-900 text-cream-50 py-3.5 text-[15px] font-bold hover:bg-navy-800 disabled:opacity-40">
              {sending ? t.sending : t.submit}
            </button>
          </form>
        )}

        {/* WhatsApp button intentionally removed until a real number exists -
            a wa.me link with no number goes nowhere. Add it back here once
            there's a number to link: href={`https://wa.me/91XXXXXXXXXX`}. */}
        <div className="mt-8 pt-6 border-t border-cream-200 text-center">
          <p className="text-[13px] text-navy-400 mb-3">{t.orEmail}</p>
          <div className="flex justify-center gap-3">
            <a href="mailto:care@pranganone.com" className="inline-flex items-center gap-1.5 rounded-xl bg-navy-50 border border-navy-100 text-navy-700 px-4 py-2.5 text-[13.5px] font-semibold hover:bg-navy-100">
              <Mail size={16} /> care@pranganone.com
            </a>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-cream-100 text-center">
          <p className="text-[12px] text-navy-400 mb-2.5">{t.follow}</p>
          <div className="flex justify-center gap-4">
            {socialLinks.map(s => (
              <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                className="text-navy-400 hover:text-saffron-600">
                <s.icon size={19} />
              </a>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
