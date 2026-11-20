import React, { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { supabase } from '../lib/supabase'
import {
  IconX,
  IconCamera,
  IconCheck,
  IconAlertCircle,
  IconClock,
  IconVolume2,
  IconVolumeX
} from './Icons'

// Web Audio API beep synthesizer
function playBeep(success = true) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    if (success) {
      // Pleasant two-tone chime for success
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08) // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } else {
      // Low error buzz
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, ctx.currentTime)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.25)
    }
  } catch {
    /* Silent if audio context is blocked */
  }
}

function tokenFromPayload(payload) {
  if (!payload) return null
  try {
    const url = new URL(payload)
    const m = url.pathname.match(/\/m\/([A-Za-z0-9_-]{16,})/i)
    if (m) return m[1]
  } catch {
    /* Not a full URL, check raw string */
  }
  const clean = payload.trim()
  if (/^[A-Za-z0-9_-]{16,}$/.test(clean)) return clean
  return null
}

export default function QrScanner({ onClose, onScan, notify }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const cooldownRef = useRef(false)
  const rafRef = useRef(null)

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [log, setLog] = useState([])
  const [cameraError, setCameraError] = useState('')
  const [manualToken, setManualToken] = useState('')
  const [activeMode, setActiveMode] = useState('camera') // 'camera' | 'manual'
  const [availableDevices, setAvailableDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [lastCheckIn, setLastCheckIn] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  // Enumerate camera devices
  useEffect(() => {
    async function getDevices() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoInputs = devices.filter((d) => d.kind === 'videoinput')
        setAvailableDevices(videoInputs)
        if (videoInputs.length > 0 && !selectedDeviceId) {
          // Prefer back camera if found
          const backCam = videoInputs.find((d) =>
            /back|rear|environment/i.test(d.label)
          )
          setSelectedDeviceId(backCam ? backCam.deviceId : videoInputs[0].deviceId)
        }
      } catch (err) {
        console.warn('Could not list media devices:', err)
      }
    }
    getDevices()
  }, [selectedDeviceId])

  // Start camera with selected device
  useEffect(() => {
    if (activeMode !== 'camera') {
      stopCamera()
      return
    }

    let isCancelled = false
    setCameraError('')

    async function initCamera() {
      stopCamera()
      try {
        const constraints = {
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          videoRef.current.play().catch(() => {})
        }
      } catch (err) {
        if (!isCancelled) {
          setCameraError(
            'Camera access denied or unavailable. You can use manual token entry below.'
          )
          setActiveMode('manual')
        }
      }
    }

    initCamera()

    return () => {
      isCancelled = true
      stopCamera()
    }
  }, [activeMode, selectedDeviceId, stopCamera])

  // Scan loop
  useEffect(() => {
    if (activeMode !== 'camera') return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { willReadFrequently: true })
    const video = videoRef.current
    if (!ctx || !video) return

    function scanFrame() {
      if (
        video.readyState >= video.HAVE_ENOUGH_DATA &&
        !cooldownRef.current &&
        !isProcessing
      ) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const qr = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'dontInvert'
        })

        if (qr && qr.data) {
          const token = tokenFromPayload(qr.data)
          if (token) {
            cooldownRef.current = true
            handleTokenVerification(token)
            setTimeout(() => {
              cooldownRef.current = false
            }, 2500)
          }
        }
      }
      rafRef.current = requestAnimationFrame(scanFrame)
    }

    rafRef.current = requestAnimationFrame(scanFrame)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [activeMode, isProcessing])

  // ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleTokenVerification = async (token) => {
    setIsProcessing(true)
    try {
      const { data, error: err } = await supabase.rpc('record_attendance', {
        p_token: token
      })

      if (err) throw new Error(err.message)

      if (soundEnabled) playBeep(true)

      const entry = {
        name: data.member_name,
        role: data.member_role,
        time: new Date(data.scanned_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        success: true
      }

      setLastCheckIn(entry)
      setLog((prev) => [entry, ...prev.slice(0, 7)])
      onScan?.(data)
      notify?.success?.(`Checked in: ${data.member_name}`)
    } catch (err) {
      if (soundEnabled) playBeep(false)
      const errorEntry = {
        name: err.message || 'Invalid or inactive ID card',
        role: 'Unknown',
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        success: false
      }
      setLastCheckIn(errorEntry)
      setLog((prev) => [errorEntry, ...prev.slice(0, 7)])
      notify?.error?.(err.message || 'Check-in failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    const clean = tokenFromPayload(manualToken) || manualToken.trim()
    if (!clean) return
    handleTokenVerification(clean)
    setManualToken('')
  }

  const handleClose = () => {
    stopCamera()
    onClose?.()
  }

  return (
    <div
      className="modal-backdrop scanner-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-modal-title"
    >
      <div className="modal-card scanner-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon-badge scanner-badge-pulse">
              <IconCamera size={18} />
            </span>
            <div>
              <h3 id="scanner-modal-title" className="modal-title">
                Live Attendance Check-In
              </h3>
              <p className="modal-subtitle">Fast QR scanner for member ID cards</p>
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="btn-icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute scanner chime' : 'Enable scanner chime'}
            >
              {soundEnabled ? <IconVolume2 size={18} /> : <IconVolumeX size={18} />}
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={handleClose}
              aria-label="Close scanner"
            >
              <IconX size={18} />
            </button>
          </div>
        </div>

        {/* Mode switcher tabs */}
        <div className="scanner-mode-tabs">
          <button
            type="button"
            className={`scanner-tab-btn ${activeMode === 'camera' ? 'active' : ''}`}
            onClick={() => setActiveMode('camera')}
          >
            <IconCamera size={15} />
            <span>Camera Scanner</span>
          </button>
          <button
            type="button"
            className={`scanner-tab-btn ${activeMode === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveMode('manual')}
          >
            <span>Manual / Gun Scanner</span>
          </button>
        </div>

        <div className="modal-body scanner-body">
          {activeMode === 'camera' && (
            <div className="viewfinder-container">
              {cameraError ? (
                <div className="camera-error-box">
                  <IconAlertCircle size={36} className="text-danger mb-2" />
                  <p className="text-danger font-medium mb-1">Camera Not Available</p>
                  <p className="text-muted text-sm mb-3">{cameraError}</p>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setActiveMode('manual')}
                  >
                    Switch to Manual Entry
                  </button>
                </div>
              ) : (
                <div className="viewfinder-video-wrap">
                  <video ref={videoRef} className="viewfinder-video" muted playsInline />

                  {/* Futuristic overlay targeting reticle */}
                  <div className="viewfinder-reticle">
                    <div className="reticle-corner top-left"></div>
                    <div className="reticle-corner top-right"></div>
                    <div className="reticle-corner bottom-left"></div>
                    <div className="reticle-corner bottom-right"></div>
                    <div className="reticle-laser"></div>
                  </div>

                  <div className="viewfinder-hint">
                    Center the ID card QR code in frame
                  </div>

                  {/* Hidden processing canvas */}
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
              )}

              {/* Camera device switcher */}
              {availableDevices.length > 1 && (
                <div className="camera-device-select mt-2">
                  <select
                    className="input-field select-sm"
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                  >
                    {availableDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {activeMode === 'manual' && (
            <div className="manual-entry-box">
              <form onSubmit={handleManualSubmit} className="form-grid">
                <div className="form-group">
                  <label htmlFor="token-manual-input">
                    Enter Member Token or Scan with Barcode Gun
                  </label>
                  <div className="input-group">
                    <input
                      id="token-manual-input"
                      type="text"
                      className="input-field font-mono"
                      placeholder="Paste 32-char token or /m/<token> URL"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={!manualToken.trim() || isProcessing}
                    >
                      <IconCheck size={16} />
                      <span>Check In</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Real-time check-in banner */}
          {lastCheckIn && (
            <div
              className={`checkin-status-banner ${lastCheckIn.success ? 'success' : 'error'}`}
            >
              <div className="checkin-banner-icon">
                {lastCheckIn.success ? (
                  <IconCheck size={20} />
                ) : (
                  <IconAlertCircle size={20} />
                )}
              </div>
              <div className="checkin-banner-info">
                <div className="checkin-name">{lastCheckIn.name}</div>
                {lastCheckIn.role && (
                  <div className="checkin-role">{lastCheckIn.role}</div>
                )}
              </div>
              <div className="checkin-time">{lastCheckIn.time}</div>
            </div>
          )}

          {/* Recent Scans Session Log */}
          {log.length > 0 && (
            <div className="scanner-history-section">
              <div className="scanner-history-title">Recent Session Check-Ins</div>
              <div className="scanner-log-list">
                {log.map((item, index) => (
                  <div
                    key={index}
                    className={`scanner-log-item ${item.success ? 'log-success' : 'log-failed'}`}
                  >
                    <span className="log-indicator"></span>
                    <div className="log-info">
                      <span className="log-name">{item.name}</span>
                      {item.role && item.role !== 'Unknown' && (
                        <span className="log-role"> · {item.role}</span>
                      )}
                    </div>
                    <span className="log-time">
                      <IconClock size={11} /> {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={handleClose}>
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  )
}
