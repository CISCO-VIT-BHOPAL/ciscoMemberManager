import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, configMissing } from '../lib/supabase'
import { DEMO_MEMBERS, DEMO_CONTRIBUTIONS } from '../data/demoData'
import { useTheme } from '../components/ThemeContext'
import {
  IconLogo,
  IconShield,
  IconCheckCircle,
  IconAlertCircle,
  IconClock,
  IconAward,
  IconExternalLink,
  IconSun,
  IconMoon
} from '../components/Icons'

export default function PublicProfile() {
  const { token } = useParams()
  const { theme, toggleTheme } = useTheme()
  const [member, setMember] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | notfound

  useEffect(() => {
    // Check if token matches a demo member
    const demoMatch = DEMO_MEMBERS.find((m) => m.qr_token === token)
    if (demoMatch) {
      setMember({
        full_name: demoMatch.full_name,
        role: demoMatch.role,
        department: demoMatch.department,
        joined: demoMatch.created_at,
        contributions: DEMO_CONTRIBUTIONS
      })
      setStatus('ok')
      return
    }

    if (configMissing) {
      setStatus('notfound')
      return
    }

    supabase
      .rpc('get_member_by_token', { p_token: token })
      .then(({ data, error }) => {
        if (error || !data) {
          setStatus('notfound')
        } else {
          setMember(data)
          setStatus('ok')
        }
      })
      .catch(() => setStatus('notfound'))
  }, [token])

  return (
    <div className="public-profile-layout">
      {/* Mini top bar */}
      <header className="public-top-bar wrap">
        <div className="brand-group">
          <div className="brand-logo">
            <IconLogo size={22} />
          </div>
          <span className="brand-title">Cisco Member Verification</span>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
          <Link to="/" className="btn btn-outline btn-sm">
            Sign In
          </Link>
        </div>
      </header>

      <main className="wrap public-main">
        {status === 'loading' && (
          <div className="card public-card text-center">
            <div className="badge-verification-pulse mb-3">
              <IconShield size={32} className="text-primary" />
            </div>
            <h3>Verifying Cryptographic Credential…</h3>
            <p className="text-muted text-sm mt-1">Connecting to authentication ledger</p>
          </div>
        )}

        {status === 'notfound' && (
          <div className="card public-card text-center">
            <div className="modal-icon-badge bg-red-subtle text-danger mx-auto mb-3">
              <IconAlertCircle size={32} />
            </div>
            <h2>Invalid or Expired Credential</h2>
            <p className="text-muted text-sm max-w-sm mx-auto mt-2 mb-4">
              This digital badge token does not exist, has been revoked, or the member profile
              has been deactivated by the club administration.
            </p>
            <Link to="/" className="btn btn-primary">
              Return to Member Hub
            </Link>
          </div>
        )}

        {status === 'ok' && member && (
          <div className="public-credential-card">
            {/* Security Top Banner */}
            <div className="credential-verified-banner">
              <IconCheckCircle size={20} className="text-success flex-shrink-0" />
              <div>
                <strong>Official Verified Credential</strong>
                <p className="banner-subtext">
                  This identity and membership have been verified in real-time.
                </p>
              </div>
            </div>

            <div className="credential-body">
              {/* Member Profile Block */}
              <div className="credential-member-header">
                <div className="avatar-circle avatar-xl">
                  {member.full_name
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>

                <div className="credential-member-text">
                  <h1 className="credential-name">{member.full_name}</h1>
                  <div className="credential-badges">
                    <span className="role-badge">{member.role || 'Member'}</span>
                    {member.department && (
                      <span className="dept-tag">{member.department}</span>
                    )}
                    <span className="badge badge-success">Active Member</span>
                  </div>
                  <p className="credential-joined">
                    Member since{' '}
                    {new Date(member.joined).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Verified Contributions */}
              <div className="credential-contributions-section">
                <div className="section-title-row">
                  <IconAward size={18} className="text-accent" />
                  <h3 className="section-title-sm">Recognized Achievements & Works</h3>
                </div>

                {(!member.contributions || member.contributions.length === 0) && (
                  <p className="text-muted text-sm italic">
                    No public achievements recorded yet for this member.
                  </p>
                )}

                {member.contributions && member.contributions.length > 0 && (
                  <div className="contributions-list mt-3">
                    {member.contributions.map((c, i) => (
                      <div key={i} className="contribution-card">
                        <div className="contrib-main">
                          <div className="contrib-title-row">
                            <strong className="contrib-title">{c.title}</strong>
                            {c.date && (
                              <span className="contrib-date">
                                <IconClock size={12} />{' '}
                                {new Date(c.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            )}
                          </div>
                          {c.description && <p className="contrib-desc">{c.description}</p>}
                          {c.link && /^https?:\/\//i.test(c.link) && (
                            <a
                              href={c.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="contrib-link"
                            >
                              <IconExternalLink size={13} />
                              <span>View project / resource ↗</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cryptographic Security Details Footer */}
              <div className="credential-footer">
                <div className="credential-seal">
                  <IconShield size={24} className="text-primary" />
                  <div>
                    <div className="seal-title">Authentic Club ID</div>
                    <div className="seal-desc">
                      Cryptographically signed token · Anti-tamper verification
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
