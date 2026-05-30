import React, { useState, useEffect } from 'react';

function Paywall({ onActivate, onTrial }) {
  const [email, setEmail] = useState('');
  const [hwid, setHwid] = useState('Carregando...');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Novos estados para a verificação em duas etapas (OTP)
  const [step, setStep] = useState('license'); // 'license' ou 'otp'
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => {
    if (window.api?.getHwid) {
      window.api.getHwid()
        .then(setHwid)
        .catch(() => setHwid('Erro ao obter HWID'));
    }
  }, []);

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (window.api?.requestOtpByEmail) {
        // Envia requisição para buscar a licença por e-mail e gerar o código OTP
        const masked = await window.api.requestOtpByEmail(email.trim());
        setMaskedEmail(masked);
        setStep('otp'); // Avança para a etapa de inserção de OTP!
      } else {
        setError('Erro interno de comunicação com o backend.');
      }
    } catch (err) {
      setError(String(err) || 'E-mail não cadastrado ou erro ao conectar.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Por favor, digite o código de confirmação de 6 dígitos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (window.api?.verifyEmailOtpAndActivate) {
        // Valida o OTP e recupera a chave de licença Ed25519 do backend
        const licenseKey = await window.api.verifyEmailOtpAndActivate(email.trim(), otpCode.trim());
        if (licenseKey) {
          // Salva a chave de licença no SQLite local settings do app
          if (window.api.updateSetting) {
            await window.api.updateSetting('license_key', licenseKey);
          }
          setSuccess(true);
          setTimeout(() => {
            onActivate();
          }, 1500);
        }
      } else {
        setError('Erro interno de comunicação com o backend.');
      }
    } catch (err) {
      setError(String(err) || 'Código incorreto ou limite de computadores atingido.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHwid = () => {
    navigator.clipboard.writeText(hwid);
    // Visual feedback para cópia
    const btn = document.getElementById('copy-btn');
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = 'Copiado! ✓';
      btn.style.color = '#5cff85';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.color = 'rgba(255, 255, 255, 0.5)';
      }, 1500);
    }
  };

  return (
    <div className="paywall-container">
      <div className="paywall-card">
        {/* Botão de Fechar sutil */}
        <button type="button" className="btn-close-paywall" onClick={onTrial} title="Usar Versão Gratuita">✕</button>

        {/* Glow de fundo */}
        <div className="card-glow"></div>

        <div className="paywall-content">
          <div className="brand-header">
            <span className="premium-tag">PREMIUM ACCESS</span>
            <h1 className="brand-title">DeskWidget<span>Pro</span></h1>
            <p className="brand-subtitle">Desbloqueie o poder máximo de foco e produtividade na sua área de trabalho.</p>
          </div>

          {success ? (
            <div className="activation-success animate-fade-in">
              <div className="success-icon">✓</div>
              <h2>Ativação Concluída!</h2>
              <p>Bem-vindo ao DeskWidget Pro. Aproveite seus recursos exclusivos.</p>
            </div>
          ) : step === 'license' ? (
            <form onSubmit={handleRequestOtp} className="activation-form">
              <div className="input-group">
                <label htmlFor="license-email">E-mail de Compra</label>
                <input
                  id="license-email"
                  type="email"
                  placeholder="Insira o e-mail cadastrado na compra..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className={error ? 'input-error' : ''}
                />
                {error && <span className="error-message">{error}</span>}
                <a 
                  href="#" 
                  className="buy-license-link"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open("https://deskwidget.com/buy", "_blank");
                  }}
                >
                  Não comprou ainda? Adquira a Versão Pro 🌟
                </a>
              </div>

              <button type="submit" className="btn-activate" disabled={loading}>
                {loading ? (
                  <span className="spinner"></span>
                ) : (
                  'Enviar Código de Acesso'
                )}
              </button>

              <div className="divider">
                <span>OU</span>
              </div>

              <button type="button" className="btn-trial" onClick={onTrial} disabled={loading}>
                Continuar com Versão Gratuita
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirmOtp} className="activation-form animate-fade-in">
              <div className="input-group">
                <label htmlFor="otp-code">Código de Verificação (OTP)</label>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 8px 0' }}>
                  Enviamos um código de 6 dígitos para o e-mail informado:<br/>
                  <strong style={{ color: '#5c85ff' }}>{maskedEmail}</strong>
                </p>
                <input
                  id="otp-code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  className={error ? 'input-error' : ''}
                  style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em' }}
                />
                {error && <span className="error-message">{error}</span>}
              </div>

              <button type="submit" className="btn-activate" disabled={loading}>
                {loading ? (
                  <span className="spinner"></span>
                ) : (
                  'Confirmar Código'
                )}
              </button>

              <div className="divider">
                <span>OU</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn-trial" onClick={() => { setStep('license'); setError(''); }} disabled={loading} style={{ flex: 1 }}>
                  Voltar
                </button>
                <button type="button" className="btn-trial" onClick={handleRequestOtp} disabled={loading} style={{ flex: 1 }}>
                  Reenviar
                </button>
              </div>
            </form>
          )}

          <div className="hwid-footer">
            <span>ID do Dispositivo (HWID):</span>
            <div className="hwid-box">
              <code>{hwid}</code>
              <button id="copy-btn" onClick={handleCopyHwid} title="Copiar HWID">
                Copiar
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .paywall-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100vw;
          height: 100vh;
          background: transparent;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #f1f3f5;
          overflow: hidden;
        }

        .buy-license-link {
          font-size: 0.75rem;
          color: var(--primary, #5c85ff);
          text-decoration: none;
          text-align: right;
          margin-top: 4px;
          font-weight: 600;
          transition: color 0.2s ease;
          display: inline-block;
          width: fit-content;
          align-self: flex-end;
        }

        .buy-license-link:hover {
          color: #8da4ff;
          text-decoration: underline;
        }

        .paywall-card {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 24px;
          background: radial-gradient(circle at top right, rgba(92, 133, 255, 0.12), transparent 45%),
                      radial-gradient(circle at bottom left, rgba(189, 92, 255, 0.12), transparent 45%),
                      #0c0d12;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 36px 32px 32px 32px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
        }

        .card-glow {
          position: absolute;
          top: -50px;
          left: -50px;
          width: 150px;
          height: 150px;
          background: var(--primary, #5c85ff);
          filter: blur(80px);
          opacity: 0.3;
          pointer-events: none;
          z-index: 0;
        }

        .paywall-content {
          position: relative;
          z-index: 1;
        }

        .brand-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .premium-tag {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.15em;
          color: var(--primary, #5c85ff);
          background: rgba(92, 133, 255, 0.1);
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
        }

        .brand-title {
          font-size: 2.2rem;
          font-weight: 800;
          margin: 12px 0 6px 0;
          letter-spacing: -0.03em;
          background: linear-gradient(to right, #ffffff, #c3c4ca);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-title span {
          color: var(--primary, #5c85ff);
          -webkit-text-fill-color: var(--primary, #5c85ff);
          font-weight: 900;
          margin-left: 2px;
        }

        .brand-subtitle {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.45;
          max-width: 320px;
          margin: 0 auto;
        }

        .activation-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .input-group input {
          width: 100%;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 14px 16px;
          color: #ffffff;
          font-size: 0.9rem;
          transition: all 0.25s ease;
          box-sizing: border-box;
        }

        .input-group input:focus {
          border-color: var(--primary, #5c85ff);
          box-shadow: 0 0 16px rgba(92, 133, 255, 0.25);
          outline: none;
        }

        .input-group input.input-error {
          border-color: #ff5c5c;
          box-shadow: 0 0 16px rgba(255, 92, 92, 0.15);
        }

        .error-message {
          font-size: 0.75rem;
          color: #ff5c5c;
          margin-top: 4px;
          font-weight: 500;
        }

        .btn-activate {
          width: 100%;
          background: var(--primary, #5c85ff);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 24px rgba(92, 133, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-activate:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(92, 133, 255, 0.45);
          filter: brightness(1.1);
        }

        .btn-activate:active {
          transform: translateY(0);
        }

        .btn-activate:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 4px 0;
          color: rgba(255, 255, 255, 0.25);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        .divider::before, .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .divider span {
          padding: 0 10px;
        }

        .btn-trial {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-trial:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        .hwid-footer {
          margin-top: 32px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hwid-footer span {
          font-size: 0.7rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 0.05em;
        }

        .hwid-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 6px 12px;
        }

        .hwid-box code {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.7);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 250px;
        }

        .hwid-box button {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          padding: 2px 6px;
          transition: color 0.2s ease;
        }

        .hwid-box button:hover {
          color: #ffffff;
        }

        .activation-success {
          text-align: center;
          padding: 20px 0;
        }

        .success-icon {
          width: 56px;
          height: 56px;
          background: rgba(92, 255, 133, 0.15);
          color: #5cff85;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          font-weight: 700;
          margin: 0 auto 20px auto;
          box-shadow: 0 0 20px rgba(92, 255, 133, 0.2);
        }

        .activation-success h2 {
          font-size: 1.4rem;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .activation-success p {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .animate-fade-in {
          animation: fadeIn 0.4s ease forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #ffffff;
          animation: spin 0.8s linear infinite;
        }

        .btn-close-paywall {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .btn-close-paywall:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.15);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Paywall;
