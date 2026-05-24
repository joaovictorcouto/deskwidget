import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Palette, Cpu, Volume2 } from 'lucide-react';
import { playNotificationSound } from './utils/audio.js';

function Settings() {
  const [settings, setSettings] = useState({});
  const [localSettings, setLocalSettings] = useState({});
  const [activeTab, setActiveTab] = useState('geral');

  useEffect(() => {
    const loadSettings = async () => {
      if (window.api) {
        const s = await window.api.getSettings();
        setSettings(s);
        setLocalSettings(s);
      }
    };
    loadSettings();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') window.api?.closeWindow();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const updateLocalSetting = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const close = () => window.api?.closeWindow();

  const handleSave = async () => {
    if (window.api) {
      for (const key of Object.keys(localSettings)) {
        if (localSettings[key] !== settings[key]) {
          await window.api.updateSetting(key, localSettings[key]);
        }
      }
      
      // Atualizar o estado da memória local para que novos salvamentos funcionem
      const updatedSettings = await window.api.getSettings();
      setSettings(updatedSettings);
      setLocalSettings(updatedSettings);
    }
  };

  const resetDefaults = async () => {
    if (window.api) {
      await window.api.resetSettings();
      const s = await window.api.getSettings();
      setSettings(s);
      setLocalSettings(s);
    }
  };

  return (
    <div className="standalone-window">
      <div className="window-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo-icon.png" alt="Logo" style={{ height: '18px', marginRight: '8px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Configurações</span>
        </div>
        <button className="close-btn" onClick={close}><X size={18} /></button>
      </div>

      <div className="window-content" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* TAB HEADER */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <button 
            style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', color: activeTab === 'geral' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'geral' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}
            onClick={() => setActiveTab('geral')}
          ><SettingsIcon size={14} /> Geral</button>
          
          <button 
            style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', color: activeTab === 'aparencia' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'aparencia' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}
            onClick={() => setActiveTab('aparencia')}
          ><Palette size={14} /> Aparência</button>

          <button 
            style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', color: activeTab === 'audio' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'audio' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}
            onClick={() => setActiveTab('audio')}
          ><Volume2 size={14} /> Áudio</button>
        </div>

        {/* TAB CONTENT */}
        <div style={{ padding: '15px 20px', overflowY: 'auto', flex: 1 }}>
          
          {/* ABA GERAL */}
          {activeTab === 'geral' && (
            <div>
              <div className="settings-section">
                <h3 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Módulos</h3>
                
                <div className="setting-item">
                  <span>Barra de Progresso Diária</span>
                  <div 
                    className={`toggle-switch ${localSettings.enableProgressBar === 'true' ? 'on' : ''}`}
                    onClick={() => updateLocalSetting('enableProgressBar', localSettings.enableProgressBar === 'true' ? 'false' : 'true')}
                  />
                </div>

                <div className="setting-item">
                  <span>Pomodoro Timer</span>
                  <div 
                    className={`toggle-switch ${localSettings.enablePomodoro === 'true' ? 'on' : ''}`}
                    onClick={() => updateLocalSetting('enablePomodoro', localSettings.enablePomodoro === 'true' ? 'false' : 'true')}
                  />
                </div>
                {localSettings.enablePomodoro === 'true' && (
                  <div style={{ marginLeft: '15px', paddingLeft: '15px', borderLeft: '2px solid var(--border)', marginBottom: '15px' }}>
                    <div className="setting-item" style={{ marginBottom: '10px' }}>
                      <span>Foco (min)</span>
                      <input type="number" className="form-control" style={{ width: '70px', padding: '4px' }} 
                             value={localSettings.pomodoroFocus || '25'} 
                             onChange={(e) => updateLocalSetting('pomodoroFocus', e.target.value)} />
                    </div>
                    <div className="setting-item" style={{ marginBottom: '10px' }}>
                      <span>Descanso (min)</span>
                      <input type="number" className="form-control" style={{ width: '70px', padding: '4px' }} 
                             value={localSettings.pomodoroBreak || '5'} 
                             onChange={(e) => updateLocalSetting('pomodoroBreak', e.target.value)} />
                    </div>
                    <div className="setting-item" style={{ marginBottom: 0 }}>
                      <span>Som de Alarme</span>
                      <select className="form-control" style={{ width: '120px', padding: '4px' }}
                              value={localSettings.pomodoroSound || 'sino'}
                              onChange={(e) => updateLocalSetting('pomodoroSound', e.target.value)}>
                        <option value="sino">Sino</option>
                        <option value="suave">Toque Suave</option>
                        <option value="bolha">Bolha Pop</option>
                        <option value="marimba">Marimba</option>
                        <option value="duplo">Toque Duplo</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="setting-item">
                  <span>Lista de Tarefas</span>
                  <div 
                    className={`toggle-switch ${localSettings.enableTasks !== 'false' ? 'on' : ''}`}
                    onClick={() => {
                      if (localSettings.enableTasks !== 'false' && localSettings.enableReminders === 'false') return;
                      setLocalSettings({...localSettings, enableTasks: localSettings.enableTasks === 'false' ? 'true' : 'false'});
                    }}
                  >
                    <div className="toggle-thumb"></div>
                  </div>
                </div>

                <div className="setting-item">
                  <span>Agendador de Lembretes</span>
                  <div 
                    className={`toggle-switch ${localSettings.enableReminders !== 'false' ? 'on' : ''}`}
                    onClick={() => {
                      if (localSettings.enableReminders !== 'false' && localSettings.enableTasks === 'false') return;
                      setLocalSettings({...localSettings, enableReminders: localSettings.enableReminders === 'false' ? 'true' : 'false'});
                    }}
                  >
                    <div className="toggle-thumb"></div>
                  </div>
                </div>

                <div className="setting-item">
                  <span>Notas Rápidas</span>
                  <div 
                    className={`toggle-switch ${localSettings.enableNotes === 'true' ? 'on' : ''}`}
                    onClick={() => updateLocalSetting('enableNotes', localSettings.enableNotes === 'true' ? 'false' : 'true')}
                  />
                </div>

                <div className="setting-item">
                  <span>Sistema de Tags coloridas</span>
                  <div 
                    className={`toggle-switch ${localSettings.enableTags === 'true' ? 'on' : ''}`}
                    onClick={() => updateLocalSetting('enableTags', localSettings.enableTags === 'true' ? 'false' : 'true')}
                  />
                </div>
              </div>

              <div className="settings-section" style={{ borderBottom: 'none', marginBottom: 0 }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Sistema</h3>
                <div className="setting-item" style={{ marginBottom: 0 }}>
                  <span>Iniciar com o Windows</span>
                  <div 
                    className={`toggle-switch ${localSettings.startOnWindows === 'true' ? 'on' : ''}`}
                    onClick={() => updateLocalSetting('startOnWindows', localSettings.startOnWindows === 'true' ? 'false' : 'true')}
                  />
                </div>
                <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px'}}>
                  (Requer que o aplicativo esteja empacotado para funcionar corretamente)
                </p>
              </div>
            </div>
          )}

          {/* ABA APARÊNCIA */}
          {activeTab === 'aparencia' && (
            <div>
              <div className="setting-item">
                <span>Posição</span>
                <div className="segmented-control">
                  <button 
                    className={`segmented-btn ${localSettings.edge === 'left' ? 'active' : ''}`}
                    onClick={() => updateLocalSetting('edge', 'left')}
                  >Esquerda</button>
                  <button 
                    className={`segmented-btn ${localSettings.edge !== 'left' ? 'active' : ''}`}
                    onClick={() => updateLocalSetting('edge', 'right')}
                  >Direita</button>
                </div>
              </div>
              
              <div className="setting-item">
                <span>Tema</span>
                <div className="segmented-control">
                  <button 
                    className={`segmented-btn ${localSettings.theme === 'claro' ? 'active' : ''}`}
                    onClick={() => updateLocalSetting('theme', 'claro')}
                  >Claro</button>
                  <button 
                    className={`segmented-btn ${localSettings.theme !== 'claro' ? 'active' : ''}`}
                    onClick={() => updateLocalSetting('theme', 'escuro')}
                  >Escuro</button>
                </div>
              </div>

              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                  <span>Opacidade do Dock Lateral</span>
                  <span>{localSettings.opacity || 90}%</span>
                </div>
                <input 
                  type="range" 
                  min="10" max="100" 
                  value={localSettings.opacity || 90}
                  onChange={(e) => setLocalSettings({...localSettings, opacity: e.target.value})}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                  <span>Opacidade do Painel Principal</span>
                  <span>{localSettings.expandedOpacity || 100}%</span>
                </div>
                <input 
                  type="range" 
                  min="10" max="100" 
                  value={localSettings.expandedOpacity || 100}
                  onChange={(e) => setLocalSettings({...localSettings, expandedOpacity: e.target.value})}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="setting-item" style={{ borderBottom: 'none' }}>
                <span>Delay de Recolhimento (ms)</span>
                <input 
                  type="number" 
                  className="form-control" 
                  style={{ width: '80px', padding: '4px 8px', textAlign: 'right' }} 
                  value={localSettings.delay || 1000}
                  onChange={(e) => updateLocalSetting('delay', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ABA ÁUDIO */}
          {activeTab === 'audio' && (
            <div>
              <div className="setting-item">
                <span>Ativar Sons</span>
                <div 
                  className={`toggle-switch ${localSettings.soundEnabled !== 'false' ? 'on' : ''}`}
                  onClick={() => updateLocalSetting('soundEnabled', localSettings.soundEnabled === 'false' ? 'true' : 'false')}
                >
                  <div className="toggle-thumb"></div>
                </div>
              </div>
              
              <div style={{ opacity: localSettings.soundEnabled !== 'false' ? 1 : 0.5, pointerEvents: localSettings.soundEnabled !== 'false' ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                    <span>Volume do Som</span>
                    <span>{localSettings.soundVolume || 80}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={localSettings.soundVolume || 80}
                    onChange={(e) => updateLocalSetting('soundVolume', e.target.value)}
                    className="slider"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="setting-item">
                  <span>Tipo de Som</span>
                  <select 
                    className="form-control"
                    style={{ width: '120px', padding: '4px 8px' }}
                    value={localSettings.soundType || 'sino'}
                    onChange={(e) => updateLocalSetting('soundType', e.target.value)}
                  >
                    <option value="sino">Sino (Padrão)</option>
                    <option value="suave">Toque Suave</option>
                    <option value="bolha">Bolha Pop</option>
                    <option value="marimba">Marimba</option>
                    <option value="duplo">Toque Duplo</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                  <button 
                    className="btn-secondary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    onClick={() => {
                      const vol = localSettings.soundVolume ? parseInt(localSettings.soundVolume) / 100 : 0.8;
                      const type = localSettings.soundType || 'sino';
                      playNotificationSound(vol, type);
                    }}
                  >
                    <Volume2 size={16} /> Testar Som Selecionado
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="window-footer">
        <button className="btn-secondary" onClick={resetDefaults} style={{ marginRight: 'auto', color: 'var(--danger)' }}>Redefinir Padrões</button>
        <button className="btn-secondary" onClick={close}>Cancelar</button>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={handleSave}>Salvar</button>
      </div>
    </div>
  );
}

export default Settings;
