import React, { useState, useEffect } from 'react';
import { confirmEmailVerification, resendVerificationCode } from '../lib/auth';
import '../styles/EmailVerification.css';

interface EmailVerificationProps {
  email: string;
  password: string;
  username: string;
  userId: string;
  onSuccess: (user: any) => void;
  onError: (error: string) => void;
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({
  email,
  password,
  username,
  userId,
  onSuccess,
  onError
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!/^\d{6}$/.test(code)) {
        throw new Error('Код должен состоять из 6 цифр');
      }

      const user = await confirmEmailVerification(email, code, password, username, userId);
      setSuccess('Email успешно подтверждён! Регистрация завершена.');
      setTimeout(() => {
        onSuccess(user);
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.message || 'Ошибка подтверждения email';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await resendVerificationCode(email);
      setSuccess('Новый код отправлен на ваш email');
      setResendCooldown(60);
      setCode('');
    } catch (err: any) {
      const errorMessage = err.message || 'Ошибка отправки кода';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-verification-container">
      <div className="email-verification-card">
        <h2>Подтверждение email</h2>
        <p className="email-info">Код подтверждения отправлен на:</p>
        <p className="email-address">{email}</p>

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label htmlFor="code">Введите 6-значный код:</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              className="code-input"
            />
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}
          {success && <div className="success-message">✅ {success}</div>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="verify-button"
          >
            {loading ? 'Проверка...' : 'Подтвердить'}
          </button>
        </form>

        <div className="resend-section">
          <p>Не получили код?</p>
          <button
            onClick={handleResend}
            disabled={loading || resendCooldown > 0}
            className="resend-button"
          >
            {resendCooldown > 0
              ? `Повторить через ${resendCooldown}с`
              : 'Отправить заново'}
          </button>
        </div>

        <div className="security-info">
          <p>🔒 Ваш email защищён. Код действует 15 минут.</p>
        </div>
      </div>
    </div>
  );
};
