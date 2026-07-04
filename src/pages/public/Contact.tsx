import { useState } from 'react'
import { CheckCircle2, MessageCircle, Mail } from 'lucide-react'
import { PublicLayout } from './PublicLayout'
import { usePublicLang } from './usePublicLang'
import { usePageMeta } from './usePageMeta'
import { useData } from '../../lib/store'

const copy = {
  en: {
    title: 'Contact', desc: 'Request a society setup, or ask a question. We respond directly, no ticket queue.',
    h1: 'Request Society Setup', sub: 'Tell us about your society, we\u2019ll reach out directly. WhatsApp works too, if that\u2019s easier.',
    name: 'Your name', phone: 'Phone number', email: 'Email', societyName: 'Society name',
    city: 'City / locality', flatCount: 'Number of flats', role: 'Your role', mainNeed: 'Main need', message: 'Message (optional)',
    roleOptions: ['Chairman', 'Secretary', 'Treasurer', 'Resident', 'Other'],
    needOptions: ['Billing', 'Complaints', 'Notices', 'Full app'],
    submit: 'Send request', thanks: 'Thanks, we\u2019ve got your request. We\u2019ll reach out shortly.',
    orWhatsapp: 'Prefer WhatsApp or a call?',
  },
  gu: {
    title: 'સંપર્ક', desc: 'સોસાયટી સેટઅપની વિનંતી કરો, અથવા સવાલ પૂછો. અમે સીધા જવાબ આપીએ છીએ.',
    h1: 'સોસાયટી સેટઅપની વિનંતી કરો', sub: 'તમારી સોસાયટી વિશે જણાવો, અમે સીધો સંપર્ક કરીશું. WhatsApp પણ ચાલશે.',
    name: 'તમારું નામ', phone: 'ફોન નંબર', email: 'ઈમેલ', societyName: 'સોસાયટીનું નામ',
    city: 'શહેર / વિસ્તાર', flatCount: 'ફ્લેટની સંખ્યા', role: 'તમારો રોલ', mainNeed: 'મુખ્ય જરૂરિયાત', message: 'સંદેશ (વૈકલ્પિક)',
    roleOptions: ['ચેરમેન', 'સેક્રેટરી', 'ટ્રેઝરર', 'રહેવાસી', 'અન્ય'],
    needOptions: ['બિલિંગ', 'ફરિયાદ', 'નોટિસ', 'આખી એપ'],
    submit: 'વિનંતી મોકલો', thanks: 'આભાર, તમારી વિનંતી મળી ગઈ. અમે ટૂંક સમયમાં સંપર્ક કરીશું.',
    orWhatsapp: 'WhatsApp કે કૉલ પસંદ કરો છો?',
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

  const submit = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.societyName.trim()) return
    addLead({
      name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(),
      societyName: form.societyName.trim(), city: form.city.trim(), flatCount: Number(form.flatCount) || 0,
      role: form.role, mainNeed: form.mainNeed, message: form.message.trim() || undefined,
    })
    setSent(true)
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
            <button onClick={submit} disabled={!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.societyName.trim()}
              className="w-full rounded-xl bg-navy-900 text-cream-50 py-3.5 text-[15px] font-bold hover:bg-navy-800 disabled:opacity-40">
              {t.submit}
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-cream-200 text-center">
          <p className="text-[13px] text-navy-400 mb-3">{t.orWhatsapp}</p>
          <div className="flex justify-center gap-3">
            <a href="https://wa.me/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-green-50 border border-green-200 text-paid px-4 py-2.5 text-[13.5px] font-semibold hover:bg-green-100">
              <MessageCircle size={16} /> WhatsApp
            </a>
            <a href="mailto:care@pranganone.com" className="inline-flex items-center gap-1.5 rounded-xl bg-navy-50 border border-navy-100 text-navy-700 px-4 py-2.5 text-[13.5px] font-semibold hover:bg-navy-100">
              <Mail size={16} /> care@pranganone.com
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
