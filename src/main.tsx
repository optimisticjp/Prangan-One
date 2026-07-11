import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { DataProvider } from './lib/store'
import { DemoDataProvider, isDemoSessionActive } from './lib/demoStore'
import { isDemoModeEnabled } from './lib/demoMode'
import { initMonitoring } from './lib/monitoring'
import './index.css'

// Before anything renders, so early errors and unhandled promise rejections
// are caught too. A no-op unless this is a production build with a DSN set.
initMonitoring()

// Decided once, synchronously, before the very first render - not a
// live, in-session switch between two different providers under one
// already-mounted tree (see the comment on startDemoSession in
// demoStore.tsx for why that's deliberately avoided). Checks the
// environment gate, not just whether a demo session happens to exist in
// storage - a stale sessionStorage key from an earlier visit means
// nothing if this specific deployment doesn't allow demo mode at all.
const useDemo = isDemoModeEnabled() && isDemoSessionActive()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {useDemo ? (
        <DemoDataProvider>
          <App />
        </DemoDataProvider>
      ) : (
        <DataProvider>
          <App />
        </DataProvider>
      )}
    </BrowserRouter>
  </React.StrictMode>,
)
