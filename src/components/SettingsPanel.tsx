import React, { useState, useRef, useEffect } from 'react';
import { CloseIcon } from './Icons';
import { setUserRole, updateUserProfile, uploadAvatar, getUserProfile } from '../lib/auth';
import '../styles/SettingsPanel.css';

type Theme = 'light' | 'dark' | 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal';
type FontSize = 'small' | 'medium' | 'large';

interface SettingsPanelProps {
  theme: Theme;
  fontSize: FontSize;
  onThemeChange: (theme: Theme) => void;
  onFontSizeChange: (size: FontSize) => void;
  onClose: () => void;
  userId?: string;
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
  userId,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'theme' | 'text' | 'profile'>('theme');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileUserId, setProfileUserId] = useState('');
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userId && activeTab === 'profile') {
      loadProfile();
    }
  }, [userId, activeTab]);

  const loadProfile = async () => {
    if (!userId) return;
    try {
      const profile = await getUserProfile(userId);
      setProfileUsername(profile?.username || '');
      setProfileUserId(profile?.userId || '');
      setProfileAvatar(profile?.avatarUrl || null);
      setIsHidden(profile?.isHidden || false);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await updateUserProfile(userId, profileUsername, profileUserId, undefined, isHidden);
      alert('Профиль обновлен');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Ошибка обновления профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setLoading(true);
    try {
      const avatarUrl = await uploadAvatar(userId, file);
      setProfileAvatar(avatarUrl);
      alert('Аватар загружен');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Ошибка загрузки аватара');
    } finally {
      setLoading(false);
    }
  };

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
          <button
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Профиль
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

          {activeTab === 'profile' && (
            <div className="settings-section">
              <h3>Профиль</h3>
              <div className="profile-section">
                <div className="avatar-container">
                  {profileAvatar ? (
                    <img src={profileAvatar} alt="Avatar" className="profile-avatar" />
                  ) : (
                    <div className="profile-avatar-placeholder">👤</div>
                  )}
                  <button
                    className="upload-avatar-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    Загрузить аватар
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    style={{ display: 'none' }}
                  />
                </div>

                <div className="profile-form">
                  <label>Имя пользователя</label>
                  <input
                    type="text"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                    placeholder="Введи имя"
                    className="profile-input"
                  />
                  <label>ID (для поиска)</label>
                  <input
                    type="text"
                    value={profileUserId}
                    onChange={(e) => setProfileUserId(e.target.value)}
                    placeholder="Введи ID"
                    className="profile-input"
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isHidden}
                      onChange={(e) => setIsHidden(e.target.checked)}
                    />
                    <span>Скрыть от поиска</span>
                  </label>
                  <button
                    className="save-profile-btn"
                    onClick={handleUpdateProfile}
                    disabled={loading}
                  >
                    {loading ? 'Сохраняю...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
