# 🔐 Интеграция защит в компоненты

## Пример 1: Защита при входе (AuthPage.tsx)

```typescript
import { loginUser } from '../lib/auth';
import { bruteForceProtection } from '../lib/advanced-security';
import { validateEmail } from '../lib/security';

export const handleLogin = async (email: string, password: string) => {
  try {
    // Проверяем email формат
    if (!validateEmail(email)) {
      throw new Error('Неверный формат email');
    }

    // Проверяем brute force защиту
    if (!bruteForceProtection.recordAttempt(`login_${email}`)) {
      throw new Error('Аккаунт заблокирован. Попробуйте позже');
    }

    // Входим
    const user = await loginUser(email, password);
    
    // Успешный вход - сбрасываем счётчик
    bruteForceProtection.recordSuccess(`login_${email}`);
    
    // Если включена 2FA, запрашиваем код
    const userProfile = await getUserProfile(user.uid);
    if (userProfile?.twoFactorEnabled) {
      // Показываем форму для ввода 2FA кода
      return { user, requires2FA: true };
    }
    
    return { user, requires2FA: false };
  } catch (error) {
    throw error;
  }
};
```

## Пример 2: Защита при регистрации

```typescript
import { registerUser } from '../lib/auth';
import { validatePassword, validateUsername, validateEmail } from '../lib/security';

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

    if (!validateUsername(username)) {
      throw new Error('Неверный формат имени пользователя');
    }

    // Регистрируем
    const user = await registerUser(email, password, username, userId);
    
    // Предлагаем включить 2FA
    return { user, suggestEnable2FA: true };
  } catch (error) {
    throw error;
  }
};
```

## Пример 3: Защита при отправке сообщений (ChatWindow.tsx)

```typescript
import { sendMessage } from '../lib/messages';
import { sanitizeText, detectSQLInjection, detectNoSQLInjection } from '../lib/security';

export const handleSendMessage = async (
  chatId: string,
  sender: string,
  senderName: string,
  text: string
) => {
  try {
    // Проверяем на injection атаки
    if (detectSQLInjection(text) || detectNoSQLInjection(text)) {
      throw new Error('Обнаружена попытка атаки. Сообщение не отправлено');
    }

    // Санитизируем текст
    const sanitized = sanitizeText(text);

    // Отправляем сообщение
    const messageId = await sendMessage(chatId, sender, senderName, sanitized);
    
    return messageId;
  } catch (error) {
    throw error;
  }
};
```

## Пример 4: Защита при загрузке файлов

```typescript
import { sendPhoto } from '../lib/messages';
import { validateFileSize, validateFileType } from '../lib/security';

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
    
    return messageId;
  } catch (error) {
    throw error;
  }
};
```

## Пример 5: Защита при создании группы

```typescript
import { createGroup } from '../lib/messages';
import { detectSQLInjection, detectNoSQLInjection, sanitizeText } from '../lib/security';

export const handleCreateGroup = async (
  groupName: string,
  creatorId: string,
  members: string[]
) => {
  try {
    // Проверяем на injection атаки
    if (detectSQLInjection(groupName) || detectNoSQLInjection(groupName)) {
      throw new Error('Недопустимые символы в названии группы');
    }

    // Санитизируем название
    const sanitized = sanitizeText(groupName);

    // Создаём группу
    const group = await createGroup(sanitized, creatorId, members);
    
    return group;
  } catch (error) {
    throw error;
  }
};
```

## Пример 6: Защита от XSS в компонентах

```typescript
import { xssProtection } from '../lib/advanced-security';

export const SafeMessageDisplay = ({ message }: { message: string }) => {
  // Проверяем на XSS
  if (xssProtection.detectXSS(message)) {
    return <div>⚠️ Сообщение содержит недопустимый контент</div>;
  }

  // Санитизируем и отображаем
  const safe = xssProtection.sanitize(message);
  
  return <div>{safe}</div>;
};
```

## Пример 7: Защита от Clickjacking

```typescript
import { ClickjackingProtection } from '../lib/advanced-security';

export const useClickjackingProtection = () => {
  useEffect(() => {
    // Проверяем, находимся ли мы в iframe
    if (ClickjackingProtection.detectFraming()) {
      console.warn('Приложение загружено в iframe!');
      ClickjackingProtection.preventFraming();
    }
  }, []);
};
```

## Пример 8: Мониторинг безопасности

```typescript
import { securityMonitor } from '../lib/advanced-security';

export const useSecurityMonitoring = () => {
  const recordAlert = (type: 'warning' | 'critical', message: string, details: any) => {
    securityMonitor.recordAlert(type, message, details);
  };

  const getRecentAlerts = () => {
    return securityMonitor.getAlerts(50);
  };

  return { recordAlert, getRecentAlerts };
};
```

## Пример 9: Включение 2FA

```typescript
import { enable2FA, confirm2FA } from '../lib/auth';

export const handleEnable2FA = async (userId: string) => {
  try {
    // Генерируем TOTP секрет
    const secret = await enable2FA(userId);
    
    // Показываем QR код пользователю
    // (используйте библиотеку для генерации QR кода)
    
    return secret;
  } catch (error) {
    throw error;
  }
};

export const handleConfirm2FA = async (userId: string, code: string) => {
  try {
    // Подтверждаем 2FA
    const isValid = await confirm2FA(userId, code);
    
    if (!isValid) {
      throw new Error('Неверный код');
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};
```

## Пример 10: CSRF защита

```typescript
import { csrfProtection } from '../lib/advanced-security';

export const useCSRFProtection = (userId: string) => {
  const [csrfToken, setCSRFToken] = useState<string>('');

  useEffect(() => {
    // Генерируем CSRF токен при входе
    const token = csrfProtection.generateToken(userId);
    setCSRFToken(token);
  }, [userId]);

  const verifyCSRFToken = (token: string) => {
    return csrfProtection.verifyToken(userId, token);
  };

  return { csrfToken, verifyCSRFToken };
};
```

## Пример 11: Логирование безопасности

```typescript
import { logSecurityEvent } from '../lib/security';

export const handleSuspiciousActivity = (activity: string, details: any) => {
  // Логируем подозрительную активность
  logSecurityEvent('SUSPICIOUS_ACTIVITY', { activity, details }, 'high');
  
  // Можно также показать уведомление пользователю
  // или заблокировать действие
};
```

## Пример 12: Проверка целостности данных

```typescript
import { DataProtection } from '../lib/advanced-security';

export const handleMessageReceived = (message: any) => {
  // Проверяем целостность сообщения
  if (message.checksum) {
    const isValid = DataProtection.verifyChecksum(
      JSON.stringify(message),
      message.checksum
    );
    
    if (!isValid) {
      console.error('Сообщение повреждено или изменено!');
      return;
    }
  }
  
  // Обрабатываем сообщение
  processMessage(message);
};
```

## Чек-лист для разработчиков

- [ ] Все пользовательские входы санитизированы
- [ ] Все данные проверены на injection атаки
- [ ] Все файлы валидированы перед загрузкой
- [ ] Rate limiting применён ко всем критическим операциям
- [ ] 2FA включена для критических операций
- [ ] CSRF токены используются для изменения данных
- [ ] Все события безопасности логируются
- [ ] Пароли соответствуют требованиям безопасности
- [ ] Нет логирования чувствительных данных
- [ ] Используется HTTPS для всех соединений
- [ ] Заголовки безопасности установлены на сервере
- [ ] Регулярно проводятся аудиты безопасности
