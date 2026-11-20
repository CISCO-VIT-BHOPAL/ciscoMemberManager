import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  IconX,
  IconAward,
  IconPlus,
  IconTrash,
  IconExternalLink,
  IconClock
} from './Icons'

export default function ContributionsModal({ member, onClose, notify }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', link: '' })

  const loadContributions = useCallback(async () => {
    if (!member) return
    setLoading(true)
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })

    if (error) {
      notify?.error?.(error.message)
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }, [member, notify])

  useEffect(() => {
    loadContributions()
  }, [loadContributions])

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return

    if (form.link && !/^https?:\/\//i.test(form.link)) {
      notify?.error?.('Link must start with http:// or https://')
      return
    }

    setIsSubmitting(true)
    const { error } = await supabase.from('contributions').insert({
      member_id: member.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      link: form.link.trim() || null
    })

    setIsSubmitting(false)
    if (error) {
      notify?.error?.(error.message)
    } else {
      notify?.success?.('Contribution recorded')
      setForm({ title: '', description: '', link: '' })
      loadContributions()
    }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete contribution "${title}"?`)) return
    const { error } = await supabase.from('contributions').delete().eq('id', id)
    if (error) {
      notify?.error?.(error.message)
    } else {
      notify?.success?.('Contribution deleted')
      loadContributions()
    }
  }

  if (!member) return null

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contrib-modal-title"
    >
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon-badge">
              <IconAward size={18} />
            </span>
            <div>
              <h3 id="contrib-modal-title" className="modal-title">
                Contributions & Achievements
              </h3>
              <p className="modal-subtitle">
                {member.full_name} · <span className="text-muted">{member.role}</span>
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

        <div className="modal-body">
          {/* New contribution form */}
          <div className="card-subtle mb-4">
            <h4 className="section-title-sm">Add New Contribution</h4>
            <form onSubmit={handleAdd} className="form-grid">
              <div className="form-group">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Title / Milestone (e.g. Led Cisco PyCon Workshop)"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-2">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Description (optional details)"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="form-group flex-1">
                  <input
                    type="url"
                    className="input-field"
                    placeholder="Link (https://…)"
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || !form.title.trim()}
                >
                  <IconPlus size={16} />
                  <span>{isSubmitting ? 'Adding…' : 'Add'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of contributions */}
          <div className="contributions-list">
            <div className="list-header-row">
              <span className="list-count-badge">
                {items.length} {items.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>

            {loading && <div className="loading-state">Loading achievements…</div>}

            {!loading && items.length === 0 && (
              <div className="empty-state-card">
                <IconAward size={36} className="text-muted opacity-40 mb-2" />
                <p className="text-muted font-medium">No contributions recorded yet</p>
                <p className="text-muted text-sm">
                  Add projects, hackathons, presentations, or roles this member has accomplished.
                </p>
              </div>
            )}

            {!loading &&
              items.map((c) => {
                const dateStr = new Date(c.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
                return (
                  <div key={c.id} className="contribution-card">
                    <div className="contrib-main">
                      <div className="contrib-title-row">
                        <strong className="contrib-title">{c.title}</strong>
                        <span className="contrib-date">
                          <IconClock size={12} /> {dateStr}
                        </span>
                      </div>
                      {c.description && (
                        <p className="contrib-desc">{c.description}</p>
                      )}
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
                    <button
                      type="button"
                      className="btn-icon-danger"
                      onClick={() => handleDelete(c.id, c.title)}
                      title="Delete contribution"
                      aria-label={`Delete ${c.title}`}
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                )
              })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
