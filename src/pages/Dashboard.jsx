import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import jsQR from 'jsqr'
import QRCode from 'qrcode'
import { supabase, configMissing } from '../lib/supabase'
import { DEMO_MEMBERS, DEMO_ATTENDANCE } from '../data/demoData'
import Navbar from '../components/Navbar'
import MemberModal from '../components/MemberModal'
import ContributionsModal from '../components/ContributionsModal'
import LinkUserModal from '../components/LinkUserModal'
import IdCard from '../components/IdCard'
import QrScanner from '../components/QrScanner'
import { useToast } from '../components/Toast'
import {
  IconUsers,
  IconUserPlus,
  IconSearch,
  IconFilter,
  IconQrCode,
  IconCamera,
  IconIdCard,
  IconAward,
  IconDownload,
  IconUpload,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconFileSpreadsheet,
  IconLayoutGrid,
  IconLayoutList,
  IconCheckCircle,
  IconAlertCircle,
  IconX,
  IconCalendar,
  IconClock,
  IconLink,
  IconSparkles
} from '../components/Icons'

const profileUrl = (token) => `${window.location.origin}/m/${token}`

// Helper: decode QR from uploaded image file
async function decodeQrFromFile(file) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const result = jsQR(img.data, img.width, img.height)
  if (!result) throw new Error('No QR code found in uploaded image')
  return result.data
}

function tokenFromPayload(payload) {
  try {
    const m = new URL(payload).pathname.match(/\/m\/([A-Za-z0-9_-]{16,})/i)
    if (m) return m[1]
  } catch {
    /* not a valid URL */
  }
  if (/^[A-Za-z0-9_-]{16,}$/.test(payload.trim())) return payload.trim()
  throw new Error('This QR does not contain a valid token or /m/<token> link')
}

