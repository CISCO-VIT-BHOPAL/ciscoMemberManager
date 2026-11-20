import React, { createContext, useContext, useState, useCallback } from 'react'
import { IconCheckCircle, IconAlertCircle, IconX } from './Icons'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6)
    setToasts((prev) => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const notify = {
    success: (msg, dur) => toast(msg, 'success', dur),
    error: (msg, dur) => toast(msg, 'error', dur),
    info: (msg, dur) => toast(msg, 'info', dur),
    warn: (msg, dur) => toast(msg, 'warning', dur),
  }

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <aside aria-label="Notifications" className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`toast-item toast-${t.type}`}>
            <span className="toast-icon">
              {t.type === 'success' && <IconCheckCircle size={18} />}
              {t.type === 'error' && <IconAlertCircle size={18} />}
              {(t.type === 'info' || t.type === 'warning') && <IconAlertCircle size={18} />}
            </span>
            <span className="toast-msg">{t.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Close notification"
              onClick={() => removeToast(t.id)}
            >
              <IconX size={14} />
            </button>
          </div>
        ))}
      </aside>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      success: (msg) => console.log('[Success]', msg),
      error: (msg) => console.error('[Error]', msg),
      info: (msg) => console.log('[Info]', msg),
      warn: (msg) => console.warn('[Warn]', msg),
    }
  }
  return ctx
}
