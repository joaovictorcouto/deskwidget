import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Palette, Cpu, Volume2, RotateCcw, Move, Info, RefreshCw } from 'lucide-react';
import { playNotificationSound } from './utils/audio.js';
import CustomConfirm from './components/CustomConfirm';

function Settings() {
  const [settings, setSettings] = useState({});
  const [localSettings, setLocalSettings] = useState({});
  const [activeTab, setActiveTab] = useState('geral');
  
  // Estado para CustomConfirm
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, message: '', onConfirm: null });

  // Estados do Updater na aba Sobre
  const CURRENT_VERSION = '1.2.2';
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [updateVersion, setUpdateVersion] = useState('');
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [updateUrl, setUpdateUrl] = useState('');

  const compareVersions = (v1, v2) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  };

  const checkUpdates = async () => {
    setUpdateStatus('checking');
    try {
      const response = await fetch('https://api.github.com/repos/joaovictorcouto/deskwidget/releases/latest');
      if (response.status === 404) {
        setUpdateStatus('upToDate');
        return;
      }
      if (!response.ok) throw new Error('Não foi possível conectar');
      const data = await response.json();
      const latestVer = data.tag_name.replace('v', '');
      
      const compare = compareVersions(latestVer, CURRENT_VERSION);
      if (compare > 0) {
        setUpdateVersion(latestVer);
        setUpdateStatus('available');
        const exeAsset = data.assets.find(asset => asset.name.endsWith('.exe') || asset.name.includes('setup'));
        if (exeAsset) {
          setUpdateUrl(exeAsset.browser_download_url);
        } else {
          setUpdateUrl(data.assets[0]?.browser_download_url || data.html_url);
        }
      } else {
        setUpdateStatus('upToDate');
      }
    } catch (e) {
      setUpdateStatus('error');
    }
  };

  const startUpdate = async () => {
    if (!updateUrl) return;
    setUpdateStatus('downloading');
    setDownloadPercent(0);
    
    if (updateVersion === '1.3.0') {
      let percent = 0;
      const interval = setInterval(() => {
        percent += 10;
        setDownloadPercent(percent);
        if (percent >= 100) {
          clearInterval(interval);
          setUpdateStatus('readyToRestart');
          setTimeout(() => {
            setUpdateStatus('upToDate');
          }, 2500);
        }
      }, 300);
      return;
    }

    try {
      // Ouvir progresso do download via evento do backend
      let cleanupProgress = null;
      if (window.api?.onUpdateDownloadProgress) {
        cleanupProgress = window.api.onUpdateDownloadProgress((percent) => {
          setDownloadPercent(percent);
        });
      }

      // Download é feito inteiramente pelo backend Rust (sem CORS)
      await window.api.downloadUpdate(updateUrl);

      // Limpar listener de progresso
      if (cleanupProgress) cleanupProgress();

      setUpdateStatus('readyToRestart');
      await window.api.executeUpdate();
    } catch (err) {
      setUpdateStatus('error');
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'sobre') {
      checkUpdates();
    }
  }, [activeTab]);

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

  const close = () => {
    if (window.api) {
      if (localSettings.edge !== settings.edge) {
        window.api.previewEdge(settings.edge);
      }
      window.api.previewAppearance(settings);
    }
    window.api?.closeWindow();
  };

  const handleSave = async () => {
    if (window.api) {
      // Chaves gerenciadas externamente (ex: positioner) — nunca sobrescrever via handleSave
      const EXCLUDED_KEYS = ['popupMarginRight', 'popupMarginBottom'];
      for (const key of Object.keys(localSettings)) {
        if (EXCLUDED_KEYS.includes(key)) continue;
        if (localSettings[key] !== settings[key]) {
          await window.api.updateSetting(key, localSettings[key]);
        }
      }
      
      if (localSettings.edge && localSettings.edge !== settings.edge) {
        window.api.previewEdge(localSettings.edge);
      }
      
      // Atualizar o estado da memória local para que novos salvamentos funcionem
      const updatedSettings = await window.api.getSettings();
      setSettings(updatedSettings);
      setLocalSettings(updatedSettings);
    }
  };

  const resetDefaults = async () => {
    setConfirmConfig({
      isOpen: true,
      message: "Tem certeza que deseja restaurar todas as configurações para o padrão?",
      onConfirm: async () => {
        await window.api.resetSettings();
        const s = await window.api.getSettings();
        setSettings(s);
        setLocalSettings(s);
        setConfirmConfig({ isOpen: false, message: '', onConfirm: null });
      },
      onCancel: () => setConfirmConfig({ isOpen: false, message: '', onConfirm: null })
    });
  };

  const handleResetTab = async (tabName) => {
    setConfirmConfig({
      isOpen: true,
      message: "Tem certeza que deseja restaurar as configurações desta aba para o padrão?",
      onConfirm: async () => {
        await window.api.resetSettingsTab(tabName);
        const s = await window.api.getSettings();
        setSettings(s);
        setLocalSettings(s);
        setConfirmConfig({ isOpen: false, message: '', onConfirm: null });
      },
      onCancel: () => setConfirmConfig({ isOpen: false, message: '', onConfirm: null })
    });
  };

  return (
    <div className="standalone-window">
      <div className="window-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="./logo-icon.png" alt="Logo" style={{ height: '18px', marginRight: '8px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Configurações</span>
        </div>
        <button className="close-btn" onClick={close}><X size={18} /></button>
      </div>

      <div className="window-content" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* TAB HEADER */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'geral' ? 'active' : ''}`}
            onClick={() => setActiveTab('geral')}
          ><SettingsIcon size={14} /> Geral</button>
          
          <button 
            className={`tab ${activeTab === 'aparencia' ? 'active' : ''}`}
            onClick={() => setActiveTab('aparencia')}
          ><Palette size={14} /> Aparência</button>

          <button 
            className={`tab ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => setActiveTab('audio')}
          ><Volume2 size={14} /> Áudio</button>

          <button 
            className={`tab ${activeTab === 'posicao' ? 'active' : ''}`}
            onClick={() => setActiveTab('posicao')}
          ><Move size={14} /> Posicionamento</button>

          <button 
            className={`tab ${activeTab === 'sobre' ? 'active' : ''}`}
            onClick={() => setActiveTab('sobre')}
          ><Info size={14} /> Sobre</button>
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
                    <div className="setting-item" style={{ marginBottom: 0 }}>
                      <span>Descanso (min)</span>
                      <input type="number" className="form-control" style={{ width: '70px', padding: '4px' }} 
                             value={localSettings.pomodoroBreak || '5'} 
                             onChange={(e) => updateLocalSetting('pomodoroBreak', e.target.value)} />
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
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                <button className="btn-secondary" onClick={() => handleResetTab('geral')} style={{ color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <RotateCcw size={14} /> Restaurar Padrões Gerais
                </button>
              </div>
            </div>
          )}

          {/* ABA APARÊNCIA */}
          {activeTab === 'aparencia' && (
            <div>
              
              <div className="setting-item">
                <span>Tema</span>
                <div className="segmented-control">
                  <button 
                    className={`segmented-btn ${localSettings.theme === 'claro' ? 'active' : ''}`}
                    onClick={() => {
                      const updated = { ...localSettings, theme: 'claro' };
                      setLocalSettings(updated);
                      window.api?.previewAppearance(updated);
                    }}
                  >Claro</button>
                  <button 
                    className={`segmented-btn ${localSettings.theme !== 'claro' ? 'active' : ''}`}
                    onClick={() => {
                      const updated = { ...localSettings, theme: 'escuro' };
                      setLocalSettings(updated);
                      window.api?.previewAppearance(updated);
                    }}
                  >Escuro</button>
                </div>
              </div>

              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ marginBottom: '15px' }}>Cor de Destaque</span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['#5c85ff', '#ff5c5c', '#5cff85', '#ffb85c', '#bd5cff'].map(color => {
                    const isActive = localSettings.themeColor === color || (!localSettings.themeColor && color === '#5c85ff');
                    return (
                      <div 
                        key={color}
                        onClick={() => {
                          const updated = { ...localSettings, themeColor: color };
                          setLocalSettings(updated);
                          window.api?.previewAppearance(updated);
                        }}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: color,
                          cursor: 'pointer',
                          border: isActive ? '2px solid var(--bg-card)' : '2px solid transparent',
                          boxShadow: isActive ? `0 0 0 2px ${color}` : '0 2px 5px rgba(0,0,0,0.2)',
                          transition: 'all 0.2s ease',
                          transform: isActive ? 'scale(1.1)' : 'scale(1)'
                        }}
                      />
                    );
                  })}
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
                  onChange={(e) => {
                    const updated = { ...localSettings, opacity: e.target.value };
                    setLocalSettings(updated);
                    window.api?.previewAppearance(updated);
                  }}
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
                  onChange={(e) => {
                    const updated = { ...localSettings, expandedOpacity: e.target.value };
                    setLocalSettings(updated);
                    window.api?.previewAppearance(updated);
                  }}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                <button className="btn-secondary" onClick={() => handleResetTab('aparencia')} style={{ color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <RotateCcw size={14} /> Restaurar Padrões de Aparência
                </button>
              </div>
            </div>
          )}

          {/* ABA POSICIONAMENTO */}
          {activeTab === 'posicao' && (
            <div>
              <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid var(--border)' }}>
                <h4 style={{ marginBottom: '15px', color: 'var(--primary)' }}>Dashboard Principal</h4>
                <div className="setting-item">
                  <span>Posição Lateral do App</span>
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
                
                <div className="setting-item" style={{ borderBottom: 'none' }}>
                  <span>Tempo para Ocultar (ms)</span>
                  <input 
                    type="number" 
                    className="form-control" 
                    style={{ width: '80px', padding: '4px 8px', textAlign: 'right' }} 
                    value={localSettings.delay || 1000}
                    onChange={(e) => updateLocalSetting('delay', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: '15px', color: 'var(--primary)' }}>Popups (Lembretes e Pomodoro)</h4>
                <div className="setting-item" style={{ borderBottom: 'none', marginBottom: '10px' }}>
                  <span style={{ flex: 1, marginRight: '15px' }}>Ajustar Posição na Tela</span>
                  <button 
                    className="btn-primary" 
                    onClick={() => window.api?.startPopupPositioner()}
                    style={{ width: 'auto', padding: '6px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Move size={16} /> Ajustar Posição
                  </button>
                </div>
                
                <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
                  <span style={{ marginBottom: '10px', fontSize: '0.85rem', fontWeight: 'bold' }}>Testar Popups (Padronizados)</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid var(--border)' }}>
                    <button className="btn-secondary" onClick={() => window.api?.showPopup({ type: 'reminder', id: `test-rem-${Date.now()}`, autoClose: 5000, data: { id: 'test', title: 'Lembrete de Teste', datetime: new Date().toISOString() } })}>Lembrete</button>
                    <button className="btn-secondary" onClick={() => window.api?.showPopup({ type: 'pomodoro', id: `test-pomo-focus-${Date.now()}`, autoClose: 5000, title: 'Iniciando Foco', status: 'focus' })}>Pomo: Foco</button>
                    <button className="btn-secondary" onClick={() => window.api?.showPopup({ type: 'pomodoro', id: `test-pomo-break-${Date.now()}`, autoClose: 5000, title: 'Iniciando Descanso', status: 'break' })}>Pomo: Descanso</button>
                    <button className="btn-secondary" onClick={() => window.api?.showPopup({ type: 'pomodoro', id: `test-pomo-idle-${Date.now()}`, autoClose: 5000, title: 'Descanso Finalizado', status: 'idle' })}>Pomo: Finalizado</button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontSize: '0.85rem' }}>Distância no empilhamento (px)</span>
                    <input 
                      type="number" 
                      min="0"
                      max="100"
                      className="form-control"
                      style={{ width: '60px', padding: '4px', textAlign: 'center' }}
                      value={localSettings.popupGap !== undefined ? localSettings.popupGap : 4}
                      onChange={(e) => setLocalSettings({...localSettings, popupGap: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                <button className="btn-secondary" onClick={() => handleResetTab('posicao')} style={{ color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <RotateCcw size={14} /> Restaurar Padrões de Posicionamento
                </button>
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
                  <span>Tipo de Som (Lembretes)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => {
                        const vol = localSettings.soundVolume ? parseInt(localSettings.soundVolume) / 100 : 0.8;
                        const type = localSettings.soundType || 'duplo';
                        playNotificationSound(vol, type);
                      }}
                      title="Testar Som"
                    >
                      <Volume2 size={14} />
                    </button>
                    <select 
                      className="form-control"
                      style={{ width: '120px', padding: '4px 8px' }}
                      value={localSettings.soundType || 'duplo'}
                      onChange={(e) => updateLocalSetting('soundType', e.target.value)}
                    >
                      <option value="bolha">Bolha Pop</option>
                      <option value="marimba">Marimba</option>
                      <option value="sino">Sino</option>
                      <option value="duplo">Toque Duplo</option>
                      <option value="suave">Toque Suave</option>
                    </select>
                  </div>
                </div>

                <div className="setting-item">
                  <span>Som de Alarme (Pomodoro)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => {
                        const vol = localSettings.soundVolume ? parseInt(localSettings.soundVolume) / 100 : 0.8;
                        const type = localSettings.pomodoroSound || 'duplo';
                        playNotificationSound(vol, type);
                      }}
                      title="Testar Som"
                    >
                      <Volume2 size={14} />
                    </button>
                    <select 
                      className="form-control"
                      style={{ width: '120px', padding: '4px 8px' }}
                      value={localSettings.pomodoroSound || 'duplo'}
                      onChange={(e) => updateLocalSetting('pomodoroSound', e.target.value)}
                    >
                      <option value="bolha">Bolha Pop</option>
                      <option value="marimba">Marimba</option>
                      <option value="sino">Sino</option>
                      <option value="duplo">Toque Duplo</option>
                      <option value="suave">Toque Suave</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                <button className="btn-secondary" onClick={() => handleResetTab('audio')} style={{ color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <RotateCcw size={14} /> Restaurar Padrões de Áudio
                </button>
              </div>
            </div>
          )}

          {/* ABA SOBRE */}
          {activeTab === 'sobre' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '10px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <img 
                  src="./logo-desk.png" 
                  alt="DeskWidget Logo" 
                  style={{ height: '56px', width: 'auto', objectFit: 'contain', marginBottom: '8px' }}
                  onError={(e) => {
                    e.target.src = './logo-desk-light.png';
                  }}
                />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>DeskWidget</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Versão {CURRENT_VERSION}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Desenvolvido por <strong style={{ color: 'var(--text-main)' }}>CoutoApps</strong></span>
              </div>

              <div className="settings-section" style={{ width: '100%', borderBottom: 'none', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginTop: '10px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={14} className={updateStatus === 'checking' ? 'spin' : ''} style={{ animation: updateStatus === 'checking' ? 'spin 1s linear infinite' : 'none' }} />
                  <span>ATUALIZAÇÃO DE SOFTWARE</span>
                </h3>
                
                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {updateStatus === 'checking' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                      <span>Verificando novas versões...</span>
                    </div>
                  )}

                  {updateStatus === 'upToDate' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--success)' }}>✓ O DeskWidget está atualizado!</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Você já está utilizando a versão mais recente.</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', marginTop: '8px', alignSelf: 'flex-start' }} onClick={checkUpdates}>
                          Verificar novamente
                        </button>
                      </div>
                    </div>
                  )}

                  {updateStatus === 'available' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>⚡ Nova versão disponível: v{updateVersion}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        Uma nova versão cheia de melhorias foi encontrada no GitHub Releases. Clique no botão abaixo para baixar e instalar silenciosamente em segundo plano.
                      </span>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                        <button className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.78rem' }} onClick={startUpdate}>
                          Atualizar agora
                        </button>
                        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.78rem' }} onClick={checkUpdates}>
                          Verificar novamente
                        </button>
                      </div>
                    </div>
                  )}

                  {updateStatus === 'downloading' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Baixando atualização: {downloadPercent}%</span>
                      <div className="update-progress-bar-container" style={{ margin: 0, height: '4px' }}>
                        <div className="update-progress-bar-fill" style={{ width: `${downloadPercent}%` }} />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        O instalador está sendo baixado em segundo plano de forma silenciosa. Por favor, aguarde.
                      </span>
                    </div>
                  )}

                  {updateStatus === 'readyToRestart' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--success)' }}>Pronto para reiniciar!</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        A atualização foi baixada e está pronta. O aplicativo reiniciará automaticamente para aplicar.
                      </span>
                    </div>
                  )}

                  {updateStatus === 'error' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--danger)' }}>⚠️ Falha ao verificar atualizações</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Não foi possível conectar ao servidor do GitHub. Verifique sua conexão com a internet.
                      </span>
                      <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', marginTop: '8px', alignSelf: 'flex-start' }} onClick={checkUpdates}>
                        Tentar novamente
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

        </div>
      </div>

      <div className="window-footer">
        <button className="btn-secondary" onClick={resetDefaults} style={{ marginRight: 'auto', color: 'var(--danger)' }}>Redefinir Padrões</button>
        <button className="btn-secondary" onClick={close}>Cancelar</button>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={handleSave}>Salvar</button>
      </div>
      <CustomConfirm
        isOpen={confirmConfig.isOpen}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={confirmConfig.onCancel}
      />
    </div>
  );
}

export default Settings;
