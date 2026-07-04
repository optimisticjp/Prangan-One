import { Link } from 'react-router-dom'
import { Menu, X, Facebook, Instagram, Youtube, LogIn } from 'lucide-react'
import { useState } from 'react'
import { PranganBrand } from '../../components/PranganBrand'
import type { PublicLang } from './usePublicLang'

const socialLinks = [
  { href: 'https://www.facebook.com/pranganone/', icon: Facebook, label: 'Prangan One on Facebook' },
  { href: 'https://www.instagram.com/pranganone/', icon: Instagram, label: 'Prangan One on Instagram' },
  { href: 'https://www.youtube.com/@PranganOne', icon: Youtube, label: 'Prangan One on YouTube' },
]

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
      <header className="sticky top-0 z-40 bg-cream-50/90 backdrop-blur border-b border-cream-200 px-4 sm:px-5 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3 sm:gap-4">
          {/* Full wordmark at every size, mobile included - the whole point of
              the brand is name recognition, a mark with no name defeats that
              on the exact surface (mobile) most people will meet it on first. */}
          <Link to="/" className="flex items-center shrink-0 min-w-0">
            <PranganBrand variant="wordmark-navy" height={24} className="max-w-[150px] sm:max-w-none" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 flex-1">
            {nav.map(n => <Link key={n.to} to={n.to} className="text-[14.5px] font-medium text-navy-600 hover:text-saffron-600">{n.label}</Link>)}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex rounded-full bg-cream-200 p-0.5 text-[12.5px] font-semibold">
              <button onClick={() => setLang('en')} className={`px-2.5 py-1 rounded-full ${lang === 'en' ? 'bg-navy-900 text-cream-50' : 'text-navy-500'}`}>EN</button>
              <button onClick={() => setLang('gu')} className={`px-2.5 py-1 rounded-full ${lang === 'gu' ? 'bg-navy-900 text-cream-50' : 'text-navy-500'}`}>ગુ</button>
            </div>
            <Link to="/login" className="hidden sm:inline-flex rounded-xl bg-saffron-500 text-navy-900 px-3.5 py-2 text-[13.5px] font-bold hover:bg-saffron-400">
              {lang === 'en' ? 'Log in' : 'લોગિન'}
            </Link>
            <button onClick={() => setOpen(!open)} className="sm:hidden h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-cream-200" aria-label="Menu">
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {open && (
          <div className="sm:hidden max-w-5xl mx-auto mt-3 pb-2 flex flex-col gap-1">
            {/* Login is the very first thing in the mobile menu, not an
                afterthought - on a phone, this menu is the ONLY way in,
                there is no separate always-visible login button at this
                width. */}
            <Link to="/login" onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-saffron-500 text-navy-900 px-4 py-3 text-[15px] font-bold mb-2">
              <LogIn size={17} /> {lang === 'en' ? 'Log in' : 'લોગિન'}
            </Link>
            {nav.map(n => <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="text-[15px] font-medium text-navy-600 py-2">{n.label}</Link>)}
            <div className="flex gap-2 mt-2">
              <button onClick={() => setLang('en')} className={`px-3 py-1.5 rounded-full text-[13px] font-semibold ${lang === 'en' ? 'bg-navy-900 text-cream-50' : 'bg-cream-200 text-navy-500'}`}>EN</button>
              <button onClick={() => setLang('gu')} className={`px-3 py-1.5 rounded-full text-[13px] font-semibold ${lang === 'gu' ? 'bg-navy-900 text-cream-50' : 'bg-cream-200 text-navy-500'}`}>ગુ</button>
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="border-t border-cream-200 mt-16">
        <div className="max-w-5xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PranganBrand variant="wordmark-navy" height={22} />
            <div className="text-[11.5px] text-navy-400 border-l border-cream-300 pl-3">The Society OS</div>
          </div>
          <div className="flex gap-5 text-[13px] text-navy-500">
            {nav.map(n => <Link key={n.to} to={n.to} className="hover:text-saffron-600">{n.label}</Link>)}
          </div>
          <div className="flex items-center gap-4">
            <a href="mailto:care@pranganone.com" className="text-[13px] text-navy-500 hover:text-saffron-600">care@pranganone.com</a>
            <div className="flex items-center gap-2.5">
              {socialLinks.map(s => (
                <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="text-navy-400 hover:text-saffron-600">
                  <s.icon size={17} />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="text-center text-[11.5px] text-navy-300 pb-6">© Prangan One. The Society OS.</div>
      </footer>
    </div>
  )
}
