import React, { useState, useEffect } from 'react'
import { IconX, IconCheck, IconUserPlus, IconEdit } from './Icons'

const COMMON_ROLES = [
  'President',
  'Vice President',
  'General Secretary',
  'Lead',
  'Co Lead',
  'Core Member',
]
const COMMON_TEAMS = [
  'Technical',
  'Research',
  'HR',
  'Design and Content',
  'PR and Outreach',
  'Event Management',
]

export default function MemberModal({
  isOpen,
  onClose,
  onSubmit,
  member = null,
  isSubmitting = false
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [department, setDepartment] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [customRole, setCustomRole] = useState(false)
  const [customTeam, setCustomTeam] = useState(false)

  useEffect(() => {
    if (member) {
      setFullName(member.full_name || '')
      setEmail(member.email || '')
      setRole(member.role || '')
      setDepartment(member.department || '')
      setIsActive(member.is_active ?? true)
      setCustomRole(!!member.role && !COMMON_ROLES.includes(member.role))
      setCustomTeam(!!member.department && !COMMON_TEAMS.includes(member.department))
    } else {
      setFullName('')
      setEmail('')
      setRole('')
      setDepartment('')
      setIsActive(true)
      setCustomRole(false)
      setCustomTeam(false)
    }
  }, [member, isOpen])

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!fullName.trim()) return
    onSubmit({
      id: member?.id,
      full_name: fullName.trim(),
      email: email.trim() || null,
      role: role.trim() || 'Member',
      department: department.trim() || null,
      is_active: isActive
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="member-modal-title">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon-badge">
              {member ? <IconEdit size={18} /> : <IconUserPlus size={18} />}
            </span>
            <h3 id="member-modal-title" className="modal-title">
              {member ? 'Edit Member Details' : 'Add New Member'}
            </h3>
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

        <form onSubmit={handleSubmit} className="modal-body form-grid">
          <div className="form-group">
            <label htmlFor="member-fullname">
              Full Name <span className="req">*</span>
            </label>
            <input
              id="member-fullname"
              type="text"
              className="input-field"
              placeholder="e.g. Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="member-email">
              Email Address <span className="form-hint">(Private, for dashboard access)</span>
            </label>
            <input
              id="member-email"
              type="email"
              className="input-field"
              placeholder="alex.morgan@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-row">
            {/* Role dropdown */}
            <div className="form-group flex-1">
              <label htmlFor="member-role">Role</label>
              {!customRole ? (
                <div className="select-wrap">
                  <select
                    id="member-role"
                    className="input-field"
                    value={role}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setCustomRole(true)
                        setRole('')
                      } else {
                        setRole(e.target.value)
                      }
                    }}
                  >
                    <option value="">Select role</option>
                    {COMMON_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                    <option value="__custom__">+ Custom role…</option>
                  </select>
                </div>
              ) : (
                <div className="input-group">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter custom role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => { setCustomRole(false); setRole('') }}
                  >
                    Presets
                  </button>
                </div>
              )}
            </div>

            {/* Team dropdown */}
            <div className="form-group flex-1">
              <label htmlFor="member-team">Team</label>
              {!customTeam ? (
                <div className="select-wrap">
                  <select
                    id="member-team"
                    className="input-field"
                    value={department}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setCustomTeam(true)
                        setDepartment('')
                      } else {
                        setDepartment(e.target.value)
                      }
                    }}
                  >
                    <option value="">Select team</option>
                    {COMMON_TEAMS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="__custom__">+ Custom team…</option>
                  </select>
                </div>
              ) : (
                <div className="input-group">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter custom team"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => { setCustomTeam(false); setDepartment('') }}
                  >
                    Presets
                  </button>
                </div>
              )}
            </div>
          </div>

          {member && (
            <div className="form-group checkbox-row">
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span className="switch-text">
                  <strong>Active Member</strong>
                  <span className="form-hint">Inactive members cannot check in and their QR code becomes invalid</span>
                </span>
              </label>
            </div>
          )}

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !fullName.trim()}
            >
              <IconCheck size={16} />
              <span>{isSubmitting ? 'Saving…' : member ? 'Update Member' : 'Create Member'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
