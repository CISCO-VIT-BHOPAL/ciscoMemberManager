import React, { useCallback, useEffect, useState } from 'react'
import { supabase, configMissing } from '../lib/supabase'
import { DEMO_MEMBERS, DEMO_ATTENDANCE, DEMO_CONTRIBUTIONS } from '../data/demoData'
import Navbar from '../components/Navbar'
import IdCard from '../components/IdCard'
import { useToast } from '../components/Toast'
import {
  IconUsers,
  IconIdCard,
  IconAward,
  IconCalendar,
  IconClock,
  IconExternalLink,
  IconCheckCircle,
  IconAlertCircle,
  IconRefresh,
  IconQrCode,
  IconX,
  IconSparkles
} from '../components/Icons'

export default function MemberDashboard({ isDemo = false, onExitDemo, onOpenDbModal }) {
  const notify = useToast()
  const useDemo = isDemo || configMissing
  const [profile, setProfile] = useState(null)
  const [qrToken, setQrToken] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | unlinked | error
  const [tab, setTab] = useState('pass') // 'pass' | 'contributions' | 'attendance'
  const [showQuickPass, setShowQuickPass] = useState(false)

  const loadProfile = useCallback(async () => {
    setStatus('loading')

    if (useDemo) {
      const demoUser = DEMO_MEMBERS[0] // Alex Morgan
      setProfile({
        id: demoUser.id,
        full_name: demoUser.full_name,
        role: demoUser.role,
        department: demoUser.department,
        joined: demoUser.created_at,
        is_active: demoUser.is_active,
        contributions: DEMO_CONTRIBUTIONS,
        attendance: DEMO_ATTENDANCE
      })
      setQrToken(demoUser.qr_token)
      setStatus('ok')
      return
    }

    try {
      const { data, error } = await supabase.rpc('get_my_member_profile')
      if (error) throw error
      if (!data) {
        setStatus('unlinked')
        return
      }

      setProfile(data)

      const { data: memberRow } = await supabase
        .from('members')
        .select('qr_token')
        .eq('id', data.id)
        .maybeSingle()

      if (memberRow?.qr_token) {
        setQrToken(memberRow.qr_token)
      }

      setStatus('ok')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }, [useDemo])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  if (status === 'loading') {
    return (
      <div className="center-screen-layout">
        <div className="card loading-card max-w-sm">
          <IconRefresh size={32} className="spin text-primary mb-3" />
          <h3>Loading member portal…</h3>
          <p className="text-muted text-sm">Retrieving your membership profile & credentials</p>
        </div>
      </div>
    )
  }

  if (status === 'unlinked') {
    return (
      <div className="center-screen-layout">
        <div className="card narrow text-center">
          <div className="modal-icon-badge bg-yellow-subtle text-warning mx-auto mb-3">
            <IconAlertCircle size={28} />
          </div>
          <h2>Account Not Linked Yet</h2>
          <p className="text-muted text-sm mt-2 mb-4">
            Your login account has not been linked to a member profile. Please contact
            your club administrator or president with your account email to link your profile.
          </p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => supabase.auth.signOut()}
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  if (status === 'error' || !profile) {
    return (
      <div className="center-screen-layout">
        <div className="card narrow text-center">
          <div className="modal-icon-badge bg-red-subtle text-danger mx-auto mb-3">
            <IconAlertCircle size={28} />
          </div>
          <h2>Could Not Load Profile</h2>
          <p className="text-muted text-sm mt-2 mb-4">
            An error occurred while connecting to the club database. Please try again.
          </p>
          <div className="action-buttons-group justify-center">
            <button type="button" className="btn btn-primary" onClick={loadProfile}>
              Retry
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

  const contribs = profile.contributions || []
  const attendance = profile.attendance || []
  const lastAttended =
    attendance.length > 0
      ? new Date(attendance[0].scanned_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : 'No check-ins yet'

  const memberFull = {
    ...profile,
    qr_token: qrToken,
    created_at: profile.joined
  }

  const initials = profile.full_name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="dashboard-layout">
      {/* Demo Mode Notice Banner */}
      {useDemo && (
        <div className="demo-mode-top-banner">
          <div className="demo-banner-content wrap">
            <span className="demo-banner-badge">
              <IconSparkles size={14} /> DEMO MEMBER PORTAL
            </span>
            <span className="demo-banner-text">
              Previewing member experience as <strong>{profile.full_name}</strong>.
            </span>
            <div className="demo-banner-actions">
              {onOpenDbModal && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline text-xs"
                  onClick={onOpenDbModal}
                >
                  ⚙️ Connect Supabase
                </button>
              )}
              {onExitDemo && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost text-xs"
                  onClick={onExitDemo}
                >
                  Exit Demo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Navbar role="member" userName={profile.full_name} />

      <main className="wrap main-content">
        {/* Profile Hero Header */}
        <div className="member-hero-card">
          <div className="member-hero-info">
            <div className="avatar-circle avatar-xl">{initials}</div>
            <div className="member-hero-text">
              <div className="member-hero-title-row">
                <h2>{profile.full_name}</h2>
                <span className={`badge ${profile.is_active ? 'badge-success' : 'badge-neutral'}`}>
                  {profile.is_active ? 'Active Member' : 'Inactive'}
                </span>
              </div>

              <div className="member-hero-meta">
                <span className="role-badge">{profile.role || 'Member'}</span>
                {profile.department && <span className="dept-tag">{profile.department}</span>}
                <span className="member-since-text">
                  Member since{' '}
                  {new Date(profile.joined).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          {qrToken && (
            <button
              type="button"
              className="btn btn-primary btn-quick-pass"
              onClick={() => setShowQuickPass(true)}
            >
              <IconQrCode size={18} />
              <span>Show Event Pass</span>
            </button>
          )}
        </div>

        {/* Stats Row */}
        <section aria-label="Member Activity Stats" className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrap bg-purple-subtle text-accent">
              <IconAward size={22} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{contribs.length}</div>
              <div className="stat-label">Contributions</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap bg-emerald-subtle text-success">
              <IconCheckCircle size={22} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{attendance.length}</div>
              <div className="stat-label">Events Attended</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap bg-blue-subtle text-primary">
              <IconCalendar size={22} />
            </div>
            <div className="stat-content">
              <div className="stat-value text-base">{lastAttended}</div>
              <div className="stat-label">Last Check-In</div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="nav-segmented mb-4">
          <button
            type="button"
            className={`nav-seg-btn ${tab === 'pass' ? 'active' : ''}`}
            onClick={() => setTab('pass')}
          >
            <IconIdCard size={16} />
            <span>My Digital Pass</span>
          </button>
          <button
            type="button"
            className={`nav-seg-btn ${tab === 'contributions' ? 'active' : ''}`}
            onClick={() => setTab('contributions')}
          >
            <IconAward size={16} />
            <span>Achievements ({contribs.length})</span>
          </button>
          <button
            type="button"
            className={`nav-seg-btn ${tab === 'attendance' ? 'active' : ''}`}
            onClick={() => setTab('attendance')}
          >
            <IconCalendar size={16} />
            <span>Attendance History ({attendance.length})</span>
          </button>
        </div>

        {/* TAB 1: DIGITAL ID CARD PASS */}
        {tab === 'pass' && (
          <section aria-label="Digital ID Pass" className="card p-6">
            <div className="section-header-row mb-4">
              <div>
                <h3 className="section-title">Member QR Code & Credentials</h3>
                <p className="text-muted text-sm">
                  Scan this QR code at club events for instant check-in, or download the image.
                </p>
              </div>
            </div>

            {qrToken ? (
              <IdCard member={memberFull} notify={notify} />
            ) : (
              <div className="id-card-empty-prompt">
                <IconQrCode size={48} className="text-muted opacity-40 mb-3" />
                <h4>No Digital Pass Issued Yet</h4>
                <p className="text-muted text-sm max-w-sm text-center">
                  Your club administrator hasn't assigned a QR pass to your profile yet.
                  Contact your club lead to generate your credentials.
                </p>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: CONTRIBUTIONS */}
        {tab === 'contributions' && (
          <section aria-label="My Contributions" className="card p-6">
            <div className="section-header-row mb-4">
              <div>
                <h3 className="section-title">My Recognized Contributions</h3>
                <p className="text-muted text-sm">
                  Verified projects, leadership initiatives, talks, and milestones recorded by the club.
                </p>
              </div>
            </div>

            {contribs.length === 0 && (
              <div className="empty-state-panel">
                <IconAward size={48} className="text-muted opacity-40 mb-3" />
                <h4>No contributions recorded yet</h4>
                <p className="text-muted text-sm max-w-sm">
                  Participate in club events, lead workshops, or ship community projects to build your portfolio.
                </p>
              </div>
            )}

            {contribs.length > 0 && (
              <div className="contributions-list">
                {contribs.map((c, index) => {
                  const dateStr = new Date(c.date || c.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                  return (
                    <div key={c.id || index} className="contribution-card">
                      <div className="contrib-main">
                        <div className="contrib-title-row">
                          <strong className="contrib-title">{c.title}</strong>
                          <span className="contrib-date">
                            <IconClock size={12} /> {dateStr}
                          </span>
                        </div>
                        {c.description && <p className="contrib-desc">{c.description}</p>}
                        {c.link && (
                          <a
                            href={c.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contrib-link"
                          >
                            <IconExternalLink size={13} />
                            <span>View resource</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: ATTENDANCE HISTORY */}
        {tab === 'attendance' && (
          <section aria-label="Attendance History" className="card p-6">
            <div className="section-header-row mb-4">
              <div>
                <h3 className="section-title">Attendance Check-In Log</h3>
                <p className="text-muted text-sm">
                  Historical log of all club meetings, workshops, and hackathons you checked in for.
                </p>
              </div>
            </div>

            {attendance.length === 0 && (
              <div className="empty-state-panel">
                <IconCalendar size={48} className="text-muted opacity-40 mb-3" />
                <h4>No attendance records found</h4>
                <p className="text-muted text-sm max-w-sm">
                  Have your digital ID card scanned by a club organizer at the door to register your presence.
                </p>
              </div>
            )}

            {attendance.length > 0 && (
              <div className="table-responsive-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((a, index) => {
                      const d = new Date(a.scanned_at)
                      return (
                        <tr key={a.id || index}>
                          <td className="text-muted font-mono text-sm">
                            {attendance.length - index}
                          </td>
                          <td>
                            <span className="flex-center gap-1 font-medium">
                              <IconCalendar size={13} className="text-muted" />
                              {d.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </td>
                          <td>
                            <span className="flex-center gap-1 font-mono text-sm text-muted">
                              <IconClock size={13} />
                              {d.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-success text-xs">
                              <IconCheckCircle size={12} /> Checked In
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Full-Screen Quick Pass Modal (Mobile check-in view) */}
      {showQuickPass && qrToken && (
        <div
          className="modal-backdrop"
          onClick={() => setShowQuickPass(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="quick-pass-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="quick-pass-close"
              onClick={() => setShowQuickPass(false)}
            >
              <IconX size={20} />
            </button>

            <div className="quick-pass-header">
              <span className="badge badge-accent">EVENT CHECK-IN PASS</span>
              <h3>{profile.full_name}</h3>
              <p className="text-muted text-sm">
                {[profile.role, profile.department].filter(Boolean).join(' · ')}
              </p>
            </div>

            <div className="quick-pass-qr-wrap">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  `${window.location.origin}/m/${qrToken}`
                )}`}
                alt="Member QR Pass"
                className="quick-pass-qr-img"
              />
            </div>

            <p className="quick-pass-hint">
              Hold this QR up to the organizer's scanner to check in
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
