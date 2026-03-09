# 🚀 Руководство по внедрению защит

## Шаг 1: Проверка кода

Убедитесь, что все файлы скомпилировались без ошибок:

```bash
npm run build
```

Проверьте типы:

```bash
npx tsc --noEmit
```

## Шаг 2: Обновление компонентов

### AuthPage.tsx

```typescript
import { loginUser, registerUser, enable2FA, confirm2FA } from '../lib/auth';
import { validateEmail, validatePassword, logSecurityEvent } from '../lib/security';
import { bruteForceProtection } from '../lib/advanced-security';

export const handleLogin = async (email: string, password: string) => {
  try {
    // Валидируем email
    if (!validateEmail(email)) {
      throw new Error('Неверный формат email');
    }

    // Проверяем brute force
    if (!bruteForceProtection.recordAttempt(`login_${email}`)) {
      throw new Error('Аккаунт заблокирован. Попробуйте позже');
    }

    // Входим
    const user = await loginUser(email, password);
    bruteForceProtection.recordSuccess(`login_${email}`);
    
    logSecurityEvent('USER_LOGIN', { userId: user.uid, email }, 'low');
    return user;
  } catch (error) {
    logSecurityEvent('LOGIN_FAILED', { email, error: error.message }, 'medium');
    throw error;
  }
};

export const handleRegister = async (
  email: string,
  password: string,
  username: string,
  userId: string
) => {
  try {
    // Валидируем все поля
    if (!validateEmail(email)) {
      throw new Error('Неверный формат email');
    }

    if (!validatePassword(password)) {
      throw new Error('Пароль должен содержать минимум 8 символов, заглавные, строчные буквы, цифры и спецсимволы');
    }

    // Регистрируем
    const user = await registerUser(email, password, username, userId);
    
    logSecurityEvent('USER_REGISTERED', { userId: user.uid, email }, 'low');
    return user;
  } catch (error) {
    logSecurityEvent('REGISTRATION_FAILED', { email, error: error.message }, 'medium');
    throw error;
  }
};
```

### ChatWindow.tsx

```typescript
import { sendMessage } from '../lib/messages';
import { sanitizeText, detectSQLInjection, detectNoSQLInjection, logSecurityEvent } from '../lib/security';
import { messageRateLimiter } from '../lib/messages';

export const handleSendMessage = async (
  chatId: string,
  sender: string,
  senderName: string,
  text: string
) => {
  try {
    // Проверяем на injection атаки
    if (detectSQLInjection(text) || detectNoSQLInjection(text)) {
      logSecurityEvent('INJECTION_ATTEMPT', { sender, text }, 'high');
      throw new Error('Обнаружена попытка атаки. Сообщение не отправлено');
    }

    // Санитизируем текст
    const sanitized = sanitizeText(text);

    // Отправляем сообщение
    const messageId = await sendMessage(chatId, sender, senderName, sanitized);
    
    logSecurityEvent('MESSAGE_SENT', { sender, chatId }, 'low');
    return messageId;
  } catch (error) {
    logSecurityEvent('MESSAGE_SEND_ERROR', { sender, error: error.message }, 'medium');
    throw error;
  }
};
```

### MessageInput.tsx

```typescript
import { sendPhoto, sendVoiceMessage } from '../lib/messages';
import { validateFileSize, validateFileType, logSecurityEvent } from '../lib/security';

export const handlePhotoUpload = async (
  chatId: string,
  sender: string,
  senderName: string,
  file: File
) => {
  try {
    // Проверяем размер
    if (!validateFileSize(file, 5)) {
      throw new Error('Файл слишком большой (максимум 5 МБ)');
    }

    // Проверяем тип
    if (!validateFileType(file, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])) {
      throw new Error('Недопустимый тип файла');
    }

    // Отправляем фото
    const messageId = await sendPhoto(chatId, sender, senderName, file);
    
    logSecurityEvent('PHOTO_SENT', { sender, chatId }, 'low');
    return messageId;
  } catch (error) {
    logSecurityEvent('PHOTO_UPLOAD_ERROR', { sender, error: error.message }, 'medium');
    throw error;
  }
};

export const handleVoiceMessage = async (
  chatId: string,
  sender: string,
  senderName: string,
  duration: number,
  audioBlob: Blob
) => {
  try {
    const file = new File([audioBlob], `${Date.now()}_voice.wav`, { type: 'audio/wav' });
    
    // Проверяем размер
    if (!validateFileSize(file, 10)) {
      throw new Error('Голосовое сообщение слишком большое');
    }

    // Отправляем голосовое сообщение
    const messageId = await sendVoiceMessage(chatId, sender, senderName, duration, audioBlob);
    
    logSecurityEvent('VOICE_MESSAGE_SENT', { sender, chatId }, 'low');
    return messageId;
  } catch (error) {
    logSecurityEvent('VOICE_MESSAGE_ERROR', { sender, error: error.message }, 'medium');
    throw error;
  }
};
```

