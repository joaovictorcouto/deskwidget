import React from 'react';

/**
 * CustomConfirm - Um modal de confirmação estilizado seguindo a identidade visual do app.
 * Pode ser injetado em qualquer tela e renderizado condicionalmente.
 */
export default function CustomConfirm({ isOpen, message, onConfirm, onCancel, title = 'CONFIRMAÇÃO', isAlert = false }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px',
      userSelect: 'none'
    }}>
      <div className="standalone-window" style={{
        width: '320px',
        height: 'auto',
        minHeight: '160px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-main)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'confirmFadeIn 0.2s ease'
      }}>
        {/* Header */}
        <div style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          borderBottom: '1px solid var(--border)',
          fontSize: '0.78rem',
          fontWeight: 'bold',
          color: 'var(--text-muted)'
        }}>
          <img src="./logo-icon.png" alt="" style={{ height: '15px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
          <span>{title}</span>
        </div>

        {/* Content / Message */}
        <div style={{
          flex: 1,
          padding: '16px 20px',
          fontSize: '0.88rem',
          lineHeight: '1.4',
          color: 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          {message}
        </div>

        {/* Action Buttons */}
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0, 0, 0, 0.1)'
        }}>
          {!isAlert && onCancel && (
            <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={onCancel}>
              Cancelar
            </button>
          )}
          <button className="btn-primary" style={{ padding: '8px 16px', width: 'auto', minWidth: '70px', fontSize: '0.8rem' }} onClick={onConfirm}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
