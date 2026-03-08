import React, { useState, useEffect } from 'react';
import { AuthPage } from './pages/AuthPage';
import { MessengerPage } from './pages/MessengerPage';
import { InstallPrompt } from './components/InstallPrompt';
import './styles/App.css';

type Theme = 'light' | 'dark' | 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal';
type FontSize = 'small' | 'medium' | 'large';
type AppState = 'auth' | 'messenger';

export default function App() {
  const [state, setState] = useState<AppState>('auth');
  const [userId, setUserId] = useState<string>('');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem('fontSize');
    return (saved as FontSize) || 'medium';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-blue', 'theme-green', 'theme-purple', 'theme-orange', 'theme-pink', 'theme-teal');
    root.classList.add(`theme-${theme}`);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-small', 'font-medium', 'font-large');
    root.classList.add(`font-${fontSize}`);
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  const handleLogin = (id: string) => {
    setUserId(id);
    setState('messenger');
  };

  const handleLogout = () => {
    setUserId('');
    setState('auth');
  };

  return (
    <div className="app">
      {state === 'auth' ? (
        <AuthPage onLogin={handleLogin} />
      ) : (
        <MessengerPage
          userId={userId}
          onLogout={handleLogout}
          theme={theme}
          fontSize={fontSize}
          onThemeChange={setTheme}
          onFontSizeChange={setFontSize}
        />
      )}
      <InstallPrompt />
    </div>
  );
}
