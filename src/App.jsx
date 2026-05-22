import React, { useState, useEffect } from 'react';
import Widget from './Widget';
import Settings from './Settings';
import History from './History';
import Popup from './Popup';

function App() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (route === '#/settings') return <Settings />;
  if (route === '#/history') return <History />;
  if (route.startsWith('#/popup')) return <Popup />;

  return <Widget />;
}

export default App;
