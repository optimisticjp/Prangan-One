import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import {
  LayoutDashboard, Users, ReceiptText, IndianRupee, Wallet, Store as StoreIcon,
  Wrench, Bell, FolderOpen, Vote, PartyPopper, Car, BarChart3, Settings as SettingsIcon,
  Scale, FileSpreadsheet,
} from 'lucide-react'
import { ResidentLayout, Shell } from './layouts/Layouts'
import type { NavItem } from './layouts/Layouts'
import { RoleGate } from './components/RoleGate'
import { ModuleGate } from './components/ModuleGate'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PageLoading } from './components/PageLoading'
import { lazyWithRetry as lazy } from './lib/lazyWithRetry'

// Every page is lazy-loaded, split by route, so a resident's bundle never
// includes admin/accountant/owner code and vice versa (see
// docs/PRANGAN_ONE_ROADMAP.md non-negotiables). Home is the one exception -
// it's genuinely what a first-time visitor needs immediately, since it's
// the overwhelmingly common landing page, so it stays in the main bundle
// deliberately. Every other public/auth page - FAQ, privacy, terms,
// pricing, login, join, demo, reset-password, and so on - doesn't share
// that justification: a homepage visitor doesn't need any of them before
// navigating to one specifically, so they're lazy now too.
import Home from './pages/public/Home'

