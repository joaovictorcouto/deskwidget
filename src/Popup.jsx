import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, Coffee, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Move } from 'lucide-react';
import { playNotificationSound } from './utils/audio.js';

// ─── Shell padrão compartilhada por todos os popups ──────────────────────────
// Modelo visual: popup de lembrete.
// Altura fixa: 210px | Largura: 320px (definida no main.js)
function PopupShell({ label, labelIcon, rightAction, progressBar, draggable, children }) {
  // Se for a janela de arrasto (draggable), aplicamos a leve transparência
  const bgStyle = draggable ? {
    backgroundColor: 'rgba(25, 25, 25, 0.85)',
    backdropFilter: 'blur(10px)',
  } : {
    backgroundColor: 'var(--bg-main)', // Usar a cor de fundo padrão
  };

  return (
    <div
      className="standalone-window"
      style={{
        height: '100vh', borderRadius: '12px', border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        WebkitAppRegion: draggable ? 'drag' : 'no-drag',
        position: 'relative',
        ...bgStyle
      }}
    >
      {/* Barra de progresso (opcional) */}
      {progressBar !== undefined && (
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '3px',
          backgroundColor: 'var(--primary)', width: `${progressBar}%`,
          transition: 'width 0.05s linear', zIndex: 1,
        }} />
      )}

      {/* Header */}
      <div style={{
        padding: '10px 14px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid var(--border)',
        fontSize: '0.78rem', fontWeight: 'bold', color: 'var(--text-muted)',
        flexShrink: 0, WebkitAppRegion: draggable ? 'drag' : 'no-drag',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          {labelIcon || (
            <img src="./logo-icon.png" alt="" style={{ height: '15px', objectFit: 'contain' }}
              onError={(e) => e.target.style.display = 'none'} />
          )}
          {label}
        </div>
        {rightAction || (
          <button
            onClick={() => window.api?.closeWindow()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', lineHeight: 1, WebkitAppRegion: 'no-drag' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{
        flex: 1, padding: '13px 14px', display: 'flex', flexDirection: 'column',
        WebkitAppRegion: draggable ? 'drag' : 'no-drag', overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Popup de Lembrete ────────────────────────────────────────────────────────
function ReminderPopup({ config }) {
  const [showOptions, setShowOptions] = useState(false);
  const reminder = config.data;

  const handleComplete = async () => {
    await window.api?.updateReminder(reminder.id, 'concluido');
    window.api?.closeWindow();
  };

  const handleSnooze = async (minutes) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutes);
    await window.api?.updateReminder(reminder.id, 'agendado', d.toISOString());
    window.api?.closeWindow();
  };

  return (
    <PopupShell label="LEMBRETE" progressBar={config.progressBar}>
      {showOptions ? (
        // Tela de adiar (substitui o body)
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Adiar para...</span>
            <button onClick={() => setShowOptions(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1 }}><X size={14} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}>
            <button className="btn-secondary" onClick={() => handleSnooze(5)}>5 min</button>
            <button className="btn-secondary" onClick={() => handleSnooze(15)}>15 min</button>
            <button className="btn-secondary" onClick={() => handleSnooze(30)}>30 min</button>
            <button className="btn-secondary" onClick={() => handleSnooze(60)}>1 hora</button>
          </div>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: '1rem', marginBottom: '5px', lineHeight: 1.3 }}>{reminder.title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
            <Clock size={13} />
            Agora · {new Date(reminder.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button className="btn-primary" style={{ flex: 2, padding: '9px' }} onClick={handleComplete}>
              <CheckCircle size={15} /> Concluir
            </button>
            <button className="btn-secondary" style={{ flex: 1, padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }} onClick={() => setShowOptions(true)}>
              <Clock size={14} /> Adiar
            </button>
          </div>
        </>
      )}
    </PopupShell>
  );
}

// ─── Popup de Pomodoro ────────────────────────────────────────────────────────
function PomodoroPopup({ config }) {
  const stopPomodoro = () => { window.api?.sendPomodoroAction('stop'); window.api?.closeWindow(); };
  const startFocus  = () => { window.api?.sendPomodoroAction('start-focus'); window.api?.closeWindow(); };

  const isBreak = config.status === 'break';
  const isIdle  = config.status === 'idle';
  const accentColor = isBreak ? 'var(--success)' : 'var(--primary)';

  return (
    <PopupShell label="POMODORO" progressBar={config.progressBar}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Ícone + título */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center', gap: '8px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${accentColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Coffee size={20} color={accentColor} />
          </div>
          <h2 style={{ fontSize: '1rem', color: accentColor, textAlign: 'center', margin: 0 }}>
            {config.title}
          </h2>
        </div>

        {/* Botões */}
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          {isBreak && (
            <button className="btn-secondary" style={{ flex: 1, padding: '9px' }} onClick={stopPomodoro}>
              Parar
            </button>
          )}
          {isIdle && (
            <>
              <button className="btn-primary" style={{ flex: 2, padding: '9px' }} onClick={startFocus}>
                Novo Foco
              </button>
              <button className="btn-secondary" style={{ flex: 1, padding: '9px' }} onClick={stopPomodoro}>
                Parar
              </button>
            </>
          )}
        </div>
      </div>
    </PopupShell>
  );
}

// ─── Popup do Posicionador ────────────────────────────────────────────────────
const SpinnerCol = ({ label, value, maxVal, onUpdate }) => {
  const noDrag = { WebkitAppRegion: 'no-drag' };
  // Estado local para digitação sem mover a janela em tempo real
  const [localVal, setLocalVal] = useState(value.toString());

  // Sincroniza o input quando a janela é movida (arrastada) ou o valor externo muda
  useEffect(() => { setLocalVal(value.toString()); }, [value]);

  const applyValue = () => {
    const parsed = parseInt(localVal);
    if (!isNaN(parsed)) {
      onUpdate(parsed);
    } else {
      setLocalVal(value.toString());
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', ...noDrag }}>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <input
          type="text" 
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '5px', padding: '4px 2px', width: '45px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold', outline: 'none', ...noDrag }}
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyValue();
          }}
          onBlur={applyValue}
          onWheel={(e) => { e.preventDefault(); onUpdate(value + (e.deltaY < 0 ? 1 : -1)); }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button onClick={() => onUpdate(value + 1)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '3px', cursor: 'pointer', padding: '1px 3px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '14px', ...noDrag }}>
            <ChevronUp size={10} />
          </button>
          <button onClick={() => onUpdate(value - 1)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '3px', cursor: 'pointer', padding: '1px 3px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '14px', ...noDrag }}>
            <ChevronDown size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};

function PositionerPopup() {
  const [right, setRight] = useState(20);
  const [bottom, setBottom] = useState(20);
  const [maxRight, setMaxRight] = useState(2000);
  const [maxBottom, setMaxBottom] = useState(2000);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.api?.getPositionerMargins?.().then(m => {
      setRight(m.right);
      setBottom(m.bottom);
    });
    const unsub = window.api?.onPositionerMetrics?.((m) => {
      setRight(Math.max(0, Math.round(m.right)));
      setBottom(Math.max(0, Math.round(m.bottom)));
      if (m.maxRight !== undefined) setMaxRight(m.maxRight);
      if (m.maxBottom !== undefined) setMaxBottom(m.maxBottom);
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const clampRight = (v) => Math.max(0, Math.min(maxRight, Math.round(v)));
  const clampBottom = (v) => Math.max(0, Math.min(maxBottom, Math.round(v)));

  const updateRight = (v) => { const s = clampRight(v); setRight(s); window.api?.setPositionerMargins(s, bottom); };
  const updateBottom = (v) => { const s = clampBottom(v); setBottom(s); window.api?.setPositionerMargins(right, s); };

  const saveAndClose = async () => {
    await window.api?.savePopupPosition({ right, bottom });
    setSaved(true);
    setTimeout(() => window.api?.closeWindow(), 700);
  };

  const noDrag = { WebkitAppRegion: 'no-drag' };

  return (
    <PopupShell
      label="POSIÇÃO DOS POPUPS"
      labelIcon={<Move size={13} />}
      draggable={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', paddingBottom: '2px' }}>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3, margin: 0 }}>
          Arraste a janela ou ajuste os valores.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px' }}>
          <SpinnerCol label="Horizontal" value={right} maxVal={maxRight} onUpdate={updateRight} />
          <SpinnerCol label="Vertical" value={bottom} maxVal={maxBottom} onUpdate={updateBottom} />
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', padding: '6px', transition: 'all 0.3s', background: saved ? 'var(--success)' : '', ...noDrag }}
          onClick={saveAndClose}
        >
          {saved ? '✓ Salvo!' : 'Salvar Posição'}
        </button>
      </div>
    </PopupShell>
  );
}

// ─── Roteador de popups ───────────────────────────────────────────────────────
function Popup() {
  const [config, setConfig] = useState(null);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    let timer;
    try {
      const hash = window.location.hash;
      if (hash.includes('?config=')) {
        const data = JSON.parse(decodeURIComponent(hash.split('?config=')[1]));
        setConfig(data);

        // Som de notificação
        if ((data.type === 'reminder' || data.type === 'pomodoro') && window.api) {
          window.api.getSettings().then(s => {
            if (s.soundEnabled !== 'false' && s.soundEnabled !== false) {
              const vol = s.soundVolume ? parseInt(s.soundVolume) / 100 : 0.8;
              const type = data.type === 'pomodoro' ? (s.pomodoroSound || 'duplo') : (s.soundType || 'duplo');
              playNotificationSound(vol, type);
            }
          });
        }
        
        // Progress bar and auto-close logic is global now
        if (data.autoClose) {
          const duration = data.autoClose;
          let current = duration;
          timer = setInterval(() => {
            current -= 50;
            setProgress(Math.max(0, (current / duration) * 100));
            if (current <= 0) { clearInterval(timer); window.api?.closeWindow(); }
          }, 50);
        }
      }
    } catch (e) {
      console.error('Failed to parse popup config', e);
    }

    const onKey = (e) => { if (e.key === 'Escape') window.api?.closeWindow(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (timer) clearInterval(timer);
    };
  }, []);

  if (!config) return <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Carregando...</div>;

  const configWithProgress = { ...config, progressBar: config.autoClose ? progress : undefined };

// ─── Popup de Agendamento de Atualização ──────────────────────────────────────
function ScheduleUpdatePopup({ config }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    setDate(`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`);
    setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  }, []);

  const handleSchedule = async () => {
    if (!date || !time) {
      setError('Selecione data e hora');
      return;
    }
    const dt = new Date(`${date}T${time}`);
    if (dt < new Date()) {
      setError('Selecione uma hora futura');
      return;
    }
    
    if (window.api) {
      await window.api.addReminder(
        '🔄 Atualização Automática Agendada',
        dt.toISOString(),
        'none'
      );
      await window.api.updateSetting('scheduled_update_version', config.data.version);
      await window.api.updateSetting('scheduled_update_time', dt.toISOString());
    }
    
    window.api?.closeWindow();
  };

  return (
    <PopupShell label="AGENDAR ATUALIZAÇÃO" labelIcon={<Clock size={13} />}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 8px 0', lineHeight: 1.3 }}>
          Escolha quando deseja instalar a versão {config.data.version}. O app será atualizado automaticamente nesta data.
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ fontSize: '0.6rem' }}>DATA</label>
            <input 
              type="date" 
              className="form-control" 
              style={{ padding: '6px', fontSize: '0.75rem', height: '32px' }}
              value={date} 
              onChange={e => setDate(e.target.value)} 
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ fontSize: '0.6rem' }}>HORA</label>
            <input 
              type="time" 
              className="form-control" 
              style={{ padding: '6px', fontSize: '0.75rem', height: '32px' }}
              value={time} 
              onChange={e => setTime(e.target.value)} 
            />
          </div>
        </div>
        {error && <div style={{ color: 'var(--danger)', fontSize: '0.65rem', marginBottom: '6px' }}>⚠️ {error}</div>}
        <button className="btn-primary" style={{ padding: '8px' }} onClick={handleSchedule}>
          Agendar Atualização
        </button>
      </div>
    </PopupShell>
  );
}

// ─── Roteador de popups ───────────────────────────────────────────────────────
function Popup() {
  const [config, setConfig] = useState(null);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    let timer;
    try {
      const hash = window.location.hash;
      if (hash.includes('?config=')) {
        const data = JSON.parse(decodeURIComponent(hash.split('?config=')[1]));
        setConfig(data);

        // Som de notificação
        if ((data.type === 'reminder' || data.type === 'pomodoro') && window.api) {
          window.api.getSettings().then(s => {
            if (s.soundEnabled !== 'false' && s.soundEnabled !== false) {
              const vol = s.soundVolume ? parseInt(s.soundVolume) / 100 : 0.8;
              const type = data.type === 'pomodoro' ? (s.pomodoroSound || 'duplo') : (s.soundType || 'duplo');
              playNotificationSound(vol, type);
            }
          });
        }
        
        // Progress bar and auto-close logic is global now
        if (data.autoClose) {
          const duration = data.autoClose;
          let current = duration;
          timer = setInterval(() => {
            current -= 50;
            setProgress(Math.max(0, (current / duration) * 100));
            if (current <= 0) { clearInterval(timer); window.api?.closeWindow(); }
          }, 50);
        }
      }
    } catch (e) {
      console.error('Failed to parse popup config', e);
    }

    const onKey = (e) => { if (e.key === 'Escape') window.api?.closeWindow(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (timer) clearInterval(timer);
    };
  }, []);

  if (!config) return <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Carregando...</div>;

  const configWithProgress = { ...config, progressBar: config.autoClose ? progress : undefined };

  if (config.type === 'reminder')   return <ReminderPopup config={configWithProgress} />;
  if (config.type === 'pomodoro')   return <PomodoroPopup config={configWithProgress} />;
  if (config.type === 'positioner') return <PositionerPopup />;
  if (config.type === 'schedule-update') return <ScheduleUpdatePopup config={configWithProgress} />;

  return null;
}

export default Popup;
