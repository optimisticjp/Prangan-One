import { Outlet } from 'react-router-dom'
import { BusinessProvider } from '../../lib/business/store'

export default function BusinessRoot() {
  return <BusinessProvider><Outlet /></BusinessProvider>
}