## Шаг 3: Добавление 2FA

### Создайте компонент TwoFactorSetup.tsx

```typescript
import React, { useState } from 'react';
import { enable2FA, confirm2FA } from '../lib/auth';

export const TwoFactorSetup = ({ userId }: { userId: string }) => {
  const [secret, setSecret] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleEnable = async () => {
    try {
      const newSecret = await enable2FA(userId);
      setSecret(newSecret);
      // Показываем QR код пользователю
      // (используйте библиотеку для генерации QR кода)
    } catch (error) {
      console.error('Ошибка включения 2FA:', error);
    }
  };

  const handleConfirm = async () => {
    try {
      const isValid = await confirm2FA(userId, code);
      if (isValid) {
        setIsConfirmed(true);
        alert('2FA успешно включена!');
      } else {
        alert('Неверный код');
      }
    } catch (error) {
      console.error('Ошибка подтверждения 2FA:', error);
    }
  };

  return (
    <div>
      <h2>Двухфакторная аутентификация</h2>
      {!secret ? (
        <button onClick={handleEnable}>Включить 2FA</button>
      ) : !isConfirmed ? (
        <div>
          <p>Отсканируйте QR код в приложении аутентификатора</p>
          {/* Здесь должен быть QR код */}
          <input
            type="text"
            placeholder="Введите 6-значный код"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
          />
          <button onClick={handleConfirm}>Подтвердить</button>
        </div>
      ) : (
        <p>✅ 2FA включена</p>
      )}
    </div>
  );
};
```

## Шаг 4: Настройка сервера

### Express.js

```typescript
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

const app = express();

// Используем helmet для заголовков безопасности
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://example.com'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api/', limiter);

// Заголовки безопасности
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.listen(3000);
```

## Шаг 5: Тестирование

### Запустите тесты

```bash
npm test
```

### Проверьте покрытие

```bash
npm test -- --coverage
```

### Примеры тестов

```typescript
import { validatePassword, detectSQLInjection } from '../lib/security';

describe('Security Tests', () => {
  it('should validate strong password', () => {
    expect(validatePassword('SecurePass123!')).toBe(true);
  });

  it('should detect SQL injection', () => {
    expect(detectSQLInjection("' UNION SELECT *--")).toBe(true);
  });
});
```

## Шаг 6: Развертывание

### Проверьте переменные окружения

```bash
# .env
NODE_ENV=production
ALLOWED_ORIGINS=https://example.com
JWT_SECRET=your_secret_key
```

### Запустите приложение

```bash
npm run build
npm start
```

### Проверьте логи

```bash
tail -f logs/security.log
```

## Шаг 7: Мониторинг

### Настройте логирование

```typescript
import { logSecurityEvent } from './lib/security';

// Логируйте все важные события
logSecurityEvent('USER_LOGIN', { userId, email }, 'low');
logSecurityEvent('SUSPICIOUS_ACTIVITY', details, 'critical');
```

### Проверяйте алерты

```typescript
import { securityMonitor } from './lib/advanced-security';

const alerts = securityMonitor.getAlerts(100);
console.log('Recent security alerts:', alerts);
```

## Чек-лист внедрения

- [ ] Все файлы скомпилировались без ошибок
- [ ] Обновлены все компоненты
- [ ] Добавлена 2FA
- [ ] Настроен сервер
- [ ] Написаны тесты
- [ ] Проведено тестирование
- [ ] Настроено логирование
- [ ] Настроен мониторинг
- [ ] Развернуто в продакшене
- [ ] Проведен аудит безопасности

## Решение проблем

### Ошибка: "Cannot find module 'security'"

```bash
# Убедитесь, что файл существует
ls -la src/lib/security.ts

# Пересоберите проект
npm run build
```

### Ошибка: "validatePassword is not a function"

```typescript
// Убедитесь, что импортируете правильно
import { validatePassword } from './lib/security';
```

### Ошибка: "Rate limiter exceeded"

```typescript
// Это нормально - это означает, что защита работает
// Подождите 60 секунд и попробуйте снова
```

## Поддержка

Если у вас есть вопросы:
1. Прочитайте SECURITY_GUIDE.md
2. Посмотрите примеры в SECURITY_INTEGRATION.md
3. Проверьте тесты в SECURITY_TESTS.md

---

**Дата:** 2026-03-09
**Версия:** 1.0.0
