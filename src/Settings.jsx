import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Palette, Cpu, Volume2, RotateCcw, Move, Info, RefreshCw, Cloud, Copy, Check, Sparkles, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { playNotificationSound } from './utils/audio.js';
import CustomConfirm from './components/CustomConfirm';

function Settings() {
  const [settings, setSettings] = useState({});
  const [localSettings, setLocalSettings] = useState({});
  const [activeTab, setActiveTab] = useState('geral');
  const [isLicensed, setIsLicensed] = useState(true);
  
  // Estado para CustomConfirm
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, message: '', onConfirm: null, title: 'CONFIRMAÇÃO', isAlert: false });

  const showAlert = (message, title = 'AVISO') => {
    setConfirmConfig({
      isOpen: true,
      message,
      title,
      isAlert: true,
      onConfirm: () => setConfirmConfig({ isOpen: false, message: '', onConfirm: null, title: 'CONFIRMAÇÃO', isAlert: false }),
      onCancel: null
    });
  };

  // Estados para Nuvem Sync
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  const handleSyncNow = async () => {
    if (!isLicensed) {
      showAlert("⭐ DeskWidget Pro: A sincronização e backup em nuvem automática entre múltiplos computadores é exclusiva da versão Pro. Faça o upgrade agora!");
      if (window.api?.openPaywall) {
        await window.api.openPaywall();
      }
      window.location.hash = '#/paywall';
      return;
    }

    setSyncing(true);
    setSyncStatus(null);
    setSyncError(null);
    try {
      // Salva as credenciais modificadas antes de sincronizar
      await handleSave();
      
      // Executa a sincronização para a nuvem
      await window.api.syncToCloud();
      // Em seguida, puxa as atualizações da nuvem
      await window.api.syncFromCloud();
      
      setSyncStatus('success');
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      setSyncError(err || 'Erro desconhecido ao sincronizar.');
    } finally {
      setSyncing(false);
    }
  };

  // Estados do Feedback Modal (Telegram)
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, type: 'bug' });
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  // Estados do Updater na aba Sobre
  const CURRENT_VERSION = '1.2.3.4';
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
      let appName = 'DeskWidget';
      let appVersion = CURRENT_VERSION;
      let isBeta = false;
      
      if (window.api?.getAppVersionInfo) {
        try {
          const info = await window.api.getAppVersionInfo();
          appName = info.name;
          appVersion = info.version;
          isBeta = info.is_beta;
        } catch (e) {
          console.error("Erro ao obter versão do app do Rust:", e);
        }
      }

      let latestVer = '';
      let downloadUrl = '';
      let releaseData = null;

      if (isBeta) {
        const response = await fetch('https://api.github.com/repos/joaovictorcouto/deskwidget/releases');
        if (response.status === 404) {
          setUpdateStatus('upToDate');
          return;
        }
        if (!response.ok) throw new Error('Não foi possível conectar');
        const releases = await response.json();
        if (!releases || releases.length === 0) {
          setUpdateStatus('upToDate');
          return;
        }
        const betaRelease = releases.find(r => r.prerelease === true);
        if (!betaRelease) {
          setUpdateStatus('upToDate');
          return;
        }
        releaseData = betaRelease;
        latestVer = betaRelease.tag_name.replace('v', '');
      } else {
        const response = await fetch('https://api.github.com/repos/joaovictorcouto/deskwidget/releases/latest');
        if (response.status === 404) {
          setUpdateStatus('upToDate');
          return;
        }
        if (!response.ok) throw new Error('Não foi possível conectar');
        releaseData = await response.json();
        latestVer = releaseData.tag_name.replace('v', '');
      }
      
      const compare = compareVersions(latestVer, appVersion);
      if (compare > 0) {
        setUpdateVersion(latestVer);
        setUpdateStatus('available');
        const exeAsset = releaseData.assets.find(asset => asset.name.endsWith('.exe') || asset.name.includes('setup'));
        if (exeAsset) {
          setUpdateUrl(exeAsset.browser_download_url);
        } else {
          setUpdateUrl(releaseData.assets[0]?.browser_download_url || releaseData.html_url);
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
        
        if (s && s.license_key && window.api.verifyLicense) {
          try {
            const isValid = await window.api.verifyLicense(s.license_key);
            setIsLicensed(isValid);
          } catch(e) {
            setIsLicensed(false);
          }
        }
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

  const handleModulesDragEnd = (result) => {
    if (!result.destination) return;
    const defaultOrder = ['tasks', 'reminders', 'pomodoro', 'notes'];
    let modules = (localSettings.modulesOrder || '').split(',').filter(Boolean).filter(m => m !== 'media');
    defaultOrder.forEach(mod => {
      if (!modules.includes(mod)) {
        modules.push(mod);
      }
    });
    const reordered = Array.from(modules);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    updateLocalSetting('modulesOrder', reordered.join(','));
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

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) {
      setFeedbackError('Por favor, digite uma mensagem.');
      return;
    }
    setFeedbackSending(true);
    setFeedbackError('');
    try {
      if (window.api?.sendFeedback) {
        await window.api.sendFeedback(feedbackModal.type, feedbackMessage);
        setFeedbackSuccess(true);
        setTimeout(() => {
          setFeedbackModal({ isOpen: false, type: 'bug' });
          setFeedbackMessage('');
          setFeedbackSuccess(false);
        }, 1500);
      } else {
        throw new Error('API do aplicativo indisponível.');
      }
    } catch (err) {
      console.error(err);
      setFeedbackError(err.message || 'Erro ao enviar. Tente novamente.');
    } finally {
      setFeedbackSending(false);
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
            className={`tab ${activeTab === 'ajuda' ? 'active' : ''}`}
            onClick={() => setActiveTab('ajuda')}
          ><Info size={14} /> Ajuda</button>

          <button 
            className={`tab ${activeTab === 'sobre' ? 'active' : ''}`}
            onClick={() => setActiveTab('sobre')}
          ><Info size={14} /> Sobre</button>


        </div>

        {/* TAB CONTENT */}
        <div style={{ padding: '15px 20px', overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>
          
          {/* ABA GERAL */}
          {activeTab === 'geral' && (
            <div>
              <div className="settings-section">
                <h3 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Módulos</h3>
                
                <div className="setting-item">
                  <span>Pomodoro Timer</span>
                  <div 
                    className={`toggle-switch ${localSettings.enablePomodoro === 'true' ? 'on' : ''}`}
                    onClick={() => {
                      const isTurningOff = localSettings.enablePomodoro === 'true';
                      const activeCount = 
                        (isTurningOff ? 0 : 1) +
                        (localSettings.enableTasks !== 'false' ? 1 : 0) +
                        (localSettings.enableReminders !== 'false' ? 1 : 0) +
                        (localSettings.enableNotes === 'true' ? 1 : 0) +
                        (localSettings.enableMediaControl !== 'false' ? 1 : 0);
                      if (isTurningOff && activeCount === 0) {
                        showAlert("Mantenha pelo menos um recurso ativo!");
                        return;
                      }
                      updateLocalSetting('enablePomodoro', localSettings.enablePomodoro === 'true' ? 'false' : 'true');
                    }}
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
                      const isTurningOff = localSettings.enableTasks !== 'false';
                      const activeCount = 
                        (localSettings.enablePomodoro === 'true' ? 1 : 0) +
                        (isTurningOff ? 0 : 1) +
                        (localSettings.enableReminders !== 'false' ? 1 : 0) +
                        (localSettings.enableNotes === 'true' ? 1 : 0) +
                        (localSettings.enableMediaControl !== 'false' ? 1 : 0);
                      if (isTurningOff && activeCount === 0) {
                        showAlert("Mantenha pelo menos um recurso ativo!");
                        return;
                      }
                      
                      const newTasksVal = isTurningOff ? 'false' : 'true';
                      const updated = {
                        ...localSettings,
                        enableTasks: newTasksVal
                      };
                      if (isTurningOff) {
                        updated._prevProgressBarState = localSettings.enableProgressBar;
                        updated.enableProgressBar = 'false';
                      } else {
                        updated.enableProgressBar = localSettings._prevProgressBarState || 'true';
                      }
                      setLocalSettings(updated);
                    }}
                  >
                    <div className="toggle-thumb"></div>
                  </div>
                </div>
                <div style={{ 
                  marginLeft: '15px', 
                  paddingLeft: '15px', 
                  borderLeft: '2px solid var(--border)', 
                  marginBottom: '15px',
                  opacity: localSettings.enableTasks === 'false' ? 0.5 : 1,
                  pointerEvents: localSettings.enableTasks === 'false' ? 'none' : 'auto'
                }}>
                  <div className="setting-item" style={{ marginBottom: 0 }}>
                    <span>Barra de Progresso Diária</span>
                    <div 
                      className={`toggle-switch ${localSettings.enableProgressBar === 'true' ? 'on' : ''}`}
                      onClick={() => {
                        if (localSettings.enableTasks === 'false') return;
                        updateLocalSetting('enableProgressBar', localSettings.enableProgressBar === 'true' ? 'false' : 'true');
                      }}
                    />
                  </div>
                </div>

                <div className="setting-item">
                  <span>Agendador de Lembretes</span>
                  <div 
                    className={`toggle-switch ${localSettings.enableReminders !== 'false' ? 'on' : ''}`}
                    onClick={() => {
                      const isTurningOff = localSettings.enableReminders !== 'false';
                      const activeCount = 
                        (localSettings.enablePomodoro === 'true' ? 1 : 0) +
                        (localSettings.enableTasks !== 'false' ? 1 : 0) +
                        (isTurningOff ? 0 : 1) +
                        (localSettings.enableNotes === 'true' ? 1 : 0) +
                        (localSettings.enableMediaControl !== 'false' ? 1 : 0);
                      if (isTurningOff && activeCount === 0) {
                        showAlert("Mantenha pelo menos um recurso ativo!");
                        return;
                      }
                      setLocalSettings({...localSettings, enableReminders: isTurningOff ? 'false' : 'true'});
                    }}
                  >
                    <div className="toggle-thumb"></div>
                  </div>
                </div>

                <div className="setting-item">
                  <span>Notas Rápidas</span>
                  <div 
                    className={`toggle-switch ${localSettings.enableNotes === 'true' ? 'on' : ''}`}
                    onClick={() => {
                      const isTurningOff = localSettings.enableNotes === 'true';
                      const activeCount = 
                        (localSettings.enablePomodoro === 'true' ? 1 : 0) +
                        (localSettings.enableTasks !== 'false' ? 1 : 0) +
                        (localSettings.enableReminders !== 'false' ? 1 : 0) +
                        (isTurningOff ? 0 : 1) +
                        (localSettings.enableMediaControl !== 'false' ? 1 : 0);
                      if (isTurningOff && activeCount === 0) {
                        showAlert("Mantenha pelo menos um recurso ativo!");
                        return;
                      }
                      updateLocalSetting('enableNotes', localSettings.enableNotes === 'true' ? 'false' : 'true');
                    }}
                  />
                </div>
                <div className="setting-item">
                  <span>Controle de Mídia</span>
                  <div 
                    className={`toggle-switch ${localSettings.enableMediaControl !== 'false' ? 'on' : ''}`}
                    onClick={() => {
                      const isTurningOff = localSettings.enableMediaControl !== 'false';
                      const activeCount = 
                        (localSettings.enablePomodoro === 'true' ? 1 : 0) +
                        (localSettings.enableTasks !== 'false' ? 1 : 0) +
                        (localSettings.enableReminders !== 'false' ? 1 : 0) +
                        (localSettings.enableNotes === 'true' ? 1 : 0) +
                        (isTurningOff ? 0 : 1);
                      if (isTurningOff && activeCount === 0) {
                        showAlert("Mantenha pelo menos um recurso ativo!");
                        return;
                      }
                      updateLocalSetting('enableMediaControl', localSettings.enableMediaControl === 'false' ? 'true' : 'false');
                    }}
                  />
                </div>
                {localSettings.enableMediaControl !== 'false' && (
                  <div style={{ marginLeft: '15px', paddingLeft: '15px', borderLeft: '2px solid var(--border)', marginBottom: '15px' }}>
                    <div className="setting-item" style={{ marginBottom: 0 }}>
                      <span>Posição no Painel</span>
                      <select 
                        className="form-control" 
                        style={{ width: '130px', padding: '4px 8px', fontSize: '0.78rem', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px' }}
                        value={localSettings.mediaPosition === 'top' ? 'top' : 'bottom'}
                        onChange={(e) => updateLocalSetting('mediaPosition', e.target.value)}
                      >
                        <option value="top">Topo</option>
                        <option value="bottom">Base</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* REORDENAÇÃO DE MÓDULOS POR DRAG AND DROP */}
              <div className="settings-section">
                <h3 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Ordem dos Módulos do Painel</h3>
                <DragDropContext onDragEnd={handleModulesDragEnd}>
                  <Droppable droppableId="settingsModules">
                    {(provided) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef} 
                        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                      >
                        {(() => {
                          const defaultOrder = ['tasks', 'reminders', 'pomodoro', 'notes'];
                          let modules = (localSettings.modulesOrder || '').split(',').filter(Boolean).filter(m => m !== 'media');
                          defaultOrder.forEach(mod => {
                            if (!modules.includes(mod)) {
                              modules.push(mod);
                            }
                          });
                          const labelMap = {
                            tasks: '📋 Lista de Tarefas',
                            reminders: '🔔 Agendador de Lembretes',
                            pomodoro: '🍅 Pomodoro Timer',
                            notes: '📝 Notas Rápidas',
                            media: '🎵 Controle de Mídia'
                          };
                          return modules.map((modKey, idx) => (
                            <Draggable key={modKey} draggableId={modKey} index={idx}>
                              {(provided) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  style={{ 
                                    ...provided.draggableProps.style,
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px',
                                    backgroundColor: 'var(--bg-card)', 
                                    border: '1px solid var(--border)', 
                                    padding: '8px 12px', 
                                    borderRadius: '6px', 
                                    fontSize: '0.8rem' 
                                  }}
                                >
                                  <div {...provided.dragHandleProps} style={{ cursor: 'grab', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                                    <GripVertical size={14} />
                                  </div>
                                  <span style={{ flex: 1 }}>{labelMap[modKey] || modKey}</span>
                                </div>
                              )}
                            </Draggable>
                          ));
                        })()}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
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
                        onClick={async () => {
                          if (color !== '#5c85ff' && !isLicensed) {
                            showAlert("⭐ DeskWidget Pro: A personalização de cores de destaque é exclusiva da versão Pro. Faça o upgrade para personalizar totalmente o visual do seu widget!");
                            if (window.api?.openPaywall) {
                              await window.api.openPaywall();
                            }
                            window.location.hash = '#/paywall';
                            return;
                          }
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

          {/* ABA AJUDA (TUTORIAL DIDÁTICO E BONITO) */}
          {activeTab === 'ajuda' && (
            <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Cabeçalho */}
              <div style={{ 
                backgroundColor: 'var(--bg-card)', 
                border: '1px solid var(--border)', 
                borderRadius: '12px', 
                padding: '24px', 
                marginBottom: '10px',
                background: 'linear-gradient(135deg, rgba(92, 133, 255, 0.08) 0%, transparent 100%)'
              }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px' }}>
                  <Sparkles size={20} />
                  <span>Manual Completo do DeskWidget</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                  Bem-vindo ao guia completo! Aqui você encontra explicações detalhadas de cada funcionalidade do DeskWidget, com passo a passo e dicas para aproveitar ao máximo o seu painel de produtividade.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* 1. Visão Geral */}
                <div style={{ padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--primary)' }}>🖥️ Visão Geral do DeskWidget</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>
                    O DeskWidget é um painel de produtividade que fica ancorado na lateral da sua tela (esquerda ou direita). Ele funciona como um dock inteligente: quando você passa o mouse sobre a borda da tela, o painel se expande revelando todos os seus módulos. Ao mover o mouse para fora, ele se recolhe automaticamente, sem atrapalhar o seu trabalho.
                  </p>
                  <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: '20px', lineHeight: 1.6 }}>
                    <li>O painel reúne timer Pomodoro, lista de tarefas, lembretes, notas rápidas e controle de mídia em um só lugar.</li>
                    <li>Todos os dados são salvos localmente no seu computador — suas tarefas e configurações persistem entre reinicializações.</li>
                    <li>Você pode personalizar quais módulos ficam visíveis, a ordem deles, o tema (claro/escuro), a cor de destaque e a opacidade do painel.</li>
                  </ul>
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '8px', fontStyle: 'italic' }}>
                    💡 Dica: Use a aba "Posicionamento" nas configurações para escolher se o painel fica à esquerda ou à direita da tela e ajustar o tempo de ocultação.
                  </p>
                </div>

                {/* 2. Pomodoro Timer */}
                <div style={{ padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--success)' }}>🍅 Pomodoro Timer</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>
                    O Pomodoro é uma técnica de produtividade que alterna períodos de foco intenso com pausas curtas. O DeskWidget oferece um timer completo com presets personalizáveis.
                  </p>
                  <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: '20px', lineHeight: 1.6 }}>
                    <li><strong>Ajustar tempos:</strong> Com o timer parado, clique diretamente no número de minutos exibido no painel para editar o valor. Você também pode usar os botões <strong>[ - ]</strong> e <strong>[ + ]</strong> ao lado do contador para ajustes rápidos.</li>
                    <li><strong>Iniciar/Pausar:</strong> Clique no botão central de play para iniciar o foco. Durante a contagem, você pode pausar a qualquer momento clicando novamente.</li>
                    <li><strong>Ciclo automático:</strong> Quando o tempo de foco acaba, um popup de notificação aparece e o timer muda automaticamente para o modo descanso. Após o descanso, ele retorna ao modo foco.</li>
                    <li><strong>Presets de tempo:</strong> Clique no ícone de relógio (⏱️) no canto superior direito do módulo para abrir o gerenciador de presets.</li>
                    <li><strong>Criar preset:</strong> No gerenciador, defina um nome (ex: "Estudo Intenso") e os minutos de foco desejados, depois salve.</li>
                    <li><strong>Aplicar preset:</strong> Clique em qualquer preset salvo na lista para aplicar instantaneamente os tempos de foco e descanso.</li>
                    <li><strong>Editar/Excluir preset:</strong> Use os ícones de lápis e lixeira ao lado de cada preset para renomear, alterar valores ou remover.</li>
                  </ul>
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '8px', fontStyle: 'italic' }}>
                    💡 Dica: Os tempos padrão de foco e descanso podem ser configurados na aba Geral → Módulos → Pomodoro Timer.
                  </p>
                </div>

                {/* 3. Lista de Tarefas */}
                <div style={{ padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: '#ffb84d' }}>📋 Lista de Tarefas</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>
                    Gerencie suas atividades diárias com uma lista de tarefas completa, com suporte a etiquetas coloridas, reordenação por arrastar e barra de progresso visual.
                  </p>
                  <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: '20px', lineHeight: 1.6 }}>
                    <li><strong>Adicionar tarefa:</strong> Digite o texto no campo de entrada na parte inferior do módulo e pressione Enter ou clique no botão de adicionar.</li>
                    <li><strong>Completar tarefa:</strong> Clique no círculo/checkbox à esquerda da tarefa para marcá-la como concluída. Tarefas concluídas ficam riscadas e vão para o final da lista.</li>
                    <li><strong>Editar tarefa:</strong> Dê um duplo clique no texto de uma tarefa para entrar no modo de edição. Altere o texto e pressione Enter para salvar.</li>
                    <li><strong>Excluir tarefa:</strong> Passe o mouse sobre a tarefa e clique no ícone de lixeira que aparece à direita.</li>
                    <li><strong>Reordenar tarefas:</strong> Com o modo de ordenação em "Personalizada (Drag)", segure a barra de aderência (≡) no lado esquerdo de cada tarefa e arraste para cima ou para baixo.</li>
                    <li><strong>Atribuir tags:</strong> Passe o mouse sobre a tarefa e clique no ícone de etiqueta (🏷️). Um menu aparece onde você pode selecionar tags existentes ou criar novas.</li>
                    <li><strong>Filtrar por tags:</strong> Use o seletor de ordenação e escolha "Organizar por Etiquetas" para agrupar as tarefas visualmente por suas tags.</li>
                    <li><strong>Barra de Progresso Diária:</strong> Quando ativada (subordinada à Lista de Tarefas), exibe uma barra visual no topo mostrando a porcentagem de tarefas concluídas no dia. Ajuda a manter a motivação!</li>
                  </ul>
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '8px', fontStyle: 'italic' }}>
                    💡 Dica: A Barra de Progresso Diária só pode ser ativada quando a Lista de Tarefas está habilitada. Se desativar as tarefas, a barra também será desativada automaticamente.
                  </p>
                </div>

                {/* 4. Agendador de Lembretes */}
                <div style={{ padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: '#5caaff' }}>🔔 Agendador de Lembretes</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>
                    Nunca mais esqueça compromissos ou atividades importantes. Crie lembretes com data, hora e recorrência opcional.
                  </p>
                  <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: '20px', lineHeight: 1.6 }}>
                    <li><strong>Criar lembrete:</strong> Clique no botão de adicionar (+) no módulo de lembretes. Defina um título, a data e a hora desejada.</li>
                    <li><strong>Recorrência:</strong> Ao criar ou editar um lembrete, você pode configurá-lo como recorrente (diário, semanal, etc.) para que ele dispare automaticamente no intervalo definido.</li>
                    <li><strong>Quando dispara:</strong> No horário programado, um popup de notificação aparece na tela (com som, se ativado na aba Áudio) avisando sobre o lembrete. O popup permanece visível até você dispensá-lo.</li>
                    <li><strong>Pausar/Cancelar:</strong> Na lista de lembretes ativos, você pode pausar um lembrete temporariamente ou excluí-lo completamente clicando nos ícones correspondentes.</li>
                    <li><strong>Editar lembrete:</strong> Clique no lembrete existente para abrir o editor e ajustar título, data, hora ou recorrência.</li>
                  </ul>
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '8px', fontStyle: 'italic' }}>
                    💡 Dica: Você pode personalizar o som de notificação dos lembretes na aba "Áudio" das configurações, escolhendo entre Bolha Pop, Marimba, Sino, Toque Duplo ou Toque Suave.
                  </p>
                </div>

                {/* 5. Notas Rápidas */}
                <div style={{ padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: '#66d9a0' }}>📝 Notas Rápidas</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>
                    Um bloco de notas simples e sempre acessível para anotar ideias, lembretes rápidos ou qualquer informação que você precise ter à mão.
                  </p>
                  <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: '20px', lineHeight: 1.6 }}>
                    <li><strong>Salvamento automático:</strong> Tudo que você digita é salvo automaticamente. Não precisa clicar em nenhum botão — ao fechar e reabrir o painel, suas notas estarão lá.</li>
                    <li><strong>Uso ideal:</strong> Perfeito para anotar links, números de telefone, ideias rápidas durante o trabalho, listas de compras ou qualquer coisa que precise guardar temporariamente.</li>
                    <li><strong>Sem formatação:</strong> As notas são em texto puro, priorizando velocidade e simplicidade. Basta clicar e digitar.</li>
                  </ul>
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '8px', fontStyle: 'italic' }}>
                    💡 Dica: Use as Notas Rápidas como um "rascunho mental" durante sessões de Pomodoro — anote distrações que surgem para resolver depois, sem perder o foco.
                  </p>
                </div>

                {/* 6. Controle de Mídia */}
                <div style={{ padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: '#a78bfa' }}>🎵 Controle de Mídia</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>
                    Controle a mídia que está tocando no seu computador diretamente pelo painel do DeskWidget, sem precisar trocar de janela.
                  </p>
                  <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: '20px', lineHeight: 1.6 }}>
                    <li><strong>Integração com Windows:</strong> O DeskWidget detecta automaticamente a mídia em reprodução no sistema operacional usando a API nativa do Windows (SMTC).</li>
                    <li><strong>Players suportados:</strong> Funciona com Spotify, YouTube (Chrome/Edge), Windows Media Player, VLC, e qualquer aplicativo que use o sistema de transporte de mídia do Windows.</li>
                    <li><strong>Informações exibidas:</strong> Mostra dinamicamente o título da faixa e o artista/canal em reprodução.</li>
                    <li><strong>Botões disponíveis:</strong> Play/Pause (⏯), Faixa Anterior (⏮), Próxima Faixa (⏭) e Mutar/Desmutar volume do sistema (🔇).</li>
                    <li><strong>Posição no painel:</strong> Nas configurações, você pode escolher se o módulo segue a ordem normal, fica fixo no topo (abaixo do cabeçalho) ou fixo na parte inferior (acima do rodapé).</li>
                  </ul>
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '8px', fontStyle: 'italic' }}>
                    💡 Dica: Se nenhuma mídia estiver tocando, o módulo exibirá uma mensagem indicando que não há reprodução ativa. Basta iniciar uma música em qualquer player para ele detectar.
                  </p>
                </div>

                {/* 7. Divisórias e Redimensionamento */}
                <div style={{ padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--primary)' }}>↔️ Divisórias e Redimensionamento</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>
                    O painel do DeskWidget permite que você ajuste o tamanho de cada módulo arrastando as divisórias entre eles.
                  </p>
                  <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: '20px', lineHeight: 1.6 }}>
                    <li><strong>Identificar divisórias:</strong> Passe o cursor sobre a linha fina que separa dois módulos. O cursor mudará para uma seta dupla vertical (↕), indicando que é arrastável.</li>
                    <li><strong>Redimensionar:</strong> Clique e arraste a divisória para cima ou para baixo. O módulo acima ficará menor/maior e o de baixo se ajustará proporcionalmente.</li>
                    <li><strong>Altura mínima:</strong> Cada módulo possui uma altura mínima de segurança. Isso garante que botões, textos e controles nunca fiquem espremidos ou inacessíveis, mesmo que você arraste ao máximo.</li>
                    <li><strong>Persistência:</strong> As proporções ajustadas são salvas automaticamente e mantidas entre reinicializações do aplicativo.</li>
                  </ul>
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '8px', fontStyle: 'italic' }}>
                    💡 Dica: Se quiser dar mais espaço para a Lista de Tarefas e menos para o Pomodoro, basta arrastar a divisória entre eles para cima.
                  </p>
                </div>

                {/* 8. Configurações */}
                <div style={{ padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: '#8b8b8b' }}>⚙️ Configurações</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>
                    A janela de configurações permite personalizar todos os aspectos do DeskWidget.
                  </p>
                  <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: '20px', lineHeight: 1.6 }}>
                    <li><strong>Ativar/Desativar módulos:</strong> Na aba "Geral", use os toggles para ligar ou desligar cada módulo individualmente. Pelo menos um módulo deve estar sempre ativo.</li>
                    <li><strong>Reordenar módulos:</strong> Na seção "Ordem dos Módulos do Painel", arraste os itens pela alça (≡) para definir em que ordem os módulos aparecem no painel.</li>
                    <li><strong>Tema claro/escuro:</strong> Na aba "Aparência", alterne entre os modos Claro e Escuro. A mudança é aplicada em tempo real como prévia.</li>
                    <li><strong>Cor de destaque:</strong> Escolha entre as cores disponíveis para personalizar a cor principal da interface (botões, destaques, links).</li>
                    <li><strong>Opacidade:</strong> Ajuste a opacidade do dock lateral (barra fina) e do painel principal (expandido) separadamente com os sliders.</li>
                    <li><strong>Iniciar com Windows:</strong> Ative esta opção na aba "Geral" para que o DeskWidget abra automaticamente quando o computador ligar.</li>
                    <li><strong>Restaurar padrões:</strong> Cada aba possui um botão para restaurar suas configurações ao padrão original. Há também um botão global no rodapé da janela.</li>
                  </ul>
                </div>

                {/* 9. Gerenciamento de Tags */}
                <div style={{ padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: '#ffb84d' }}>🏷️ Gerenciamento de Tags</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>
                    As tags (etiquetas) permitem categorizar e organizar visualmente suas tarefas por projeto, contexto ou prioridade.
                  </p>
                  <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: '20px', lineHeight: 1.6 }}>
                    <li><strong>Criar tag:</strong> Ao clicar no ícone de etiqueta de uma tarefa, use a opção "Criar nova tag" no menu. Defina um nome e escolha uma cor personalizada.</li>
                    <li><strong>Atribuir tag a tarefa:</strong> No mesmo menu de etiquetas, marque/desmarque as tags desejadas. Uma tarefa pode ter múltiplas tags simultaneamente.</li>
                    <li><strong>Editar tag:</strong> Acesse o gerenciador de tags para renomear ou trocar a cor de qualquer etiqueta existente. Todas as tarefas associadas serão atualizadas automaticamente.</li>
                    <li><strong>Excluir tag:</strong> Remova uma tag do gerenciador. As tarefas que a utilizavam perderão apenas essa associação, sem serem excluídas.</li>
                    <li><strong>Cores customizadas:</strong> Cada tag pode ter sua própria cor, facilitando a identificação visual rápida ao olhar a lista de tarefas.</li>
                  </ul>
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '8px', fontStyle: 'italic' }}>
                    💡 Dica: Crie tags como "Urgente", "Trabalho", "Pessoal", "Estudo" para categorizar suas tarefas e encontrá-las rapidamente usando o filtro por etiquetas.
                  </p>
                </div>

                {/* 10. Atualizações */}
                <div style={{ padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--success)' }}>🔄 Atualizações</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>
                    O DeskWidget possui um sistema de atualização integrado para que você sempre tenha acesso às novidades e correções.
                  </p>
                  <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: '20px', lineHeight: 1.6 }}>
                    <li><strong>Verificação automática:</strong> Ao abrir a aba "Sobre" nas configurações, o app verifica automaticamente se há uma nova versão disponível no GitHub.</li>
                    <li><strong>Atualizar:</strong> Se uma nova versão for encontrada, clique em "Atualizar agora". O download é feito em segundo plano e uma barra de progresso mostra o andamento.</li>
                    <li><strong>Instalação:</strong> Após o download, o instalador é executado automaticamente. O app pode reiniciar para aplicar a atualização.</li>
                    <li><strong>Verificação manual:</strong> Caso queira, clique em "Verificar novamente" na aba "Sobre" para forçar uma nova checagem a qualquer momento.</li>
                  </ul>
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '8px', fontStyle: 'italic' }}>
                    💡 Dica: Mantenha o DeskWidget sempre atualizado para receber novas funcionalidades, melhorias de performance e correções de bugs.
                  </p>
                </div>

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
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button 
                    className="btn-secondary" 
                    style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => setFeedbackModal({ isOpen: true, type: 'bug' })}
                  >
                    🐛 Relatar Bug
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => setFeedbackModal({ isOpen: true, type: 'suggestion' })}
                  >
                    💡 Sugerir Melhoria
                  </button>
                </div>
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
        title={confirmConfig.title}
        isAlert={confirmConfig.isAlert}
      />
      {feedbackModal.isOpen && (
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
            width: '340px',
            height: 'auto',
            minHeight: '260px',
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
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
              fontSize: '0.78rem',
              fontWeight: 'bold',
              color: 'var(--text-muted)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ fontSize: '0.95rem' }}>{feedbackModal.type === 'bug' ? '🐛' : '💡'}</span>
                <span>{feedbackModal.type === 'bug' ? 'RELATAR BUG' : 'SUGERIR MELHORIA'}</span>
              </div>
              <button 
                onClick={() => setFeedbackModal({ isOpen: false, type: 'bug' })} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {feedbackSuccess ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '8px', padding: '20px 0' }}>
                  <span style={{ fontSize: '2rem', color: 'var(--success)' }}>✓</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--success)' }}>Enviado com sucesso!</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>Muito obrigado pelo seu feedback.</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '2px' }}>TIPO DE FEEDBACK</label>
                    <select
                      className="form-control"
                      style={{ padding: '6px', fontSize: '0.8rem', height: '32px', cursor: 'pointer', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '6px' }}
                      value={feedbackModal.type}
                      onChange={(e) => setFeedbackModal({ ...feedbackModal, type: e.target.value })}
                    >
                      <option value="bug">🐛 Relatar Bug</option>
                      <option value="suggestion">💡 Sugestão de Melhoria</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '2px' }}>MENSAGEM</label>
                    <textarea
                      className="form-control"
                      style={{
                        fontSize: '0.78rem',
                        padding: '6px 8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-main)',
                        resize: 'none',
                        borderRadius: '6px',
                        outline: 'none',
                        fontFamily: 'inherit',
                        minHeight: '80px'
                      }}
                      placeholder={feedbackModal.type === 'bug' ? "O que aconteceu? Onde ocorreu o erro?" : "Qual é a sua sugestão para melhorar o app?"}
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      disabled={feedbackSending}
                    />
                  </div>

                  {feedbackError && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.68rem', textAlign: 'center' }}>
                      ⚠️ {feedbackError}
                    </div>
                  )}

                  <button
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '0.8rem',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: feedbackSending ? 0.7 : 1,
                      cursor: feedbackSending ? 'not-allowed' : 'pointer',
                      marginTop: '4px'
                    }}
                    onClick={handleSendFeedback}
                    disabled={feedbackSending}
                  >
                    {feedbackSending ? 'Enviando...' : 'Enviar Feedback'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
