import React, { useState, useEffect } from 'react';
import { X, Calendar, History as HistoryIcon, BellRing, PauseCircle, CheckCircle, XCircle, Trash2, Edit2, PlayCircle, Clock } from 'lucide-react';

function History() {
  const [activeTab, setActiveTab] = useState('agendados'); // 'agendados' or 'historico'
  const [reminders, setReminders] = useState([]);
  
  const [editingId, setEditingId] = React.useState(null);
  const [cloningId, setCloningId] = React.useState(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [editDate, setEditDate] = React.useState('');
  const [editTime, setEditTime] = React.useState('');

  const loadData = async () => {
    if (window.api) {
      const r = await window.api.getReminders();
      setReminders(r);
    }
  };

  useEffect(() => {
    let removeDataListener;
    if (window.api?.onDataUpdated) {
      removeDataListener = window.api.onDataUpdated(() => loadData());
    }
    loadData();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') window.api?.closeWindow();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (removeDataListener) removeDataListener();
    };
  }, []);

  const clearHistory = async () => {
    if (window.api) {
      await window.api.clearHistory();
      loadData();
    }
  };

  const close = () => window.api?.closeWindow();

  const togglePause = async (r) => {
    if (!window.api) return;
    const newStatus = r.status === 'pausado' ? 'agendado' : 'pausado';
    await window.api.updateReminder(r.id, newStatus, null);
    loadData();
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditTitle(r.title);
    const d = new Date(r.datetime);
    setEditDate(d.toISOString().split('T')[0]);
    setEditTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
  };

  const saveEdit = async () => {
    if (!window.api) return;
    const dt = new Date(`${editDate}T${editTime}`);
    await window.api.updateReminderFull(editingId, editTitle, dt.toISOString());
    setEditingId(null);
    loadData();
  };

  const deleteRem = async (id) => {
    if (window.confirm("Deseja realmente excluir este lembrete?")) {
      if (!window.api) return;
      await window.api.deleteReminder(id);
      loadData();
    }
  };

  const saveClone = async () => {
    if (!window.api) return;
    const dt = new Date(`${editDate}T${editTime}`);
    const original = reminders.find(r => r.id === cloningId);
    if (original && original.status === 'perdido') {
      await window.api.reagendarPerdido(cloningId, editTitle, dt.toISOString());
    } else {
      await window.api.addReminder(editTitle, dt.toISOString());
    }
    setCloningId(null);
    loadData();
  };

  const startClone = (r) => {
    setCloningId(r.id);
    setEditTitle(r.title);
    const d = new Date();
    setEditDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setEditTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
  };

  const agendados = reminders.filter(r => r.status === 'agendado' || r.status === 'pausado');
  const falhas = reminders.filter(r => r.status === 'perdido');
  const historico = reminders.filter(r => r.status === 'concluido' || r.status === 'cancelado');

  return (
    <div className="standalone-window">
      <div className="window-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="./logo-icon.png" alt="Logo" style={{ height: '18px', marginRight: '8px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Histórico de Lembretes</span>
        </div>
        <button className="close-btn" onClick={close}><X size={18} /></button>
      </div>

      <div className="tabs" style={{ marginBottom: '0' }}>
        <button 
          className={`tab ${activeTab === 'agendados' ? 'active' : ''}`}
          onClick={() => setActiveTab('agendados')}
        >
          <Calendar size={16} /> Agendados
        </button>
        <button 
          className={`tab ${activeTab === 'historico' ? 'active' : ''}`}
          onClick={() => setActiveTab('historico')}
        >
          <HistoryIcon size={16} /> Histórico
        </button>
      </div>

      <div className="window-content">
        {activeTab === 'agendados' && (
          <div>
            {agendados.map(r => (
              <div key={r.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                {editingId === r.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    <input type="text" className="form-control" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="date" className="form-control" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ flex: 1 }} />
                      <input type="time" className="form-control" value={editTime} onChange={e => setEditTime(e.target.value)} style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn-primary" onClick={saveEdit} style={{ flex: 1, padding: '8px' }}>Atualizar</button>
                      <button className="btn-secondary" onClick={() => setEditingId(null)} style={{ flex: 1, padding: '8px' }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '15px' }}>
                    <div className="list-item-icon" style={{ opacity: r.status === 'pausado' ? 0.5 : 1 }}>
                      {r.status === 'pausado' ? <PauseCircle size={20} /> : <BellRing size={20} />}
                    </div>
                    <div className="list-item-content" style={{ flex: 1, opacity: r.status === 'pausado' ? 0.5 : 1 }}>
                      <h4 style={{ color: r.status === 'pausado' ? 'var(--text-muted)' : 'inherit' }}>{r.title} {r.status === 'pausado' && '(Pausado)'}</h4>
                      <p>{new Date(r.datetime).toLocaleString()}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="icon-btn" onClick={() => togglePause(r)} title={r.status === 'pausado' ? 'Retomar' : 'Pausar'}>
                        {r.status === 'pausado' ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
                      </button>
                      <button className="icon-btn" onClick={() => startEdit(r)} title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button className="icon-btn" onClick={() => deleteRem(r.id)} style={{ color: 'var(--danger)' }} title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {agendados.length === 0 && <p style={{color: 'var(--text-muted)'}}>Nenhum lembrete agendado.</p>}
            
            {falhas.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>⚠️ FALHAS / PERDIDOS</span>
                <div style={{ marginTop: '10px' }}>
                  {falhas.map(r => (
                    <div key={r.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', border: '1px solid rgba(255, 107, 107, 0.3)' }}>
                      {cloningId === r.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', padding: '10px 0' }}>
                          <input type="text" className="form-control" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <input type="date" className="form-control" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ flex: 1 }} />
                            <input type="time" className="form-control" value={editTime} onChange={e => setEditTime(e.target.value)} style={{ flex: 1 }} />
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn-primary" onClick={saveClone} style={{ flex: 1, padding: '8px' }}>Agendar Novo</button>
                            <button className="btn-secondary" onClick={() => setCloningId(null)} style={{ flex: 1, padding: '8px' }}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '15px' }}>
                          <div className="list-item-icon" style={{ color: 'var(--danger)' }}>
                            <XCircle size={20} />
                          </div>
                          <div className="list-item-content" style={{ flex: 1 }}>
                            <h4>{r.title}</h4>
                            <p style={{ color: 'var(--danger)' }}>Perdido: {new Date(r.datetime).toLocaleString()}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button className="icon-btn" onClick={() => startClone(r)} title="Clonar (Agendar Novamente)">
                              <Clock size={16} />
                            </button>
                            <button className="icon-btn" onClick={() => deleteRem(r.id)} style={{ color: 'var(--danger)' }} title="Excluir">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <div key={r.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                {cloningId === r.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', padding: '10px 0' }}>
                    <input type="text" className="form-control" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="date" className="form-control" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ flex: 1 }} />
                      <input type="time" className="form-control" value={editTime} onChange={e => setEditTime(e.target.value)} style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn-primary" onClick={saveClone} style={{ flex: 1, padding: '8px' }}>Agendar Novo</button>
                      <button className="btn-secondary" onClick={() => setCloningId(null)} style={{ flex: 1, padding: '8px' }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '15px' }}>
                    <div className="list-item-icon" style={{ color: r.status === 'concluido' ? 'var(--success)' : 'var(--danger)' }}>
                      {r.status === 'concluido' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    </div>
                    <div className="list-item-content" style={{ flex: 1 }}>
                      <h4 style={{ textDecoration: r.status === 'concluido' ? 'line-through' : 'none' }}>{r.title}</h4>
                      <p>{r.status === 'concluido' ? 'Concluído em' : 'Cancelado em'} {new Date(r.datetime).toLocaleString()}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="icon-btn" onClick={() => startClone(r)} title="Clonar">
                        <Clock size={16} />
                      </button>
                    </div>
                  </div>
                )}
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
