import { useState } from 'react'
import { CheckCircle2, Mail, Facebook, Instagram, Youtube, AlertCircle } from 'lucide-react'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'
import { useData } from '../../lib/store'
import { submitLeadToFormspree } from '../../lib/formspree'

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
    title: 'સંપર્ક', desc: 'સોસાયટી સેટઅપની વિનંતી કરો, અથવા સવાલ પૂછો. અમે સીધા જવાબ આપીએ છીએ.',
    h1: 'સોસાયટી સેટઅપની વિનંતી કરો', sub: 'તમારી સોસાયટી વિશે જણાવો, અમે સીધો સંપર્ક કરીશું.',
    name: 'તમારું નામ', phone: 'ફોન નંબર', email: 'ઈમેલ', societyName: 'સોસાયટીનું નામ',
    city: 'શહેર / વિસ્તાર', flatCount: 'ફ્લેટની સંખ્યા', role: 'તમારો રોલ', mainNeed: 'મુખ્ય જરૂરિયાત', message: 'સંદેશ (વૈકલ્પિક)',
    roleOptions: ['ચેરમેન', 'સેક્રેટરી', 'ટ્રેઝરર', 'રહેવાસી', 'અન્ય'],
    needOptions: ['બિલિંગ', 'ફરિયાદ', 'નોટિસ', 'આખી એપ'],
    submit: 'વિનંતી મોકલો', thanks: 'આભાર, તમારી વિનંતી મળી ગઈ. અમે ટૂંક સમયમાં સંપર્ક કરીશું.',
    orEmail: 'ઈમેલ પસંદ કરો છો?',
    follow: 'Prangan One ને ફોલો કરો',
    sending: 'મોકલાય છે...',
    error: 'મોકલવામાં ભૂલ થઈ, ફરી પ્રયત્ન કરો, અથવા સીધા care@pranganone.com પર ઈમેલ કરો.',
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
      addLead(payload) // also kept locally so the owner console's leads inbox shows it
      setSent(true)
    } catch {
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
          <div className="space-y-3">
            <input className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t.name} />
            <div className="grid grid-cols-2 gap-3">
              <input className={inputClass} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t.phone} />
              <input className={inputClass} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={t.email} />
            </div>
            <input className={inputClass} value={form.societyName} onChange={e => setForm({ ...form, societyName: e.target.value })} placeholder={t.societyName} />
            <div className="grid grid-cols-2 gap-3">
              <input className={inputClass} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder={t.city} />
              <input className={inputClass} type="number" value={form.flatCount} onChange={e => setForm({ ...form, flatCount: e.target.value })} placeholder={t.flatCount} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select className={inputClass} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {t.roleOptions.map(r => <option key={r}>{r}</option>)}
              </select>
              <select className={inputClass} value={form.mainNeed} onChange={e => setForm({ ...form, mainNeed: e.target.value })}>
                {t.needOptions.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <textarea className={inputClass + ' min-h-[80px] py-2.5'} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder={t.message} />
            {error && <p className="text-[13px] text-over flex items-start gap-1.5"><AlertCircle size={15} className="shrink-0 mt-0.5" /> {t.error}</p>}
            <button onClick={submit} disabled={!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.societyName.trim() || sending}
              className="w-full rounded-xl bg-navy-900 text-cream-50 py-3.5 text-[15px] font-bold hover:bg-navy-800 disabled:opacity-40">
              {sending ? t.sending : t.submit}
            </button>
          </div>
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
