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

    let removeListener;
    if (window.api?.onSettingsUpdated) {
      removeListener = window.api.onSettingsUpdated(() => {
        loadSettings();
      });
    }
    return () => {
      if (removeListener) removeListener();
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
    }
    close();
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
        <button className="icon-btn" onClick={close} style={{ opacity: 0.7 }}>×</button>
      </div>

      <div className="window-content" style={{ padding: '20px' }}>
        <div className="settings-section">
          <h3>Módulos</h3>
          
          <div className="setting-item">
            <span>Lista de Tarefas</span>
            <div 
              className={`toggle-switch ${localSettings.enableTasks !== 'false' ? 'on' : ''}`} 
              onClick={() => updateLocalSetting('enableTasks', localSettings.enableTasks !== 'false' ? 'false' : 'true')}
            />
          </div>
          <div className="setting-item">
            <span>Agendador de Lembretes</span>
            <div 
              className={`toggle-switch ${localSettings.enableReminders !== 'false' ? 'on' : ''}`} 
              onClick={() => updateLocalSetting('enableReminders', localSettings.enableReminders !== 'false' ? 'false' : 'true')}
            />
          </div>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', marginBottom: '15px' }}>
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

          <div className="setting-item">
            <span>Opacidade do Painel Traseiro</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="range" 
                min="10" 
                max="100" 
                value={localSettings.opacity || 90} 
                onChange={(e) => updateLocalSetting('opacity', e.target.value)}
                style={{ width: '100px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.8rem', width: '30px', textAlign: 'right' }}>{localSettings.opacity || 90}%</span>
            </div>
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
        </div>

        <div className="settings-section" style={{ borderBottom: 'none' }}>
          <h3>Sistema</h3>
          <div className="setting-item">
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
