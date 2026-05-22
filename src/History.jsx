import React, { useState, useEffect } from 'react';
import { X, Calendar, History as HistoryIcon, BellRing, PauseCircle, CheckCircle, XCircle, Trash2 } from 'lucide-react';

function History() {
  const [activeTab, setActiveTab] = useState('agendados'); // 'agendados' or 'historico'
  const [reminders, setReminders] = useState([]);

  const loadData = async () => {
    if (window.api) {
      const r = await window.api.getReminders();
      setReminders(r);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const clearHistory = async () => {
    if (window.api) {
      await window.api.clearHistory();
      loadData();
    }
  };

  const close = () => window.api?.closeWindow();

  const agendados = reminders.filter(r => r.status === 'agendado');
  const historico = reminders.filter(r => r.status !== 'agendado');

  return (
    <div className="standalone-window">
      <div className="window-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo-icon.png" alt="Logo" style={{ height: '18px', marginRight: '8px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Histórico de Lembretes</span>
        </div>
        <button className="icon-btn" onClick={close} style={{ opacity: 0.7 }}>×</button>
      </div>

      <div className="tabs" style={{ padding: '0 20px', marginBottom: '0' }}>
        <div 
          className={`tab ${activeTab === 'agendados' ? 'active' : ''}`}
          onClick={() => setActiveTab('agendados')}
        >
          <Calendar size={16} /> Agendados
        </div>
        <div 
          className={`tab ${activeTab === 'historico' ? 'active' : ''}`}
          onClick={() => setActiveTab('historico')}
        >
          <HistoryIcon size={16} /> Histórico
        </div>
      </div>

      <div className="window-content">
        {activeTab === 'agendados' && (
          <div>
            {agendados.map(r => (
              <div key={r.id} className="list-item">
                <div className="list-item-icon">
                  <BellRing size={20} />
                </div>
                <div className="list-item-content">
                  <h4>{r.title}</h4>
                  <p>{new Date(r.datetime).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {agendados.length === 0 && <p style={{color: 'var(--text-muted)'}}>Nenhum lembrete agendado.</p>}
          </div>
        )}

        {activeTab === 'historico' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ÚLTIMOS 7 DIAS</span>
              <button 
                onClick={clearHistory}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
              >
                <Trash2 size={14} /> Limpar todos
              </button>
            </div>
            
            {historico.map(r => (
              <div key={r.id} className="list-item">
                <div className="list-item-icon" style={{ color: r.status === 'concluido' ? 'var(--success)' : 'var(--danger)' }}>
                  {r.status === 'concluido' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                </div>
                <div className="list-item-content">
                  <h4 style={{ textDecoration: r.status === 'concluido' ? 'line-through' : 'none' }}>{r.title}</h4>
                  <p>{r.status === 'concluido' ? 'Concluído em' : 'Cancelado em'} {new Date(r.datetime).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {historico.length === 0 && <p style={{color: 'var(--text-muted)'}}>Histórico vazio.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default History;
