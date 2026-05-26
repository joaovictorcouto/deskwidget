import React, { useState, useEffect } from 'react';
import Widget from './Widget';
import Settings from './Settings';
import History from './History';
import Popup from './Popup';

const LIGHT_COLOR_MAP = {
  '#5c85ff': '#3b5bdb', // Rich Blue
  '#ff5c5c': '#e03131', // Darker Red
  '#5cff85': '#2b8a3e', // Darker Green
  '#ffb85c': '#d9480f', // Darker Orange
  '#bd5cff': '#862e9c', // Darker Purple
};

function App() {
  const [route, setRoute] = useState(window.location.hash);
  const [themeColor, setThemeColor] = useState('#5c85ff');

  const loadTheme = async () => {
    if (window.api) {
      const s = await window.api.getSettings();
      let color = s.themeColor || '#5c85ff';
      const isLight = s.theme === 'claro';
      if (isLight && LIGHT_COLOR_MAP[color]) {
        color = LIGHT_COLOR_MAP[color];
      }
      setThemeColor(color);
      
      if (isLight) {
        document.body.classList.add('theme-light');
      } else {
        document.body.classList.remove('theme-light');
      }
    }
  };

  useEffect(() => {
    loadTheme();
    
    let cleanup;
    if (window.api?.onSettingsUpdated) {
      cleanup = window.api.onSettingsUpdated(() => loadTheme());
    }
    
    let cleanupClosed;
    if (window.api?.onSettingsClosed) {
      cleanupClosed = window.api.onSettingsClosed(() => loadTheme());
    }
    
    let cleanupPreview;
    if (window.api?.onPreviewAppearance) {
      cleanupPreview = window.api.onPreviewAppearance((preview) => {
        let color = preview.themeColor || '#5c85ff';
        const isLight = preview.theme === 'claro';
        if (isLight && LIGHT_COLOR_MAP[color]) {
          color = LIGHT_COLOR_MAP[color];
        }
        setThemeColor(color);
        if (isLight) {
          document.body.classList.add('theme-light');
        } else {
          document.body.classList.remove('theme-light');
        }
      });
    }
    
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      if (typeof cleanup === 'function') cleanup();
      if (typeof cleanupClosed === 'function') cleanupClosed();
      if (typeof cleanupPreview === 'function') cleanupPreview();
    };
  }, []);

  let Component = <Widget />;
  if (route === '#/settings') Component = <Settings />;
  else if (route === '#/history') Component = <History />;
  else if (route.startsWith('#/popup')) Component = <Popup />;

  return (
    <>
      <style>{`
        :root {
          --primary: ${themeColor} !important;
          --primary-hover: color-mix(in srgb, ${themeColor}, black 15%) !important;
        }
      `}</style>
      {Component}
    </>
  );
}

export default App;
