import React, { useState } from 'react'
import { saveLocalCredentials, clearLocalCredentials, configMissing } from '../lib/supabase'
import {
  IconX,
  IconCheck,
  IconCopy,
  IconAlertCircle,
  IconExternalLink,
  IconShield
} from './Icons'

export default function DatabaseSetupModal({ isOpen, onClose, notify }) {
  const [url, setUrl] = useState(() => localStorage.getItem('cisco_supabase_url') || '')
  const [anonKey, setAnonKey] = useState(() => localStorage.getItem('cisco_supabase_key') || '')
  const [copiedSql, setCopiedSql] = useState(false)
  const [activeTab, setActiveTab] = useState('connect') // 'connect' | 'sql' | 'steps'

  if (!isOpen) return null

  const handleSave = (e) => {
    e.preventDefault()
    if (!url.trim() || !anonKey.trim()) {
      notify?.error?.('Please enter both Supabase URL and Anon Key')
      return
    }
    notify?.success?.('Database credentials saved. Connecting…')
    saveLocalCredentials(url, anonKey)
  }

  const handleClear = () => {
    if (window.confirm('Clear saved database keys?')) {
      clearLocalCredentials()
    }
  }

  const handleCopySql = async () => {
    try {
      const resp = await fetch('/supabase/setup_complete.sql')
      let sqlText = ''
      if (resp.ok) {
        sqlText = await resp.text()
      } else {
        sqlText = `-- Copy setup_complete.sql from the project's supabase directory`
      }
      navigator.clipboard.writeText(sqlText).then(() => {
        setCopiedSql(true)
        notify?.success?.('SQL setup script copied to clipboard')
        setTimeout(() => setCopiedSql(false), 2500)
      })
    } catch {
      notify?.info?.('You can copy supabase/setup_complete.sql directly from the project directory')
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="db-modal-title"
    >
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon-badge">
              <IconShield size={18} />
            </span>
            <div>
              <h3 id="db-modal-title" className="modal-title">
                Supabase Database Connection
              </h3>
              <p className="modal-subtitle">
                Link to your original Supabase project or customize keys
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Modal tabs */}
        <div className="scanner-mode-tabs mx-6 mt-4">
          <button
            type="button"
            className={`scanner-tab-btn ${activeTab === 'connect' ? 'active' : ''}`}
            onClick={() => setActiveTab('connect')}
          >
            <span>1. API Credentials</span>
          </button>
          <button
            type="button"
            className={`scanner-tab-btn ${activeTab === 'sql' ? 'active' : ''}`}
            onClick={() => setActiveTab('sql')}
          >
            <span>2. SQL Setup Script</span>
          </button>
          <button
            type="button"
            className={`scanner-tab-btn ${activeTab === 'steps' ? 'active' : ''}`}
            onClick={() => setActiveTab('steps')}
          >
            <span>3. Admin User Guide</span>
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'connect' && (
            <form onSubmit={handleSave} className="form-grid">
              <div className="info-box">
                <IconAlertCircle size={18} className="text-primary flex-shrink-0" />
                <div className="text-sm">
                  Find your Project URL and Anon Key in{' '}
                  <strong>Supabase Dashboard &gt; Project Settings &gt; API</strong>.
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="db-url">
                  Supabase Project URL <span className="req">*</span>
                </label>
                <input
                  id="db-url"
                  type="url"
                  className="input-field font-mono"
                  placeholder="https://your-project-ref.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="db-anon-key">
                  Anon / Public API Key <span className="req">*</span>
                </label>
                <input
                  id="db-anon-key"
                  type="text"
                  className="input-field font-mono"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  required
                />
                <span className="form-hint text-xs">
                  ⚠️ Never use the <code>service_role</code> secret key here.
                </span>
              </div>

              <div className="action-buttons-group mt-2">
                <button type="submit" className="btn btn-primary">
                  <IconCheck size={16} />
                  <span>Save & Connect Live Database</span>
                </button>
                {localStorage.getItem('cisco_supabase_url') && (
                  <button
                    type="button"
                    className="btn btn-outline text-danger"
                    onClick={handleClear}
                  >
                    Clear Saved Keys
                  </button>
                )}
              </div>
            </form>
          )}

          {activeTab === 'sql' && (
            <div className="form-grid">
              <div className="info-box">
                <div className="text-sm">
                  Run <code>supabase/setup_complete.sql</code> in your Supabase{' '}
                  <strong>SQL Editor</strong>. It automatically creates all tables, RLS rules,
                  functions, and storage buckets.
                </div>
              </div>

              <div className="code-block" style={{ maxHeight: 220, overflowY: 'auto' }}>
                <pre style={{ margin: 0, fontSize: 11 }}>
{`-- Preview of setup_complete.sql
create table if not exists public.admins (...);
create table if not exists public.members (...);
create table if not exists public.contributions (...);
create table if not exists public.attendance (...);
create table if not exists public.member_users (...);
-- Includes 5 stored procedures, RLS policies, and 'qr-codes' bucket`}
                </pre>
              </div>

              <div className="action-buttons-group">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCopySql}
                >
                  {copiedSql ? (
                    <IconCheck size={16} className="text-success" />
                  ) : (
                    <IconCopy size={16} />
                  )}
                  <span>{copiedSql ? 'Copied Full Script!' : 'Copy setup_complete.sql'}</span>
                </button>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                >
                  <IconExternalLink size={14} />
                  <span>Open Supabase Dashboard</span>
                </a>
              </div>
            </div>
          )}

          {activeTab === 'steps' && (
            <div className="form-grid text-sm text-muted">
              <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <li>
                  Go to <strong>Authentication &gt; Users</strong> in Supabase and click{' '}
                  <strong>Add user &gt; Create user</strong>.
                </li>
                <li>Copy the newly generated <strong>User UID</strong> (UUID).</li>
                <li>
                  Open <strong>SQL Editor</strong> and run:
                  <div className="code-block my-2 text-xs font-mono">
                    insert into public.admins (user_id) values ('PASTE_USER_UUID_HERE');
                  </div>
                </li>
                <li>
                  Sign in with that email and password on the Home Page under the{' '}
                  <strong>Admin Console</strong> tab!
                </li>
              </ol>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
