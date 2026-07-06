import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SearchX, Loader2 } from 'lucide-react'
import { useData } from '../lib/store'
import { supabaseConfigured } from '../lib/supabase'
import { findSocietyPublicProfile } from '../lib/auth'
import { SocietyBadge } from '../components/SocietyLogo'
import { PranganBrand } from '../components/PranganBrand'
import { Button } from '../components/ui'
import { useAppLang } from '../lib/useAppLang'
import { defaultModuleLayer } from '../lib/types'
import type { Society } from '../lib/types'

/**
 * A shareable, society-branded entry point: pranganone.com/s/rajhans-tower.
 * Looks up the society by slug, shows their branding, then hands off to
 * /login with that society set as context. An unknown slug shows a clean
 * not-found state instead of leaking anything about which slugs DO exist.
 *
 * Uses the real Supabase-backed findSocietyPublicProfile when configured,
 * falling back to the local demo layer's findSocietyBySlug otherwise -
 * same pattern as Login.tsx and Join.tsx. The real path calls a narrow
 * database function rather than reading societies directly, since that
 * table isn't meant to be readable by a visitor who isn't a member of
 * anything yet, see find_society_public_profile in supabase/schema.sql.
 * The result gets adapted into a minimal Society-shaped object since
 * SocietyBadge expects the full local type, only its logo/id/name fields
 * actually matter for what this page renders.
 */
export default function ShareLink() {
  useAppLang()
  const { slug } = useParams()
  const nav = useNavigate()
  const { session, findSocietyBySlug, setActiveSocietyContext } = useData()
  const [realSociety, setRealSociety] = useState<Society | null | undefined>(undefined) // undefined = not loaded yet
  const [loading, setLoading] = useState(supabaseConfigured)

  const demoSociety = slug ? findSocietyBySlug(slug) : undefined
  const society = supabaseConfigured ? realSociety : demoSociety

  useEffect(() => {
    if (!supabaseConfigured || !slug) return
    let cancelled = false
    findSocietyPublicProfile(slug).then(profile => {
      if (cancelled) return
      if (!profile) { setRealSociety(null); setLoading(false); return }
      setRealSociety({
        id: profile.societyId, name: profile.name, nameEn: profile.nameEn, address: profile.address,
        city: profile.city, area: profile.area, slug, joinCode: '', maintenanceAmount: 0, dueDay: 10, upiId: '',
        plan: 'active', flatsLimit: 0, receiptPrefix: 'SOC', themeKey: profile.themeKey, logoDataUrl: profile.logoUrl ?? undefined,
        modules: defaultModuleLayer, createdAt: '', receiptSeq: 1, tenantAccess: 'full', subscriptionStatus: 'active',
      })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [slug])

  useEffect(() => {
    // Guarded on the actual value, not just "did this function reference
    // change" - setActiveSocietyContext is a fresh closure every time the
    // store recomputes (which itself changing session.societyId would
    // trigger), so depending on the function identity here would loop
    // forever: effect fires -> sets context -> store recomputes -> new
    // function reference -> effect fires again.
    if (society && session.societyId !== society.id) setActiveSocietyContext(society.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society?.id, session.societyId])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
        <Loader2 size={26} className="animate-spin text-navy-400" />
      </div>
    )
  }

  if (!society) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <PranganBrand variant="symbol-navy" height={36} className="mx-auto mb-4" />
          <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-400">
            <SearchX size={26} />
          </div>
          <h1 className="font-bold text-navy-900 text-[19px]">આ સોસાયટીની લિંક મળી નહીં</h1>
          <p className="text-[13.5px] text-navy-500 mt-1.5">લિંક ખોટી હોઈ શકે છે. તમારી કમિટીને સાચી લિંક માટે પૂછો.</p>
          <Button variant="soft" className="mt-4" onClick={() => nav('/login')}>લોગિન પર જાઓ</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
      <div className="text-center max-w-sm animate-fadeUp">
        <SocietyBadge society={society} size={64} />
        <h1 className="font-bold text-navy-900 text-[22px] mt-4">{society.name}</h1>
        {(society.area || society.city) && (
          <p className="text-[13.5px] text-navy-400 mt-0.5">{[society.area, society.city].filter(Boolean).join(', ')}</p>
        )}
        <p className="text-[12.5px] text-saffron-600 font-semibold mt-2">Prangan One પર</p>
        <Button variant="accent" full className="mt-5" onClick={() => nav('/login')}>લોગિન કરો</Button>
      </div>
    </div>
  )
}
