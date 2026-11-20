import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { IconEye, IconEyeOff, IconAlertCircle, IconShield } from '../components/Icons'

export default function Login() {
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
          ? 'Invalid admin email or password'
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
        <label htmlFor="admin-email">Admin Email</label>
        <input
          id="admin-email"
          type="email"
          className="input-field"
          placeholder="admin@ciscoclub.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="admin-password">Password</label>
        <div className="password-input-wrap">
          <input
            id="admin-password"
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
        {busy ? <span className="btn-spinner"></span> : <IconShield size={16} />}
        <span>{busy ? 'Authenticating…' : 'Sign In as Administrator'}</span>
      </button>
    </form>
  )
}
