import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg, dur) => addToast(msg, 'success', dur), [addToast]);
  const error = useCallback((msg, dur) => addToast(msg, 'error', dur), [addToast]);
  const warning = useCallback((msg, dur) => addToast(msg, 'warning', dur), [addToast]);
  const info = useCallback((msg, dur) => addToast(msg, 'info', dur), [addToast]);

  return (
    <NotificationContext.Provider value={{ success, error, warning, info }}>
      {children}

      {/* Polite announcements (success, warning, info) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          left: '1rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxWidth: '420px',
          margin: '0 0 0 auto',
          pointerEvents: 'none'
        }}
      >
        {toasts.filter((t) => t.type !== 'error').map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>

      {/* Assertive announcements (errors only) */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={{
          position: 'fixed',
          bottom: toasts.filter((t) => t.type !== 'error').length > 0 ? '5rem' : '1rem',
          right: '1rem',
          left: '1rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxWidth: '420px',
          margin: '0 0 0 auto',
          pointerEvents: 'none'
        }}
      >
        {toasts.filter((t) => t.type === 'error').map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

const ToastItem = ({ toast, onDismiss }) => {
  let bg = 'rgba(15, 20, 34, 0.96)';
  let border = 'rgba(255, 255, 255, 0.1)';
  let icon = <Info size={18} color="#38bdf8" style={{ flexShrink: 0 }} aria-hidden="true" />;

  if (toast.type === 'success') {
    border = 'rgba(16, 185, 129, 0.4)';
    icon = <CheckCircle2 size={18} color="#34d399" style={{ flexShrink: 0 }} aria-hidden="true" />;
  } else if (toast.type === 'error') {
    border = 'rgba(244, 63, 94, 0.4)';
    icon = <XCircle size={18} color="#fb7185" style={{ flexShrink: 0 }} aria-hidden="true" />;
  } else if (toast.type === 'warning') {
    border = 'rgba(245, 158, 11, 0.4)';
    icon = <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink: 0 }} aria-hidden="true" />;
  }

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: bg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${border}`,
        borderRadius: '12px',
        padding: '0.75rem 1rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        color: '#f8fafc',
        fontSize: '0.86rem',
        animation: 'slideInUp 0.25s ease'
      }}
    >
      {icon}
      <div style={{ flex: 1, wordBreak: 'break-word', minWidth: 0 }}>{toast.message}</div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '28px',
          minHeight: '28px',
          flexShrink: 0
        }}
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
