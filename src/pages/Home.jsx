import React, { useState } from 'react'
import { useTheme } from '../components/ThemeContext'
import Login from './Login'
import MemberLogin from './MemberLogin'
import {
  IconLogo,
  IconShield,
  IconUsers,
  IconSun,
  IconMoon,
  IconSparkles
} from '../components/Icons'

export default function Home({ onEnterDemo }) {
  const { theme, toggleTheme } = useTheme()
  const [selectedRole, setSelectedRole] = useState(null) // null | 'admin' | 'member'

  return (
    <div className="auth-fullscreen-container">
      {/* Top right theme switcher */}
      <button
        type="button"
        className="btn-icon auth-floating-theme"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
      >
        {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
      </button>

      <div className="cisco-community-home-card">
        {/* Brand Header */}
        <div className="brand-center-header">
          <div className="brand-logo-large">
            <IconLogo size={42} />
          </div>
          <h1 className="brand-main-title">Cisco Community</h1>
          <p className="brand-sub-title">
            {selectedRole === null
              ? 'Select your portal to continue'
              : selectedRole === 'admin'
              ? 'Admin Console Sign In'
              : 'Member Portal Sign In'}
          </p>
        </div>

        {/* The 2 Core Options: Admin or Member */}
        {selectedRole === null && (
          <div className="role-selection-grid">
            {/* Option 1: Admin */}
            <button
              type="button"
              className="role-selection-card admin-card"
              onClick={() => setSelectedRole('admin')}
            >
              <div className="role-card-icon bg-blue-subtle text-primary">
                <IconShield size={32} />
              </div>
              <h3 className="role-card-title">Admin</h3>
              <p className="role-card-desc">
                Manage club members, assign QR badges & track event attendance
              </p>
              <span className="role-card-btn">Enter as Admin →</span>
            </button>

            {/* Option 2: Member */}
            <button
              type="button"
              className="role-selection-card member-card"
              onClick={() => setSelectedRole('member')}
            >
              <div className="role-card-icon bg-purple-subtle text-accent">
                <IconUsers size={32} />
              </div>
              <h3 className="role-card-title">Member</h3>
              <p className="role-card-desc">
                Access your digital ID pass, achievements & check-in history
              </p>
              <span className="role-card-btn">Enter as Member →</span>
            </button>
          </div>
        )}

        {/* Admin Login Form */}
        {selectedRole === 'admin' && (
          <div className="role-form-wrapper">
            <Login />
            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedRole(null)}
              >
                ← Back to options
              </button>
            </div>
          </div>
        )}

        {/* Member Login Form */}
        {selectedRole === 'member' && (
          <div className="role-form-wrapper">
            <MemberLogin />
            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedRole(null)}
              >
                ← Back to options
              </button>
            </div>
          </div>
        )}

        {/* Subtle Preview Demo Link */}
        {onEnterDemo && (
          <div className="demo-subtle-footer">
            <button
              type="button"
              className="btn-link-demo text-xs"
              onClick={() => onEnterDemo(selectedRole || 'admin')}
            >
              <IconSparkles size={12} />
              <span>Explore Demo Mode</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
