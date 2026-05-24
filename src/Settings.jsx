import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Palette, Cpu } from 'lucide-react';

function Settings() {
  const [settings, setSettings] = useState({});
  const [localSettings, setLocalSettings] = useState({});

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

      <div className="window-content" style={{ padding: '15px 20px 5px 20px' }}>
        <div className="settings-section">
          <h3 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Módulos</h3>
          
          <div className="setting-item">
            <span>Lista de Tarefas</span>
            <div 
              className={`toggle-switch ${localSettings.enableTasks !== 'false' ? 'on' : ''}`}
              onClick={() => {
                // Impede desativar se o outro já estiver desativado
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
                // Impede desativar se o outro já estiver desativado
                if (localSettings.enableReminders !== 'false' && localSettings.enableTasks === 'false') return;
                setLocalSettings({...localSettings, enableReminders: localSettings.enableReminders === 'false' ? 'true' : 'false'});
              }}
            >
              <div className="toggle-thumb"></div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', marginBottom: '10px' }}>
            <Palette size={16} /> Aparência
          </h3>
          
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

          <div className="setting-item">
            <span>Delay de Recolhimento (ms)</span>
            <input 
              type="number" 
              className="form-control" 
              style={{ width: '80px', padding: '4px 8px', textAlign: 'right' }} 
              value={localSettings.delay || 1000}
              onChange={(e) => updateLocalSetting('delay', e.target.value)}
            />
          </div>

          <div className="setting-item">
            <span>Som de Notificação</span>
            <div 
              className={`toggle-switch ${localSettings.soundEnabled !== 'false' ? 'on' : ''}`}
              onClick={() => updateLocalSetting('soundEnabled', localSettings.soundEnabled === 'false' ? 'true' : 'false')}
            >
              <div className="toggle-thumb"></div>
            </div>
          </div>
          
          {localSettings.soundEnabled !== 'false' && (
            <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', borderTop: 'none', paddingTop: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Volume do Som</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{localSettings.soundVolume || 80}%</span>
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
          )}
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
