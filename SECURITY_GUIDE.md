# 🔒 Руководство по безопасности мессенджера

## Обзор защит

Мессенджер имеет комплексную систему защиты от различных типов атак:

### 1. Криптография и шифрование

**Файл:** `src/lib/security.ts`

- **AES-GCM шифрование** - все сообщения шифруются перед отправкой
- **Генерация криптографически стойких ключей** - используется Web Crypto API
- **Хеширование паролей** - SHA-256 для дополнительной проверки

```typescript
// Пример использования
import { encryptMessage, decryptMessage, generateSecureKey } from './lib/security';

const key = generateSecureKey();
const encrypted = await encryptMessage('Секретное сообщение', key);
const decrypted = await decryptMessage(encrypted, key);
```

### 2. Двухфакторная аутентификация (2FA)

**Файл:** `src/lib/auth.ts`

- **TOTP (Time-based One-Time Password)** - коды, которые меняются каждые 30 секунд
- **Проверка соседних временных окон** - защита от проблем с синхронизацией времени

```typescript
// Включить 2FA
const secret = await enable2FA(userId);

// Подтвердить 2FA
const isValid = await confirm2FA(userId, '123456');

// Проверить при входе
const loginValid = await verify2FALogin(userId, '123456');
```

### 3. Защита от Rate Limiting

**Файл:** `src/lib/security.ts`

- **Ограничение попыток входа** - максимум 5 попыток за 60 секунд
- **Ограничение регистрации** - максимум 3 попытки за 5 минут
- **Ограничение отправки сообщений** - максимум 10 сообщений за 60 секунд

```typescript
const loginLimiter = new RateLimiter(5, 60000); // 5 попыток за 60 сек

if (!loginLimiter.isAllowed(`login_${email}`)) {
  throw new Error('Слишком много попыток');
}
```

### 4. Защита от Injection атак

**Файл:** `src/lib/security.ts`

- **SQL Injection detection** - проверка опасных SQL паттернов
- **NoSQL Injection detection** - проверка MongoDB операторов
- **Санитизация текста** - удаление опасных символов

```typescript
import { detectSQLInjection, detectNoSQLInjection, sanitizeText } from './lib/security';

if (detectSQLInjection(userInput)) {
  throw new Error('Обнаружена попытка SQL injection');
}

const safe = sanitizeText(userInput);
```

### 5. Защита от XSS (Cross-Site Scripting)

**Файл:** `src/lib/advanced-security.ts`

- **Обнаружение XSS паттернов** - скрипты, обработчики событий, iframe
- **Санитизация HTML** - удаление опасных тегов и атрибутов

```typescript
import { xssProtection } from './lib/advanced-security';

if (xssProtection.detectXSS(userInput)) {
  throw new Error('Обнаружена попытка XSS');
}

const safe = xssProtection.sanitize(userInput);
```

### 6. Защита от Brute Force

**Файл:** `src/lib/advanced-security.ts`

- **Отслеживание попыток** - счётчик неудачных попыток
- **Блокировка аккаунта** - временная блокировка после 5 попыток
- **Автоматическое разблокирование** - через 15 минут

```typescript
import { bruteForceProtection } from './lib/advanced-security';

if (!bruteForceProtection.recordAttempt(`login_${email}`)) {
  throw new Error('Аккаунт заблокирован');
}

// После успешного входа
bruteForceProtection.recordSuccess(`login_${email}`);
```

### 7. Защита от CSRF (Cross-Site Request Forgery)

**Файл:** `src/lib/advanced-security.ts`

- **Генерация CSRF токенов** - уникальные токены для каждого пользователя
- **Проверка токенов** - валидация перед выполнением действий
- **Срок действия токенов** - 1 час

```typescript
import { csrfProtection } from './lib/advanced-security';

// Генерируем токен при входе
const token = csrfProtection.generateToken(userId);

// Проверяем перед действием
if (!csrfProtection.verifyToken(userId, token)) {
  throw new Error('Неверный CSRF токен');
}
```

### 8. Защита от Clickjacking

**Файл:** `src/lib/advanced-security.ts`

- **Обнаружение фреймирования** - проверка, находится ли приложение в iframe
- **Предотвращение фреймирования** - перенаправление на основной сайт

```typescript
import { ClickjackingProtection } from './lib/advanced-security';

// Проверить, находимся ли мы в iframe
if (ClickjackingProtection.detectFraming()) {
  ClickjackingProtection.preventFraming();
}
```

### 9. Аудит и логирование

**Файл:** `src/lib/security.ts`

- **Логирование всех событий безопасности** - с уровнями серьёзности
- **Отправка критических событий на сервер** - для анализа
- **Временные метки и детали** - для расследования инцидентов

```typescript
import { logSecurityEvent } from './lib/security';

logSecurityEvent('USER_LOGIN', { userId, email }, 'low');
logSecurityEvent('SUSPICIOUS_ACTIVITY', { details }, 'critical');
```