const Login = lazy(() => import('./pages/Login'))
const Demo = lazy(() => import('./pages/Demo'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const NoAccess = lazy(() => import('./pages/NoAccess'))
const Join = lazy(() => import('./pages/Join'))
const Features = lazy(() => import('./pages/public/Features'))
const Pricing = lazy(() => import('./pages/public/Pricing'))
const Faq = lazy(() => import('./pages/public/Faq'))
const Contact = lazy(() => import('./pages/public/Contact'))
const Privacy = lazy(() => import('./pages/public/Privacy'))
const Terms = lazy(() => import('./pages/public/Terms'))
const ShareLink = lazy(() => import('./pages/ShareLink'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Forbidden = lazy(() => import('./pages/Forbidden'))

const RDashboard = lazy(() => import('./pages/resident/Dashboard'))
const RBill = lazy(() => import('./pages/resident/Bill'))
const RReceipts = lazy(() => import('./pages/resident/Receipts'))
const RReceiptDetail = lazy(() => import('./pages/resident/ReceiptDetail'))
const RComplaints = lazy(() => import('./pages/resident/Complaints'))
const RComplaintDetail = lazy(() => import('./pages/resident/ComplaintDetail'))
const RNotices = lazy(() => import('./pages/resident/Notices'))
const RDocuments = lazy(() => import('./pages/resident/Documents'))
const RContacts = lazy(() => import('./pages/resident/Contacts'))
const RPolls = lazy(() => import('./pages/resident/Polls'))
const REvents = lazy(() => import('./pages/resident/Events'))
const RParking = lazy(() => import('./pages/resident/Parking'))
const RProfile = lazy(() => import('./pages/resident/Profile'))
const RMore = lazy(() => import('./pages/resident/More'))

const ADashboard = lazy(() => import('./pages/admin/Dashboard'))
const AMembers = lazy(() => import('./pages/admin/Members'))
const ABilling = lazy(() => import('./pages/admin/Billing'))
const APayments = lazy(() => import('./pages/admin/Payments'))
const AExpenses = lazy(() => import('./pages/admin/Expenses'))
const AVendors = lazy(() => import('./pages/admin/Vendors'))
const AComplaints = lazy(() => import('./pages/admin/Complaints'))
const ANotices = lazy(() => import('./pages/admin/Notices'))
const ADocuments = lazy(() => import('./pages/admin/Documents'))
const APolls = lazy(() => import('./pages/admin/Polls'))
const AEvents = lazy(() => import('./pages/admin/Events'))
const AParking = lazy(() => import('./pages/admin/Parking'))
const AReports = lazy(() => import('./pages/admin/Reports'))
const ASettings = lazy(() => import('./pages/admin/Settings'))

const CDashboard = lazy(() => import('./pages/accountant/Dashboard'))
const CReports = lazy(() => import('./pages/accountant/Reports'))
const CAdjustments = lazy(() => import('./pages/accountant/Adjustments'))

const OwnerShell = lazy(() => import('./pages/owner/Layout'))
const ODashboard = lazy(() => import('./pages/owner/Dashboard'))
const OSocieties = lazy(() => import('./pages/owner/Societies'))
const OOnboarding = lazy(() => import('./pages/owner/Onboarding'))
const OSocietyDetail = lazy(() => import('./pages/owner/SocietyDetail'))
const OBilling = lazy(() => import('./pages/owner/Billing'))
const OLeads = lazy(() => import('./pages/owner/Leads'))
const OActivity = lazy(() => import('./pages/owner/Activity'))
const OwnerLegacyRedirect = lazy(() => import('./pages/owner/LegacyRedirect'))

const adminNav: NavItem[] = [
  { to: '/admin', label: 'ડેશબોર્ડ', icon: LayoutDashboard, end: true, group: 'ઓવરવ્યૂ' },
  { to: '/admin/billing', label: 'બિલિંગ અને બાકી', icon: ReceiptText, module: 'billing', group: 'હિસાબ', roles: ['society_admin'] },
  { to: '/admin/payments', label: 'ચુકવણી અને રસીદ', icon: IndianRupee, module: 'billing', group: 'હિસાબ', roles: ['society_admin'] },
  { to: '/admin/expenses', label: 'ખર્ચ', icon: Wallet, group: 'હિસાબ' },
  { to: '/admin/reports', label: 'રિપોર્ટ', icon: BarChart3, module: 'reports', group: 'હિસાબ' },
  { to: '/admin/members', label: 'સભ્યો / ફ્લેટ', icon: Users, group: 'કામકાજ', roles: ['society_admin'] },
  { to: '/admin/vendors', label: 'વેન્ડર / AMC', icon: StoreIcon, module: 'vendors', group: 'કામકાજ' },
  { to: '/admin/complaints', label: 'ફરિયાદ', icon: Wrench, module: 'complaints', group: 'કામકાજ' },
  { to: '/admin/parking', label: 'પાર્કિંગ / વાહન', icon: Car, module: 'parking', group: 'કામકાજ' },
  { to: '/admin/notices', label: 'નોટિસ', icon: Bell, module: 'notices', group: 'સંવાદ' },
  { to: '/admin/documents', label: 'દસ્તાવેજો', icon: FolderOpen, module: 'documents', group: 'સંવાદ' },
  { to: '/admin/polls', label: 'મતદાન', icon: Vote, module: 'polls', group: 'સંવાદ' },
  { to: '/admin/events', label: 'ઇવેન્ટ / ફાળો', icon: PartyPopper, module: 'events', group: 'સંવાદ' },
  { to: '/admin/settings', label: 'સેટિંગ્સ', icon: SettingsIcon, group: 'સેટિંગ્સ', roles: ['society_admin'] },
]
const acctNav: NavItem[] = [
  { to: '/accounts', label: 'હિસાબ ડેશબોર્ડ', icon: LayoutDashboard, end: true },
  { to: '/accounts/reports', label: 'રિપોર્ટ / ઓડિટ', icon: FileSpreadsheet },
  { to: '/accounts/adjustments', label: 'એડજસ્ટમેન્ટ', icon: Scale },
]

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public marketing site, English default with a Gujarati toggle,
            bilingual - see src/pages/public/. The app itself (below) stays
            fully Gujarati, no toggle. This matches the route structure
            locked in docs/PRANGAN_ONE_ROADMAP.md section 10 (public site
            at /, login at /login) - an earlier build had these swapped,
            corrected here. /home redirects to / so no old link 404s. */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/features" element={<Lazy><Features /></Lazy>} />
        <Route path="/pricing" element={<Lazy><Pricing /></Lazy>} />
        <Route path="/faq" element={<Lazy><Faq /></Lazy>} />
        <Route path="/contact" element={<Lazy><Contact /></Lazy>} />
        <Route path="/privacy" element={<Lazy><Privacy /></Lazy>} />
        <Route path="/terms" element={<Lazy><Terms /></Lazy>} />
        <Route path="/login" element={<Lazy><Login /></Lazy>} />
        <Route path="/demo" element={<Lazy><Demo /></Lazy>} />
        <Route path="/auth/callback" element={<Lazy><AuthCallback /></Lazy>} />
        <Route path="/auth/reset-password" element={<Lazy><ResetPassword /></Lazy>} />
        <Route path="/no-access" element={<Lazy><NoAccess /></Lazy>} />
        <Route path="/join" element={<Lazy><Join /></Lazy>} />

        {/* Shareable, society-branded entry point: pranganone.com/s/rajhans-tower.
            Looks up the society by slug (public metadata only: name, logo,
            theme, area), shows their branding, then hands off to /login
            with that society pre-selected as context. */}
        <Route path="/s/:slug" element={<Lazy><ShareLink /></Lazy>} />

        <Route path="/app" element={<RoleGate allow={['resident_owner', 'resident_tenant']}><ResidentLayout /></RoleGate>}>
          <Route index element={<Lazy><RDashboard /></Lazy>} />
          <Route path="bill" element={<ModuleGate module="billing" fallback="/app"><Lazy><RBill /></Lazy></ModuleGate>} />
          <Route path="receipts" element={<ModuleGate module="billing" fallback="/app"><Lazy><RReceipts /></Lazy></ModuleGate>} />
          <Route path="receipts/:id" element={<ModuleGate module="billing" fallback="/app"><Lazy><RReceiptDetail /></Lazy></ModuleGate>} />
          <Route path="complaints" element={<ModuleGate module="complaints" fallback="/app"><Lazy><RComplaints /></Lazy></ModuleGate>} />
          <Route path="complaints/:id" element={<ModuleGate module="complaints" fallback="/app"><Lazy><RComplaintDetail /></Lazy></ModuleGate>} />
          <Route path="notices" element={<ModuleGate module="notices" fallback="/app"><Lazy><RNotices /></Lazy></ModuleGate>} />
          <Route path="documents" element={<ModuleGate module="documents" fallback="/app"><Lazy><RDocuments /></Lazy></ModuleGate>} />
          <Route path="contacts" element={<Lazy><RContacts /></Lazy>} />
          <Route path="polls" element={<ModuleGate module="polls" fallback="/app"><Lazy><RPolls /></Lazy></ModuleGate>} />
          <Route path="events" element={<ModuleGate module="events" fallback="/app"><Lazy><REvents /></Lazy></ModuleGate>} />
          <Route path="parking" element={<ModuleGate module="parking" fallback="/app"><Lazy><RParking /></Lazy></ModuleGate>} />
          <Route path="profile" element={<Lazy><RProfile /></Lazy>} />
          <Route path="more" element={<Lazy><RMore /></Lazy>} />
        </Route>

        <Route path="/admin" element={<RoleGate allow={['society_admin', 'committee_member', 'auditor']}><Shell items={adminNav} title="કમિટી પેનલ" /></RoleGate>}>
          <Route index element={<Lazy><ADashboard /></Lazy>} />
          <Route path="members" element={<RoleGate allow={['society_admin', 'auditor']}><Lazy><AMembers /></Lazy></RoleGate>} />
          <Route path="billing" element={<RoleGate allow={['society_admin', 'auditor']}><ModuleGate module="billing" fallback="/admin"><Lazy><ABilling /></Lazy></ModuleGate></RoleGate>} />
          <Route path="payments" element={<RoleGate allow={['society_admin', 'auditor']}><ModuleGate module="billing" fallback="/admin"><Lazy><APayments /></Lazy></ModuleGate></RoleGate>} />
          <Route path="expenses" element={<Lazy><AExpenses /></Lazy>} />
          <Route path="vendors" element={<ModuleGate module="vendors" fallback="/admin"><Lazy><AVendors /></Lazy></ModuleGate>} />
          <Route path="complaints" element={<ModuleGate module="complaints" fallback="/admin"><Lazy><AComplaints /></Lazy></ModuleGate>} />
          <Route path="notices" element={<ModuleGate module="notices" fallback="/admin"><Lazy><ANotices /></Lazy></ModuleGate>} />
          <Route path="documents" element={<ModuleGate module="documents" fallback="/admin"><Lazy><ADocuments /></Lazy></ModuleGate>} />
          <Route path="polls" element={<ModuleGate module="polls" fallback="/admin"><Lazy><APolls /></Lazy></ModuleGate>} />
          <Route path="events" element={<ModuleGate module="events" fallback="/admin"><Lazy><AEvents /></Lazy></ModuleGate>} />
          <Route path="parking" element={<ModuleGate module="parking" fallback="/admin"><Lazy><AParking /></Lazy></ModuleGate>} />
          <Route path="reports" element={<ModuleGate module="reports" fallback="/admin"><Lazy><AReports /></Lazy></ModuleGate>} />
          <Route path="settings" element={<RoleGate allow={['society_admin', 'auditor']}><Lazy><ASettings /></Lazy></RoleGate>} />
        </Route>

        <Route path="/accounts" element={<RoleGate allow={['accountant', 'society_admin', 'owner']}><Shell items={acctNav} title="એકાઉન્ટન્ટ પેનલ" /></RoleGate>}>
          <Route index element={<Lazy><CDashboard /></Lazy>} />
          <Route path="reports" element={<Lazy><CReports /></Lazy>} />
          <Route path="adjustments" element={<Lazy><CAdjustments /></Lazy>} />
        </Route>

        <Route path="/owner" element={<RoleGate allow={['owner']}><Lazy><OwnerShell /></Lazy></RoleGate>}>
          <Route index element={<Lazy><ODashboard /></Lazy>} />
          <Route path="societies" element={<Lazy><OSocieties /></Lazy>} />
          <Route path="societies/new" element={<Lazy><OOnboarding /></Lazy>} />
          <Route path="societies/:id" element={<Lazy><OSocietyDetail /></Lazy>} />
          <Route path="billing" element={<Lazy><OBilling /></Lazy>} />
          <Route path="leads" element={<Lazy><OLeads /></Lazy>} />
          <Route path="activity" element={<Lazy><OActivity /></Lazy>} />
        </Route>
        {/* /saas/* kept as redirects so any old links/bookmarks don't 404 */}
        <Route path="/saas" element={<Navigate to="/owner" replace />} />
        <Route path="/saas/new" element={<Navigate to="/owner/societies/new" replace />} />
        <Route path="/saas/:id" element={<Lazy><OwnerLegacyRedirect /></Lazy>} />

        <Route path="/403" element={<Lazy><Forbidden /></Lazy>} />
        <Route path="*" element={<Lazy><NotFound /></Lazy>} />
      </Routes>
    </ErrorBoundary>
  )
}
