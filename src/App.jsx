import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase, configMissing } from './lib/supabase'
import { ThemeProvider } from './components/ThemeContext'
import { ToastProvider } from './components/Toast'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import MemberDashboard from './pages/MemberDashboard'
import PublicProfile from './pages/PublicProfile'
import { IconAlertCircle } from './components/Icons'

function AuthGate() {
  const [state, setState] = useState('out') // loading | out | admin | member | denied
  const [demoRole, setDemoRole] = useState(null) // 'admin' | 'member' | null
  const [currentUser, setCurrentUser] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)

  async function checkAdmin(userId) {
    // Use is_admin() RPC — security definer, bypasses RLS
    const { data, error } = await supabase.rpc('is_admin')
    return { data, error }
  }

  useEffect(() => {
    if (configMissing) {
      setState('out')
      return
    }

    async function check(session) {
      if (!session) {
        setCurrentUser(null)
        return setState('out')
      }
      setCurrentUser(session.user)

      // Use is_admin() RPC — security definer, bypasses RLS permission issues
      const { data: isAdmin, error: adminErr } = await supabase.rpc('is_admin')
      if (adminErr) {
        setDebugInfo(`is_admin() error: ${adminErr.message} (code: ${adminErr.code})`)
        setState('denied')
        return
      }
      if (isAdmin) return setState('admin')

      // Use get_my_member_profile() RPC — also security definer
      const { data: profile, error: memberErr } = await supabase.rpc('get_my_member_profile')
      if (memberErr) {
        setDebugInfo(`get_my_member_profile() error: ${memberErr.message} (code: ${memberErr.code})`)
      }
      if (profile) return setState('member')

      setDebugInfo(null)
      setState('denied')
    }

    supabase.auth.getSession().then(({ data }) => check(data?.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setTimeout(() => check(s), 0)
    })
    return () => sub?.subscription?.unsubscribe?.()
  }, [])

  // Demo Preview Mode
  if (demoRole === 'admin') {
    return <Dashboard isDemo={true} onExitDemo={() => setDemoRole(null)} />
  }

  if (demoRole === 'member') {
    return <MemberDashboard isDemo={true} onExitDemo={() => setDemoRole(null)} />
  }

  // Authenticated Portals
  if (state === 'admin') return <Dashboard />
  if (state === 'member') return <MemberDashboard />

  if (state === 'denied') {
    const uid = currentUser?.id ?? 'unknown'
    const adminSql = `insert into public.admins (user_id) values ('${uid}');`

    return (
      <div className="auth-fullscreen-container">
        <div className="card narrow text-center" style={{ maxWidth: 500 }}>
          <div className="modal-icon-badge bg-red-subtle text-danger mx-auto mb-3">
            <IconAlertCircle size={32} />
          </div>
          <h2>Account Not Recognized</h2>
          <p className="text-muted text-sm mt-2 mb-3">
            Login succeeded but this account is not in the <code>admins</code> table.
          </p>

          {/* Debug error message if any */}
          {debugInfo && (
            <div
              className="info-box mb-3"
              style={{ background: 'var(--bg-danger-subtle)', textAlign: 'left', flexDirection: 'column', gap: 4 }}
            >
              <div className="text-xs font-semibold text-danger">⚠ Database Error Detected:</div>
              <div className="text-xs font-mono" style={{ wordBreak: 'break-all' }}>{debugInfo}</div>
              <div className="text-xs text-muted mt-1">
                This usually means <strong>setup_complete.sql</strong> has not been run yet, or RLS policies are missing.
              </div>
            </div>
          )}

          {/* User ID */}
          <div className="info-box mb-2" style={{ textAlign: 'left', flexDirection: 'column', gap: 4 }}>
            <div className="text-xs font-semibold text-muted">Your User ID:</div>
            <div
              className="text-xs font-mono"
              style={{ wordBreak: 'break-all', userSelect: 'all', cursor: 'text' }}
            >
              {uid}
            </div>
          </div>

          {/* SQL to run */}
          <div className="info-box mb-4" style={{ textAlign: 'left', flexDirection: 'column', gap: 4 }}>
            <div className="text-xs font-semibold text-primary">Run this in Supabase → SQL Editor:</div>
            <div
              className="text-xs font-mono"
              style={{
                background: 'var(--bg-card)',
                padding: '8px 10px',
                borderRadius: '4px',
                wordBreak: 'break-all',
                userSelect: 'all',
                cursor: 'text'
              }}
            >
              {adminSql}
            </div>
          </div>

          <div className="action-buttons-group justify-center">
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                const { data: isAdmin, error } = await supabase.rpc('is_admin')
                if (error) {
                  setDebugInfo(`is_admin() error: ${error.message} (code: ${error.code})`)
                  return
                }
                if (isAdmin) {
                  setState('admin')
                } else {
                  setDebugInfo('Not found as admin. Make sure the insert ran in the correct Supabase project and setup_complete.sql was run first.')
                }
              }}
            >
              Check Again
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => supabase.auth.signOut()}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Public Home Landing & Portal
  return <Home onEnterDemo={(role) => setDemoRole(role)} />
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/m/:token" element={<PublicProfile />} />
            <Route path="*" element={<AuthGate />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}
