import React, { useState } from 'react';
import { CloseIcon } from './Icons';
import '../styles/SettingsPanel.css';

type Theme = 'light' | 'dark' | 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal';
type FontSize = 'small' | 'medium' | 'large';

interface SettingsPanelProps {
  theme: Theme;
  fontSize: FontSize;
  onThemeChange: (theme: Theme) => void;
  onFontSizeChange: (size: FontSize) => void;
  onClose: () => void;
}

const THEMES: { name: Theme; label: string; colors: string }[] = [
  { name: 'light', label: 'Светлая', colors: '#fff #667eea' },
  { name: 'dark', label: 'Тёмная', colors: '#1a1a1a #667eea' },
  { name: 'blue', label: 'Синяя', colors: '#eff6ff #3b82f6' },
  { name: 'green', label: 'Зелёная', colors: '#ecfdf5 #10b981' },
  { name: 'purple', label: 'Фиолетовая', colors: '#faf5ff #a855f7' },
  { name: 'orange', label: 'Оранжевая', colors: '#fff7ed #f97316' },
  { name: 'pink', label: 'Розовая', colors: '#fdf2f8 #ec4899' },
  { name: 'teal', label: 'Бирюзовая', colors: '#f0fdfa #14b8a6' },
];

const FONT_SIZES: { name: FontSize; label: string }[] = [
  { name: 'small', label: 'Маленький' },
  { name: 'medium', label: 'Средний' },
  { name: 'large', label: 'Большой' },
];

export function SettingsPanel({
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
  onClose,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'theme' | 'text'>('theme');

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Настройки</h2>
          <button className="close-btn" onClick={onClose}><CloseIcon size={20} /></button>
        </div>

        <div className="settings-tabs">
          <button
            className={`tab ${activeTab === 'theme' ? 'active' : ''}`}
            onClick={() => setActiveTab('theme')}
          >
            Тема
          </button>
          <button
            className={`tab ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => setActiveTab('text')}
          >
            Текст
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'theme' && (
            <div className="settings-section">
              <div className="theme-grid">
                {THEMES.map((t) => (
                  <button
                    key={t.name}
                    className={`theme-option ${theme === t.name ? 'active' : ''}`}
                    onClick={() => onThemeChange(t.name)}
                    title={t.label}
                  >
                    <div className="theme-preview" style={{
                      background: `linear-gradient(135deg, ${t.colors.split(' ')[0]} 0%, ${t.colors.split(' ')[1]} 100%)`
                    }} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="settings-section">
              <h3>Размер шрифта</h3>
              <div className="settings-buttons">
                {FONT_SIZES.map((f) => (
                  <button
                    key={f.name}
                    className={`settings-option ${fontSize === f.name ? 'active' : ''}`}
                    onClick={() => onFontSizeChange(f.name)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
