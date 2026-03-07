import React, { useState } from 'react';
import '../styles/AuthPage.css';
import { registerUser, loginUser } from '../lib/auth';

interface AuthPageProps {
  onLogin: (userId: string) => void;
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!email.trim() || !password.trim()) {
          setError('Заполните все поля');
          return;
        }
        const user = await loginUser(email, password);
        onLogin(user.uid);
      } else {
        if (!email.trim() || !username.trim() || !password.trim() || !userId.trim()) {
          setError('Заполните все поля');
          return;
        }
        if (password.length < 6) {
          setError('Пароль должен быть минимум 6 символов');
          return;
        }
        const user = await registerUser(email, password, username, userId);
        onLogin(user.uid);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <img src={require('../assets/icon.png')} alt="DrawSenger" className="auth-icon-large" />
        </div>
        <div className="auth-tabs">
          <button
            className={`tab ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Вход
          </button>
          <button
            className={`tab ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Регистрация
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className="auth-input"
              disabled={loading}
            />
          )}
          {!isLogin && (
            <input
              type="text"
              placeholder="Имя пользователя"
              value={username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
              className="auth-input"
              disabled={loading}
            />
          )}
          {!isLogin && (
            <input
              type="text"
              placeholder="ID (для поиска)"
              value={userId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserId(e.target.value)}
              className="auth-input"
              disabled={loading}
            />
          )}
          {isLogin && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className="auth-input"
              disabled={loading}
            />
          )}
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            className="auth-input"
            disabled={loading}
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Загрузка...' : (isLogin ? 'Вход' : 'Регистрация')}
          </button>
        </form>
      </div>
    </div>
  );
}