### 10. Защита файлов

**Файл:** `src/lib/security.ts`

- **Проверка размера файла** - максимум 5 МБ для фото, 10 МБ для голоса
- **Проверка типа файла** - только разрешённые MIME типы
- **Проверка расширения файла** - дополнительная валидация

```typescript
import { validateFileSize, validateFileType } from './lib/security';

if (!validateFileSize(file, 5)) {
  throw new Error('Файл слишком большой');
}

if (!validateFileType(file, ['image/jpeg', 'image/png'])) {
  throw new Error('Недопустимый тип файла');
}
```

### 11. Защита сессии

**Файл:** `src/lib/security.ts`

- **Управление сессиями** - создание, валидация, уничтожение
- **Проверка IP адреса** - обнаружение смены IP
- **Timeout сессии** - 30 минут неактивности

```typescript
import { SessionManager } from './lib/security';

const sessionManager = new SessionManager();

// Создаём сессию
const token = sessionManager.createSession(userId, ipAddress);

// Проверяем сессию
if (!sessionManager.validateSession(token, ipAddress)) {
  throw new Error('Неверная сессия');
}

// Уничтожаем сессию
sessionManager.destroySession(token);
```

### 12. Мониторинг безопасности

**Файл:** `src/lib/advanced-security.ts`

- **Запись алертов** - все подозрительные действия
- **Классификация** - warning и critical
- **История** - последние 1000 событий

```typescript
import { securityMonitor } from './lib/advanced-security';

securityMonitor.recordAlert('critical', 'Попытка взлома', { details });
const alerts = securityMonitor.getAlerts(100);
```

## Требования к паролям

Пароли должны содержать:
- Минимум 8 символов
- Максимум 128 символов
- Заглавные буквы (A-Z)
- Строчные буквы (a-z)
- Цифры (0-9)
- Спецсимволы (!@#$%^&*()_+-=[]{}';:"\\|,.<>/?

Пример: `SecurePass123!@#`

## Требования к email

- Стандартный формат email
- Максимум 100 символов
- Проверка на дублирование

## Требования к имени пользователя

- Минимум 2 символа
- Максимум 50 символов
- Только буквы, цифры, пробелы и подчеркивание

## Требования к ID пользователя

- Минимум 3 символа
- Максимум 50 символов
- Только буквы, цифры, подчеркивание и дефис

## Лучшие практики

### 1. Никогда не логируйте пароли
```typescript
// ❌ НЕПРАВИЛЬНО
logSecurityEvent('LOGIN', { email, password }, 'low');

// ✅ ПРАВИЛЬНО
logSecurityEvent('LOGIN', { email }, 'low');
```

### 2. Всегда санитизируйте пользовательский ввод
```typescript
// ❌ НЕПРАВИЛЬНО
const message = userInput;

// ✅ ПРАВИЛЬНО
const message = sanitizeText(userInput);
```

### 3. Проверяйте на injection атаки
```typescript
// ❌ НЕПРАВИЛЬНО
await sendMessage(chatId, sender, senderName, userInput);

// ✅ ПРАВИЛЬНО
if (detectSQLInjection(userInput) || detectNoSQLInjection(userInput)) {
  throw new Error('Недопустимые символы');
}
await sendMessage(chatId, sender, senderName, userInput);
```

### 4. Используйте rate limiting
```typescript
// ❌ НЕПРАВИЛЬНО
for (let i = 0; i < 100; i++) {
  await sendMessage(...);
}

// ✅ ПРАВИЛЬНО
if (!messageRateLimiter.isAllowed(`message_${sender}`)) {
  throw new Error('Слишком много сообщений');
}
await sendMessage(...);
```

### 5. Включайте 2FA для критических операций
```typescript
// ✅ ПРАВИЛЬНО
const secret = await enable2FA(userId);
// Показываем QR код пользователю
const isConfirmed = await confirm2FA(userId, userCode);
```

## Мониторинг и реагирование

### Что мониторить

1. **Попытки входа** - неудачные попытки, необычные IP адреса
2. **Попытки регистрации** - множественные попытки с одного IP
3. **Injection атаки** - попытки SQL/NoSQL injection
4. **XSS атаки** - попытки внедрения скриптов
5. **Brute force** - множественные неудачные попытки
6. **Аномальная активность** - необычные паттерны использования

### Как реагировать

1. **Low** - логируем, но не блокируем
2. **Medium** - логируем и уведомляем администратора
3. **High** - блокируем действие и уведомляем администратора
4. **Critical** - блокируем, уведомляем администратора и отправляем на сервер

## Обновление и поддержка

- Регулярно обновляйте зависимости
- Следите за уязвимостями в безопасности
- Проводите регулярные аудиты безопасности
- Обновляйте правила валидации при необходимости

## Контакты

Если вы обнаружили уязвимость в безопасности, пожалуйста, сообщите об этом немедленно.
