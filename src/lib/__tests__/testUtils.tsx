import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { DataProvider } from '../store'

/**
 * A drop-in replacement for using DataProvider alone as a renderHook/render
 * wrapper. DataProvider now calls useNavigate() internally (see the
 * onAuthStateChange listener in store.tsx, which redirects to /login when
 * a real session's auth genuinely ends), and useNavigate() throws outside
 * a Router - the real app always has one (see main.tsx), but a bare
 * `{ wrapper: DataProvider }` in a test never did. This is that same
 * missing Router, just for tests.
 */
export function TestDataProvider({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <DataProvider>{children}</DataProvider>
    </MemoryRouter>
  )
}
