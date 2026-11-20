import React from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from './ThemeContext'
import {
  IconLogo,
  IconSun,
  IconMoon,
  IconLogOut,
  IconCamera,
  IconShield,
  IconUsers
} from './Icons'

export default function Navbar({
  role = 'admin', // 'admin' | 'member' | 'public'
  userName = '',
  onOpenScanner,
  activeTab,
  setActiveTab
}) {
  const { theme, toggleTheme } = useTheme()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="site-header">
      <div className="header-inner wrap">
        <div className="brand-group">
          <div className="brand-logo">
            <IconLogo size={24} />
          </div>
          <div className="brand-text">
            <div className="brand-title">Cisco Member Hub</div>
            <div className="brand-subtitle">
              {role === 'admin' && (
                <span className="badge badge-accent">
                  <IconShield size={11} /> Admin Console
                </span>
              )}
              {role === 'member' && (
                <span className="badge badge-primary">
                  <IconUsers size={11} /> Member Portal
                </span>
              )}
              {role === 'public' && (
                <span className="badge badge-neutral">Digital Credential</span>
              )}
            </div>
          </div>
        </div>

        {/* Center navigation tabs if in Admin mode */}
        {role === 'admin' && setActiveTab && (
          <nav aria-label="Admin tabs" className="nav-segmented">
            <button
              type="button"
              className={`nav-seg-btn ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              <IconUsers size={15} />
              <span>Members</span>
            </button>
            <button
              type="button"
              className={`nav-seg-btn ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              <span>Attendance</span>
            </button>
          </nav>
        )}

        {/* Right side controls */}
        <div className="header-actions">
          {role === 'admin' && onOpenScanner && (
            <button
              type="button"
              className="btn btn-primary btn-scanner"
              onClick={onOpenScanner}
              title="Open QR Attendance Scanner"
            >
              <IconCamera size={16} />
              <span className="hide-on-mobile">Scan Check-In</span>
            </button>
          )}

          {userName && (
            <div className="user-pill hide-on-mobile" title={userName}>
              <span className="user-dot"></span>
              <span className="user-name">{userName}</span>
            </div>
          )}

          <button
            type="button"
            className="btn-icon"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>

          {role !== 'public' && (
            <button
              type="button"
              className="btn-icon text-danger"
              onClick={handleSignOut}
              title="Sign out of account"
              aria-label="Sign out"
            >
              <IconLogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
