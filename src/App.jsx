import React, { useState, useEffect } from 'react';
import Widget from './Widget';
import Settings from './Settings';
import History from './History';
import Popup from './Popup';

function App() {
  const [route, setRoute] = useState(window.location.hash);
  const [themeColor, setThemeColor] = useState('#5c85ff');

  const loadTheme = async () => {
    if (window.api) {
      const s = await window.api.getSettings();
      if (s.themeColor) setThemeColor(s.themeColor);
    }
  };

  useEffect(() => {
    loadTheme();
    let cleanup;
    if (window.api?.onSettingsUpdated) {
      cleanup = window.api.onSettingsUpdated(() => loadTheme());
    }
    
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      if (cleanup) cleanup.then(f => typeof f === 'function' && f());
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
