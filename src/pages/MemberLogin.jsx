import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { IconEye, IconEyeOff, IconAlertCircle, IconUsers } from '../components/Icons'

export default function MemberLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Invalid member email or password'
          : error.message
      )
    }
    setBusy(false)
  }

  return (
    <form className="auth-form-clean" onSubmit={submit}>
      {error && (
        <div className="auth-error-banner">
          <IconAlertCircle size={16} className="text-danger flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="member-login-email">Member Email</label>
        <input
          id="member-login-email"
          type="email"
          className="input-field"
          placeholder="member@ciscoclub.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="member-login-password">Password</label>
        <div className="password-input-wrap">
          <input
            id="member-login-password"
            type={showPassword ? 'text' : 'password'}
            className="input-field"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
          </button>
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
        {busy ? <span className="btn-spinner"></span> : <IconUsers size={16} />}
        <span>{busy ? 'Verifying…' : 'Sign In to Member Portal'}</span>
      </button>

      <p className="auth-footer-help-text">
        Need access? Contact your club lead to link your member profile.
      </p>
    </form>
  )
}
