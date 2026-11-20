import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import {
  IconDownload,
  IconPrinter,
  IconCopy,
  IconCheck,
  IconShield,
  IconExternalLink,
  IconQrCode
} from './Icons'

const profileUrl = (token) => window.location.origin + '/m/' + token

export default function IdCard({ member, notify }) {
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    if (!member?.qr_token) return
    QRCode.toDataURL(profileUrl(member.qr_token), {
      width: 480,
      margin: 2,
      color: { dark: '#0a101f', light: '#ffffff' }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err))
  }, [member?.qr_token])

  const handleDownloadQr = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = (member.full_name || 'member').replace(/\s+/g, '_') + '_QR.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    notify?.success?.('Downloaded QR for ' + member.full_name)
  }

  const handleCopyLink = () => {
    if (!member?.qr_token) return
    const url = profileUrl(member.qr_token)
    navigator.clipboard.writeText(url)
    setCopied(true)
    notify?.success?.('Verification link copied to clipboard')
    setTimeout(() => setCopied(false), 2500)
  }

  const handlePrint = () => {
    window.print()
  }

  if (!member?.qr_token) {
    return (
      <div className="id-card-empty-prompt">
        <IconQrCode size={48} className="text-muted opacity-40 mb-3" />
        <h4>No QR Token Assigned</h4>
        <p className="text-muted text-sm max-w-sm text-center mb-3">
          Assign or generate a QR code for this member to view their pass.
        </p>
      </div>
    )
  }

  const verifyUrl = profileUrl(member.qr_token)

  return (
    <div className="qr-details-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Main Container: QR Code + Details */}
      <div
        className="qr-card-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 260px) 1fr',
          gap: '24px',
          background: 'var(--bg-card, #10192e)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          borderRadius: '16px',
          padding: '24px',
          alignItems: 'center'
        }}
      >
        {/* Left: QR Code Box */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            textAlign: 'center'
          }}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={'QR Code for ' + member.full_name}
              style={{
                width: '100%',
                maxWidth: '220px',
                height: 'auto',
                aspectRatio: '1/1',
                display: 'block'
              }}
            />
          ) : (
            <div
              style={{
                width: '200px',
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b'
              }}
            >
              Generating QR…
            </div>
          )}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '1px',
              color: '#0f172a',
              marginTop: '8px'
            }}
          >
            SCAN TO VERIFY
          </span>
        </div>

        {/* Right: Key Member Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-main, #ffffff)' }}>
                {member.full_name}
              </h2>
              <span
                className={'badge ' + (member.is_active ? 'badge-success' : 'badge-danger')}
                style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '20px' }}
              >
                {member.is_active ? '● Active' : '● Inactive'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              <span className="role-badge" style={{ fontSize: '13px' }}>
                {member.role || 'Member'}
              </span>
              {member.department && (
                <span className="dept-tag" style={{ fontSize: '13px' }}>
                  {member.department}
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            {member.email && (
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                  Email
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-main, #ffffff)', wordBreak: 'break-all' }}>
                  {member.email}
                </span>
              </div>
            )}

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                Joined
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-main, #ffffff)' }}>
                {new Date(member.created_at || Date.now()).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            {member.qr_token && (
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                  Token ID
                </span>
                <code
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: 'var(--color-primary, #38bdf8)'
                  }}
                >
                  {member.qr_token.slice(0, 16)}…
                </code>
              </div>
            )}
          </div>

          {/* Verification Link Row */}
          {member.qr_token && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '8px',
                padding: '8px 12px'
              }}
            >
              <IconShield size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Public Verification Link</div>
                <div
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#38bdf8',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {verifyUrl}
                </div>
              </div>
              <a
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-icon-sm"
                title="Open public verification page"
                style={{ flexShrink: 0 }}
              >
                <IconExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div
        className="id-card-actions"
        style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          paddingTop: '4px'
        }}
      >
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleDownloadQr}
          disabled={!qrDataUrl}
        >
          <IconDownload size={16} />
          <span>Download QR Code</span>
        </button>

        <button
          type="button"
          className="btn btn-outline"
          onClick={handleCopyLink}
          disabled={!member?.qr_token}
        >
          {copied ? <IconCheck size={16} className="text-success" /> : <IconCopy size={16} />}
          <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={handlePrint}
          disabled={!qrDataUrl}
        >
          <IconPrinter size={16} />
          <span>Print</span>
        </button>
      </div>
    </div>
  )
}
