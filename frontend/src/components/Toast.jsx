import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  const bgColor = isSuccess ? '#E3F2E7' : isError ? '#FEECEB' : '#FAF4EB';
  const textColor = isSuccess ? '#1F6F43' : isError ? '#B91C1C' : '#2C221E';
  const borderColor = isSuccess ? '#C8E2D1' : isError ? '#FECACA' : '#E5DBC5';
  const icon = isSuccess ? (
    <CheckCircle2 size={19} color="#1F6F43" />
  ) : isError ? (
    <AlertCircle size={19} color="#B91C1C" />
  ) : (
    <Info size={19} color="#C44824" />
  );

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 99999,
        maxWidth: '400px',
        minWidth: '290px',
        backgroundColor: bgColor,
        color: textColor,
        border: `1.5px solid ${borderColor}`,
        borderRadius: '14px',
        padding: '0.85rem 1rem',
        boxShadow: '0 12px 30px -5px rgba(44, 34, 30, 0.18), 3px 5px 0px #DDD0B8',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        animation: 'toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.88rem', color: textColor }}>
            {toast.title}
          </p>
        )}
        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: toast.title ? 500 : 700, lineHeight: 1.4, color: textColor }}>
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: textColor,
          opacity: 0.75,
          borderRadius: '4px',
        }}
        aria-label="Close notification"
      >
        <X size={15} />
      </button>
    </div>
  );
}
