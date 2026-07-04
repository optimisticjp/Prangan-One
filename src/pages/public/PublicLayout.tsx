import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { PranganMark } from '../../components/PranganMark'
import type { PublicLang } from './usePublicLang'

const navByLang: Record<PublicLang, { to: string; label: string }[]> = {
  en: [
    { to: '/features', label: 'Features' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/faq', label: 'FAQ' },
    { to: '/contact', label: 'Contact' },
  ],
  gu: [
    { to: '/features', label: 'સુવિધાઓ' },
    { to: '/pricing', label: 'કિંમત' },
    { to: '/faq', label: 'FAQ' },
    { to: '/contact', label: 'સંપર્ક' },
  ],
}

export function PublicLayout({ lang, setLang, children }: {
  lang: PublicLang; setLang: (l: PublicLang) => void; children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const nav = navByLang[lang]

  return (
    <div className="min-h-screen bg-cream-50 text-navy-900">
      <header className="sticky top-0 z-40 bg-cream-50/90 backdrop-blur border-b border-cream-200 px-5 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to="/home" className="flex items-center gap-2.5 shrink-0">
            <PranganMark size={30} />
            <span className="font-bold text-navy-900">Prangan One</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 flex-1">
            {nav.map(n => <Link key={n.to} to={n.to} className="text-[14.5px] font-medium text-navy-600 hover:text-saffron-600">{n.label}</Link>)}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex rounded-full bg-cream-200 p-0.5 text-[12.5px] font-semibold">
              <button onClick={() => setLang('en')} className={`px-2.5 py-1 rounded-full ${lang === 'en' ? 'bg-navy-900 text-cream-50' : 'text-navy-500'}`}>EN</button>
              <button onClick={() => setLang('gu')} className={`px-2.5 py-1 rounded-full ${lang === 'gu' ? 'bg-navy-900 text-cream-50' : 'text-navy-500'}`}>ગુ</button>
            </div>
            <Link to="/" className="hidden sm:inline-flex rounded-xl bg-saffron-500 text-navy-900 px-3.5 py-2 text-[13.5px] font-bold hover:bg-saffron-400">
              {lang === 'en' ? 'Log in' : 'લોગિન'}
            </Link>
            <button onClick={() => setOpen(!open)} className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg bg-cream-200" aria-label="Menu">
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {open && (
          <div className="md:hidden max-w-5xl mx-auto mt-3 pb-2 flex flex-col gap-2">
            {nav.map(n => <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="text-[14.5px] font-medium text-navy-600 py-1.5">{n.label}</Link>)}
            <div className="flex gap-2 mt-1">
              <button onClick={() => setLang('en')} className={`px-2.5 py-1 rounded-full text-[12.5px] font-semibold ${lang === 'en' ? 'bg-navy-900 text-cream-50' : 'bg-cream-200 text-navy-500'}`}>EN</button>
              <button onClick={() => setLang('gu')} className={`px-2.5 py-1 rounded-full text-[12.5px] font-semibold ${lang === 'gu' ? 'bg-navy-900 text-cream-50' : 'bg-cream-200 text-navy-500'}`}>ગુ</button>
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="border-t border-cream-200 mt-16">
        <div className="max-w-5xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <PranganMark size={24} />
            <div>
              <div className="font-bold text-[13.5px]">Prangan One</div>
              <div className="text-[11.5px] text-navy-400">The Society OS</div>
            </div>
          </div>
          <div className="flex gap-5 text-[13px] text-navy-500">
            {nav.map(n => <Link key={n.to} to={n.to} className="hover:text-saffron-600">{n.label}</Link>)}
          </div>
          <a href="mailto:care@pranganone.com" className="text-[13px] text-navy-500 hover:text-saffron-600">care@pranganone.com</a>
        </div>
        <div className="text-center text-[11.5px] text-navy-300 pb-6">© Prangan One. The Society OS.</div>
      </footer>
    </div>
  )
}
