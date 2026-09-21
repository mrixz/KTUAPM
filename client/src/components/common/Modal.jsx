import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '700px'
}) => {
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`).current;
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);

  // Store the element that opened the modal so we can restore focus on close
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      // Focus the dialog itself on open
      requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
    } else if (triggerRef.current) {
      // Restore focus to the element that triggered the modal
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  // Escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap: keep Tab/Shift+Tab inside the dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(5, 8, 16, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.75rem',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={onClose}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth,
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          outline: 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-tertiary)',
            gap: '0.75rem'
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h3
              id={titleId}
              style={{ fontSize: '1.1rem', margin: 0, lineHeight: 1.25, wordBreak: 'break-word' }}
            >
              {title}
            </h3>
            {subtitle && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '0.2rem 0 0', wordBreak: 'break-word' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close modal"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '38px',
              minHeight: '38px',
              flexShrink: 0,
              transition: 'background 0.2s ease'
            }}
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>
        <div style={{ padding: 'clamp(1rem, 3.5vw, 1.5rem)', overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
