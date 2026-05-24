import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock } from 'lucide-react';

function Popup() {
  const [reminder, setReminder] = useState(null);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    // Parse reminder data from URL: #/popup?data=...
    try {
      const hash = window.location.hash;
      if (hash.includes('?data=')) {
        const dataStr = hash.split('?data=')[1];
        const data = JSON.parse(decodeURIComponent(dataStr));
        setReminder(data);
      }
    } catch (e) {
      console.error("Failed to parse reminder data", e);
    }
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') window.api?.closeWindow();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleComplete = async () => {
    if (reminder && window.api) {
      await window.api.updateReminder(reminder.id, 'concluido');
      window.api.closeWindow();
    }
  };

  const handleSnooze = async (minutes) => {
    if (reminder && window.api) {
      const newDate = new Date();
      newDate.setMinutes(newDate.getMinutes() + minutes);
      
      // format to local datetime string that input type="datetime-local" accepts
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const day = String(newDate.getDate()).padStart(2, '0');
      const hours = String(newDate.getHours()).padStart(2, '0');
      const mins = String(newDate.getMinutes()).padStart(2, '0');
      
      const newDatetime = `${year}-${month}-${day}T${hours}:${mins}`;
      
      await window.api.updateReminder(reminder.id, 'agendado', newDatetime);
      window.api.closeWindow();
    }
  };

  if (!reminder) return <div style={{padding: '20px'}}>Carregando...</div>;

  return (
    <div className="standalone-window" style={{ height: '100%', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <div style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
        <img src="/logo-icon.png" alt="Logo" style={{ height: '16px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
        LEMBRETE
      </div>

      <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{reminder.title}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: 'auto' }}>
          <Clock size={14} /> Agora - {new Date(reminder.datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </p>

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px', position: 'relative' }}>
          <button className="btn-primary" style={{ flex: 2, padding: '10px' }} onClick={handleComplete}>
            <CheckCircle size={16} /> Concluir
          </button>
          <button className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '10px' }} onClick={() => setShowOptions(!showOptions)}>
            <Clock size={16} /> Adiar
          </button>

          {showOptions && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--bg-main)', borderRadius: '12px', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
               <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 Adiar para...
                 <button className="close-btn" onClick={() => setShowOptions(false)} style={{ margin: '-5px -5px -5px 0' }}>&times;</button>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '15px 20px' }}>
                  <button className="btn-secondary" onClick={() => handleSnooze(5)}>5 min</button>
                  <button className="btn-secondary" onClick={() => handleSnooze(15)}>15 min</button>
                  <button className="btn-secondary" onClick={() => handleSnooze(30)}>30 min</button>
                  <button className="btn-secondary" onClick={() => handleSnooze(60)}>1 hora</button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Popup;