async function downloadQrCodeImage(member, notify) {
  try {
    const dataUrl = await QRCode.toDataURL(profileUrl(member.qr_token), {
      width: 600,
      margin: 2,
      color: { dark: '#0a101f', light: '#ffffff' }
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${member.full_name.replace(/\s+/g, '_')}_QR.png`
    a.click()
    notify?.success?.(`Downloaded QR for ${member.full_name}`)
  } catch (err) {
    notify?.error?.('Failed to download QR code')
  }
}

export default function Dashboard({ isDemo = false, onExitDemo, onOpenDbModal }) {
  const notify = useToast()
  const useDemo = isDemo || configMissing
  const [members, setMembers] = useState(() => (useDemo ? DEMO_MEMBERS : []))
  const [loading, setLoading] = useState(!useDemo)
  const [tab, setTab] = useState('members') // 'members' | 'attendance'

  // Search & Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'inactive'
  const [qrFilter, setQrFilter] = useState('all') // 'all' | 'assigned' | 'missing'
  const [deptFilter, setDeptFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest') // 'newest' | 'name' | 'dept'
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [selectedContributions, setSelectedContributions] = useState(null)
  const [idCardMember, setIdCardMember] = useState(null)
  const [linkingMember, setLinkingMember] = useState(null)
  const [showScanner, setShowScanner] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState(null)

  // Attendance
  const [attLog, setAttLog] = useState(() => (useDemo ? DEMO_ATTENDANCE : []))
  const [attLoading, setAttLoading] = useState(false)
  const [attSearch, setAttSearch] = useState('')

  // Upload QR handling
  const fileRef = useRef(null)
  const uploadTarget = useRef(null)

  // Load members
  const loadMembers = useCallback(async () => {
    if (useDemo) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      notify.error(error.message)
    } else {
      setMembers(data || [])
    }
    setLoading(false)
  }, [useDemo, notify])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  // Load attendance log
  const loadAttendance = useCallback(async () => {
    if (useDemo) {
      setAttLoading(false)
      return
    }
    setAttLoading(true)
    const { data, error } = await supabase.rpc('get_attendance_log', { p_days: 30 })
    if (error) {
      notify.error(error.message)
    } else {
      setAttLog(data || [])
    }
    setAttLoading(false)
  }, [useDemo, notify])

  useEffect(() => {
    if (tab === 'attendance') {
      loadAttendance()
    }
  }, [tab, loadAttendance])

  // Add / Edit Member
  const handleSaveMember = async (formValues) => {
    try {
      if (useDemo) {
        if (formValues.id) {
          // Edit in demo
          setMembers((prev) =>
            prev.map((m) =>
              m.id === formValues.id
                ? {
                    ...m,
                    full_name: formValues.full_name,
                    email: formValues.email,
                    role: formValues.role,
                    department: formValues.department,
                    is_active: formValues.is_active
                  }
                : m
            )
          )
          notify.success(`Updated ${formValues.full_name} (Demo)`)
          setEditingMember(null)
        } else {
          const demoToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
          const newM = {
            id: `demo-${Date.now()}`,
            full_name: formValues.full_name,
            email: formValues.email,
            role: formValues.role,
            department: formValues.department,
            qr_token: demoToken,
            is_active: true,
            created_at: new Date().toISOString()
          }
          setMembers((prev) => [newM, ...prev])
          notify.success(`Member ${formValues.full_name} added with QR ✓ (Demo)`)
          setShowAddModal(false)
        }
        return
      }

      // Live Supabase
      if (formValues.id) {
        const { error } = await supabase
          .from('members')
          .update({
            full_name: formValues.full_name,
            email: formValues.email,
            role: formValues.role,
            department: formValues.department,
            is_active: formValues.is_active
          })
          .eq('id', formValues.id)

        if (error) throw error
        notify.success(`Updated ${formValues.full_name}`)
        setEditingMember(null)
      } else {
        // Auto-generate 32-char hex QR token on member creation
        const newQrToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')

        const { error } = await supabase.from('members').insert({
          full_name: formValues.full_name,
          email: formValues.email,
          role: formValues.role,
          department: formValues.department,
          qr_token: newQrToken,
          is_active: true
        })

        if (error) throw error
        notify.success(`Member ${formValues.full_name} added with QR generated ✓`)
        setShowAddModal(false)
      }
      loadMembers()
    } catch (err) {
      notify.error(err.message)
    }
  }

  // Assign or Re-assign QR code
  const handleAssignQr = async (member) => {
    if (
      member.qr_token &&
      !window.confirm(
        `This will replace the existing QR code for ${member.full_name}. The old card will be revoked immediately. Continue?`
      )
    ) {
      return
    }

    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (useDemo) {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, qr_token: token } : m))
      )
      notify.success(`New QR token assigned to ${member.full_name} (Demo)`)
      return
    }

    try {
      // Direct update to members table
      const { error: updateError } = await supabase
        .from('members')
        .update({ qr_token: token })
        .eq('id', member.id)

      if (updateError) {
        // Fallback to assign_qr RPC
        const { error: rpcError } = await supabase.rpc('assign_qr', { p_member: member.id })
        if (rpcError) throw new Error(updateError.message || rpcError.message)
      }

      notify.success(`QR token generated & saved in database for ${member.full_name} ✓`)
      loadMembers()
    } catch (err) {
      notify.error(err.message || 'Failed to generate QR')
    }
  }

  // Upload QR code image
  const triggerPickUpload = (member) => {
    uploadTarget.current = member
    if (fileRef.current) {
      fileRef.current.value = ''
      fileRef.current.click()
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    const member = uploadTarget.current
    if (!file || !member) return

    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      notify.error('Please upload a PNG or JPEG image under 2MB')
      return
    }

    try {
      notify.info('Scanning uploaded QR code…')
      const rawText = await decodeQrFromFile(file)
      const token = tokenFromPayload(rawText)

      if (useDemo) {
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, qr_token: token } : m))
        )
        notify.success(`QR linked to ${member.full_name} (Demo)`)
        return
      }

      const path = `${member.id}/${Date.now()}.${file.type === 'image/png' ? 'png' : 'jpg'}`
      const up = await supabase.storage
        .from('qr-codes')
        .upload(path, file, { contentType: file.type })

      if (up.error) throw up.error

      const { error } = await supabase
        .from('members')
        .update({ qr_token: token, qr_image_path: path })
        .eq('id', member.id)

      if (error) {
        throw new Error(
          error.code === '23505'
            ? 'That QR code is already linked to another member'
            : error.message
        )
      }

      notify.success(`QR successfully linked to ${member.full_name}`)
      loadMembers()
    } catch (err) {
      notify.error(err.message)
    }
  }

  // Toggle active/inactive
  const handleToggleActive = async (member) => {
    const nextState = !member.is_active
    if (useDemo) {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, is_active: nextState } : m))
      )
      notify.success(`${member.full_name} is now ${nextState ? 'Active' : 'Deactivated'} (Demo)`)
      return
    }

    try {
      const { error } = await supabase
        .from('members')
        .update({ is_active: nextState })
        .eq('id', member.id)

      if (error) throw error
      notify.success(
        `${member.full_name} is now ${nextState ? 'Active' : 'Deactivated'}`
      )
      loadMembers()
    } catch (err) {
      notify.error(err.message)
    }
  }

  // Delete member
  const confirmDeleteMember = async () => {
    if (!memberToDelete) return
    if (useDemo) {
      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id))
      notify.success(`Deleted ${memberToDelete.full_name} (Demo)`)
      setMemberToDelete(null)
      return
    }

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberToDelete.id)

      if (error) throw error
      notify.success(`Deleted ${memberToDelete.full_name}`)
      setMemberToDelete(null)
      loadMembers()
    } catch (err) {
      notify.error(err.message)
    }
  }

  // Export members to CSV
  const handleExportMembersCSV = () => {
    if (members.length === 0) {
      notify.warn('No members to export')
      return
    }

    const headers = ['Full Name', 'Role', 'Department', 'Email', 'Active', 'Has QR', 'Joined Date']
    const rows = filteredMembers.map((m) => [
      `"${(m.full_name || '').replace(/"/g, '""')}"`,
      `"${(m.role || '').replace(/"/g, '""')}"`,
      `"${(m.department || '').replace(/"/g, '""')}"`,
      `"${(m.email || '').replace(/"/g, '""')}"`,
      m.is_active ? 'Active' : 'Inactive',
      m.qr_token ? 'Yes' : 'No',
      new Date(m.created_at).toISOString().split('T')[0]
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `club_members_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    notify.success('Exported members CSV')
  }

  // Export attendance log to CSV
  const handleExportAttendanceCSV = () => {
    if (attLog.length === 0) {
      notify.warn('No attendance records to export')
      return
    }

    const headers = ['Member Name', 'Role', 'Date', 'Time', 'Notes']
    const rows = attLog.map((a) => {
      const d = new Date(a.scanned_at)
      return [
        `"${(a.member_name || '').replace(/"/g, '""')}"`,
        `"${(a.member_role || '').replace(/"/g, '""')}"`,
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        `"${(a.notes || '').replace(/"/g, '""')}"`
      ]
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `attendance_log_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    notify.success('Exported attendance log CSV')
  }

  // Departments list for filter
  const allDepartments = useMemo(() => {
    const set = new Set()
    members.forEach((m) => {
      if (m.department) set.add(m.department.trim())
    })
    return Array.from(set).sort()
  }, [members])

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members
      .filter((m) => {
        const text = `${m.full_name} ${m.email || ''} ${m.department || ''} ${m.role || ''}`.toLowerCase()
        if (search && !text.includes(search.toLowerCase())) return false

        if (statusFilter === 'active' && !m.is_active) return false
        if (statusFilter === 'inactive' && m.is_active) return false

        if (qrFilter === 'assigned' && !m.qr_token) return false
        if (qrFilter === 'missing' && m.qr_token) return false

        if (deptFilter !== 'all' && m.department !== deptFilter) return false

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.full_name.localeCompare(b.full_name)
        if (sortBy === 'dept') return (a.department || '').localeCompare(b.department || '')
        return new Date(b.created_at) - new Date(a.created_at)
      })
  }, [members, search, statusFilter, qrFilter, deptFilter, sortBy])

  // Filtered attendance records
  const filteredAttendance = useMemo(() => {
    if (!attSearch.trim()) return attLog
    const q = attSearch.toLowerCase()
    return attLog.filter((a) =>
      `${a.member_name} ${a.member_role} ${a.notes || ''}`.toLowerCase().includes(q)
    )
  }, [attLog, attSearch])

  // Stats
  const stats = useMemo(() => {
    const total = members.length
    const active = members.filter((m) => m.is_active).length
    const withQr = members.filter((m) => m.qr_token && m.is_active).length
    const attCount = attLog.length
    return { total, active, withQr, attCount }
  }, [members, attLog])

  return (
    <div className="dashboard-layout">
      {/* Demo Mode Notice Top Banner */}
      {useDemo && (
        <div className="demo-mode-top-banner">
          <div className="demo-banner-content wrap">
            <span className="demo-banner-badge">
              <IconSparkles size={14} /> DEMO MODE
            </span>
            <span className="demo-banner-text">
              Exploring with interactive in-memory sample members & attendance.
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

      {/* Navbar */}
      <Navbar
        role="admin"
        onOpenScanner={() => setShowScanner(true)}
        activeTab={tab}
        setActiveTab={setTab}
      />

      <main className="wrap main-content">
        {/* KPI Stats Bar */}
        <section aria-label="Key Performance Indicators" className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrap bg-blue-subtle text-primary">
              <IconUsers size={22} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Members</div>
            </div>
            <div className="stat-pill text-success">{stats.active} Active</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap bg-purple-subtle text-accent">
              <IconIdCard size={22} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.withQr}</div>
              <div className="stat-label">Active ID Passes</div>
            </div>
            <div className="stat-pill">
              {stats.total > 0 ? `${Math.round((stats.withQr / stats.total) * 100)}%` : '0%'}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap bg-emerald-subtle text-success">
              <IconCalendar size={22} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.attCount}</div>
              <div className="stat-label">Check-Ins (30d)</div>
            </div>
            <button
              type="button"
              className="stat-action-btn"
              onClick={() => {
                setTab('attendance')
                loadAttendance()
              }}
            >
              View Log ↗
            </button>
          </div>
        </section>

        {/* Hidden file input for QR upload */}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        {/* TAB 1: MEMBERS DIRECTORY */}
        {tab === 'members' && (
          <section aria-label="Members Directory">
            {/* Action Bar */}
            <div className="controls-panel">
              <div className="controls-top">
                <div className="search-input-wrap flex-1">
                  <IconSearch size={18} className="search-icon" />
                  <input
                    type="search"
                    className="input-field search-input"
                    placeholder="Search by name, role, department or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setSearch('')}
                    >
                      <IconX size={14} />
                    </button>
                  )}
                </div>

                <div className="action-buttons-group">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                  >
                    <IconUserPlus size={16} />
                    <span>Add Member</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleExportMembersCSV}
                    title="Export filtered members to CSV"
                  >
                    <IconFileSpreadsheet size={16} />
                    <span className="hide-on-mobile">Export CSV</span>
                  </button>

                  <button
                    type="button"
                    className="btn-icon"
                    onClick={loadMembers}
                    title="Reload members list"
                  >
                    <IconRefresh size={16} className={loading ? 'spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Filter Pills row */}
              <div className="controls-filters">
                <div className="filter-item">
                  <span className="filter-label">Status:</span>
                  <select
                    className="input-field filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>

                <div className="filter-item">
                  <span className="filter-label">QR Badge:</span>
                  <select
                    className="input-field filter-select"
                    value={qrFilter}
                    onChange={(e) => setQrFilter(e.target.value)}
                  >
                    <option value="all">All QR</option>
                    <option value="assigned">Assigned Passes</option>
                    <option value="missing">Missing QR</option>
                  </select>
                </div>

                {allDepartments.length > 0 && (
                  <div className="filter-item">
                    <span className="filter-label">Team:</span>
                    <select
                      className="input-field filter-select"
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                    >
                      <option value="all">All Teams</option>
                      {allDepartments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="filter-item">
                  <span className="filter-label">Sort:</span>
                  <select
                    className="input-field filter-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">Recently Added</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="dept">Team</option>
                  </select>
                </div>

                {/* View Mode Toggle */}
                <div className="view-mode-toggle">
                  <button
                    type="button"
                    className={`btn-icon-sm ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="Table View"
                  >
                    <IconLayoutList size={16} />
                  </button>
                  <button
                    type="button"
                    className={`btn-icon-sm ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid Card View"
                  >
                    <IconLayoutGrid size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Results count */}
            <div className="results-meta-bar">
              <span className="text-sm text-muted">
                Showing <strong>{filteredMembers.length}</strong> of{' '}
                <strong>{members.length}</strong> members
              </span>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="card loading-card">
                <IconRefresh size={28} className="spin text-primary mb-2" />
                <p className="text-muted">Loading members directory…</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredMembers.length === 0 && (
              <div className="empty-state-panel">
                <IconUsers size={48} className="text-muted opacity-40 mb-3" />
                <h3>No members found</h3>
                <p className="text-muted text-sm max-w-sm mb-4">
                  {search || statusFilter !== 'all' || qrFilter !== 'all'
                    ? 'Try adjusting your search criteria or clearing filters.'
                    : 'Get started by adding your first club member.'}
                </p>
                {search || statusFilter !== 'all' || qrFilter !== 'all' ? (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setSearch('')
                      setStatusFilter('all')
                      setQrFilter('all')
                      setDeptFilter('all')
                    }}
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                  >
                    <IconUserPlus size={16} />
                    <span>Add First Member</span>
                  </button>
                )}
              </div>
            )}

            {/* VIEW MODE 1: DATA TABLE */}
            {!loading && filteredMembers.length > 0 && viewMode === 'table' && (
              <div className="table-responsive-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Role & Team</th>
                      <th>Digital Pass</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((m) => {
                      const initials = m.full_name
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()

                      return (
                        <tr key={m.id} className={!m.is_active ? 'row-inactive' : ''}>
                          <td>
                            <div className="member-avatar-cell">
                              <div className="avatar-circle">{initials}</div>
                              <div className="avatar-meta">
                                <span className="member-name-text">{m.full_name}</span>
                                {m.email && <span className="member-email-text">{m.email}</span>}
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="role-cell">
                              <span className="role-badge">{m.role || 'Member'}</span>
                              {m.department && (
                                <span className="dept-tag">{m.department}</span>
                              )}
                            </div>
                          </td>

                          <td>
                            {m.qr_token ? (
                              <button
                                type="button"
                                className="qr-status-pill assigned"
                                onClick={() => setIdCardMember(m)}
                                title="Click to view ID card"
                              >
                                <IconCheckCircle size={14} className="text-success" />
                                <span>Badge Ready</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="qr-status-pill unassigned"
                                onClick={() => handleAssignQr(m)}
                                title="Click to generate QR token"
                              >
                                <IconAlertCircle size={14} className="text-muted" />
                                <span>No QR Pass</span>
                              </button>
                            )}
                          </td>

                          <td>
                            <button
                              type="button"
                              className={`status-chip ${m.is_active ? 'active' : 'inactive'}`}
                              onClick={() => handleToggleActive(m)}
                              title="Click to toggle member status"
                            >
                              <span className="status-dot"></span>
                              <span>{m.is_active ? 'Active' : 'Inactive'}</span>
                            </button>
                          </td>

                          <td>
                            <div className="actions-cluster">
                              {/* ID Card */}
                              {m.qr_token && (
                                <button
                                  type="button"
                                  className="btn-action-icon accent"
                                  onClick={() => setIdCardMember(m)}
                                  title="View & Download ID Card"
                                >
                                  <IconIdCard size={15} />
                                </button>
                              )}

                              {/* Assign / Reassign */}
                              <button
                                type="button"
                                className="btn-action-icon"
                                onClick={() => handleAssignQr(m)}
                                title={m.qr_token ? 'Re-assign QR Token' : 'Generate QR Token'}
                              >
                                <IconQrCode size={15} />
                              </button>

                              {/* Upload QR image */}
                              <button
                                type="button"
                                className="btn-action-icon"
                                onClick={() => triggerPickUpload(m)}
                                title="Upload physical QR scan image"
                              >
                                <IconUpload size={15} />
                              </button>

                              {/* Download QR */}
                              {m.qr_token && (
                                <button
                                  type="button"
                                  className="btn-action-icon"
                                  onClick={() => downloadQrCodeImage(m, notify)}
                                  title="Download Raw QR Image"
                                >
                                  <IconDownload size={15} />
                                </button>
                              )}

                              {/* Achievements / Contributions */}
                              <button
                                type="button"
                                className="btn-action-icon"
                                onClick={() => setSelectedContributions(m)}
                                title="Contributions & Achievements"
                              >
                                <IconAward size={15} />
                              </button>

                              {/* Link Auth User */}
                              <button
                                type="button"
                                className="btn-action-icon"
                                onClick={() => setLinkingMember(m)}
                                title="Link Member User Login"
                              >
                                <IconLink size={15} />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                className="btn-action-icon"
                                onClick={() => setEditingMember(m)}
                                title="Edit details"
                              >
                                <IconEdit size={15} />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                className="btn-action-icon text-danger"
                                onClick={() => setMemberToDelete(m)}
                                title="Delete Member"
                              >
                                <IconTrash size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW MODE 2: GRID CARDS */}
            {!loading && filteredMembers.length > 0 && viewMode === 'grid' && (
              <div className="members-card-grid">
                {filteredMembers.map((m) => {
                  const initials = m.full_name
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()

                  return (
                    <div
                      key={m.id}
                      className={`member-grid-card ${!m.is_active ? 'card-inactive' : ''}`}
                    >
                      <div className="card-top">
                        <div className="avatar-circle avatar-large">{initials}</div>
                        <div className="card-status-cluster">
                          <button
                            type="button"
                            className={`status-chip ${m.is_active ? 'active' : 'inactive'}`}
                            onClick={() => handleToggleActive(m)}
                          >
                            <span className="status-dot"></span>
                            <span>{m.is_active ? 'Active' : 'Inactive'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid-card-body">
                        <h4 className="member-grid-name">{m.full_name}</h4>
                        <div className="member-grid-role">
                          <span className="role-badge">{m.role || 'Member'}</span>
                          {m.department && <span className="dept-tag">{m.department}</span>}
                        </div>
                        {m.email && <div className="member-grid-email">{m.email}</div>}
                      </div>

                      <div className="grid-card-badge-status">
                        {m.qr_token ? (
                          <div className="badge-preview-row">
                            <span className="text-xs text-success flex-center gap-1 font-semibold">
                              <IconCheckCircle size={13} /> Digital ID Ready
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-accent"
                              onClick={() => setIdCardMember(m)}
                            >
                              <IconIdCard size={13} /> View ID
                            </button>
                          </div>
                        ) : (
                          <div className="badge-preview-row">
                            <span className="text-xs text-muted flex-center gap-1">
                              <IconAlertCircle size={13} /> No QR Assigned
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => handleAssignQr(m)}
                            >
                              Assign QR
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid-card-actions">
                        <button
                          type="button"
                          className="btn-icon-sm"
                          onClick={() => setSelectedContributions(m)}
                          title="Contributions"
                        >
                          <IconAward size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-sm"
                          onClick={() => triggerPickUpload(m)}
                          title="Upload QR"
                        >
                          <IconUpload size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-sm"
                          onClick={() => setLinkingMember(m)}
                          title="Link User Login"
                        >
                          <IconLink size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-sm"
                          onClick={() => setEditingMember(m)}
                          title="Edit"
                        >
                          <IconEdit size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-sm text-danger"
                          onClick={() => setMemberToDelete(m)}
                          title="Delete"
                        >
                          <IconTrash size={15} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: ATTENDANCE TRACKER */}
        {tab === 'attendance' && (
          <section aria-label="Attendance Log">
            <div className="controls-panel">
              <div className="controls-top">
                <div className="search-input-wrap flex-1">
                  <IconSearch size={18} className="search-icon" />
                  <input
                    type="search"
                    className="input-field search-input"
                    placeholder="Search attendance by member name or role…"
                    value={attSearch}
                    onChange={(e) => setAttSearch(e.target.value)}
                  />
                  {attSearch && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setAttSearch('')}
                    >
                      <IconX size={14} />
                    </button>
                  )}
                </div>

                <div className="action-buttons-group">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowScanner(true)}
                  >
                    <IconCamera size={16} />
                    <span>Open Scanner</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleExportAttendanceCSV}
                  >
                    <IconFileSpreadsheet size={16} />
                    <span className="hide-on-mobile">Export CSV</span>
                  </button>

                  <button
                    type="button"
                    className="btn-icon"
                    onClick={loadAttendance}
                    title="Refresh attendance records"
                  >
                    <IconRefresh size={16} className={attLoading ? 'spin' : ''} />
                  </button>
                </div>
              </div>
            </div>

            <div className="results-meta-bar">
              <span className="text-sm text-muted">
                Showing <strong>{filteredAttendance.length}</strong> recorded check-ins
                over the last 30 days
              </span>
            </div>

            {attLoading && (
              <div className="card loading-card">
                <IconRefresh size={28} className="spin text-primary mb-2" />
                <p className="text-muted">Loading attendance records…</p>
              </div>
            )}

            {!attLoading && filteredAttendance.length === 0 && (
              <div className="empty-state-panel">
                <IconCalendar size={48} className="text-muted opacity-40 mb-3" />
                <h3>No attendance check-ins yet</h3>
                <p className="text-muted text-sm max-w-sm mb-4">
                  Scan a member's QR code at an event or meeting using the scanner to start
                  logging attendance records.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowScanner(true)}
                >
                  <IconCamera size={16} />
                  <span>Launch QR Scanner</span>
                </button>
              </div>
            )}

            {!attLoading && filteredAttendance.length > 0 && (
              <div className="table-responsive-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Member Name</th>
                      <th>Role</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.map((a, index) => {
                      const d = new Date(a.scanned_at)
                      return (
                        <tr key={a.id || index}>
                          <td className="text-muted font-mono text-sm">
                            {filteredAttendance.length - index}
                          </td>
                          <td>
                            <strong>{a.member_name}</strong>
                          </td>
                          <td>
                            <span className="role-badge">{a.member_role || 'Member'}</span>
                          </td>
                          <td>
                            <span className="flex-center gap-1 text-sm">
                              <IconCalendar size={13} className="text-muted" />
                              {d.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </td>
                          <td>
                            <span className="flex-center gap-1 text-sm font-mono">
                              <IconClock size={13} className="text-muted" />
                              {d.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-success text-xs">
                              <IconCheckCircle size={12} /> Verified Pass
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

      {/* MODAL 1: Add or Edit Member */}
      <MemberModal
        isOpen={showAddModal || !!editingMember}
        member={editingMember}
        onClose={() => {
          setShowAddModal(false)
          setEditingMember(null)
        }}
        onSubmit={handleSaveMember}
      />

      {/* MODAL 2: ID Card View & Print */}
      {idCardMember && (
        <div
          className="modal-backdrop"
          onClick={() => setIdCardMember(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-icon-badge">
                  <IconIdCard size={18} />
                </span>
                <div>
                  <h3 className="modal-title">Member QR Code</h3>
                  <p className="modal-subtitle">{idCardMember.full_name}</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIdCardMember(null)}
                aria-label="Close"
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="modal-body">
              <IdCard member={idCardMember} notify={notify} />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Member Contributions */}
      {selectedContributions && (
        <ContributionsModal
          member={selectedContributions}
          onClose={() => setSelectedContributions(null)}
          notify={notify}
        />
      )}

      {/* MODAL 4: Link Member User Login */}
      {linkingMember && (
        <LinkUserModal
          member={linkingMember}
          isOpen={!!linkingMember}
          onClose={() => setLinkingMember(null)}
          notify={notify}
        />
      )}

      {/* MODAL 5: QR Scanner */}
      {showScanner && (
        <QrScanner
          onClose={() => setShowScanner(false)}
          onScan={(data) => {
            if (useDemo && data?.member_name) {
              setAttLog((prev) => [
                {
                  id: `att-${Date.now()}`,
                  member_name: data.member_name,
                  member_role: data.member_role || 'Member',
                  scanned_at: new Date().toISOString(),
                  notes: 'Live Camera Check-In'
                },
                ...prev
              ])
            } else if (tab === 'attendance') {
              loadAttendance()
            }
          }}
          notify={notify}
        />
      )}

      {/* MODAL 6: Delete Confirmation */}
      {memberToDelete && (
        <div
          className="modal-backdrop"
          onClick={() => setMemberToDelete(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-icon-badge bg-red-subtle text-danger">
                  <IconTrash size={18} />
                </span>
                <h3 className="modal-title">Delete Member</h3>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setMemberToDelete(null)}
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-sm">
                Are you sure you want to permanently delete{' '}
                <strong>{memberToDelete.full_name}</strong>?
              </p>
              <p className="text-xs text-danger mt-2">
                This will delete their profile, ID pass, attendance history, and
                contributions permanently.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setMemberToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDeleteMember}
              >
                <IconTrash size={16} />
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
