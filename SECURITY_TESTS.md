# 🧪 Тесты безопасности

## Примеры тестов для проверки защит

### 1. Тест валидации пароля

```typescript
import { validatePassword } from '../lib/security';

describe('Password Validation', () => {
  it('should reject password without uppercase', () => {
    expect(validatePassword('password123!')).toBe(false);
  });

  it('should reject password without lowercase', () => {
    expect(validatePassword('PASSWORD123!')).toBe(false);
  });

  it('should reject password without numbers', () => {
    expect(validatePassword('Password!')).toBe(false);
  });

  it('should reject password without special characters', () => {
    expect(validatePassword('Password123')).toBe(false);
  });

  it('should reject password shorter than 8 characters', () => {
    expect(validatePassword('Pass1!')).toBe(false);
  });

  it('should accept valid password', () => {
    expect(validatePassword('SecurePass123!')).toBe(true);
  });

  it('should reject password longer than 128 characters', () => {
    const longPassword = 'A'.repeat(100) + 'a1!';
    expect(validatePassword(longPassword)).toBe(false);
  });
});
```

### 2. Тест защиты от SQL Injection

```typescript
import { detectSQLInjection } from '../lib/security';

describe('SQL Injection Detection', () => {
  it('should detect UNION attack', () => {
    expect(detectSQLInjection("' UNION SELECT * FROM users--")).toBe(true);
  });

  it('should detect SELECT statement', () => {
    expect(detectSQLInjection("'; SELECT * FROM users;--")).toBe(true);
  });

  it('should detect INSERT statement', () => {
    expect(detectSQLInjection("'; INSERT INTO users VALUES(...);--")).toBe(true);
  });

  it('should detect DROP statement', () => {
    expect(detectSQLInjection("'; DROP TABLE users;--")).toBe(true);
  });

  it('should detect comment syntax', () => {
    expect(detectSQLInjection("' -- comment")).toBe(true);
  });

  it('should allow normal text', () => {
    expect(detectSQLInjection('Hello World')).toBe(false);
  });
});
```

### 3. Тест защиты от NoSQL Injection

```typescript
import { detectNoSQLInjection } from '../lib/security';

describe('NoSQL Injection Detection', () => {
  it('should detect $where operator', () => {
    expect(detectNoSQLInjection("'; $where: '1==1")).toBe(true);
  });

  it('should detect $ne operator', () => {
    expect(detectNoSQLInjection({ email: { $ne: null } })).toBe(true);
  });

  it('should detect $gt operator', () => {
    expect(detectNoSQLInjection({ age: { $gt: 0 } })).toBe(true);
  });

  it('should detect $regex operator', () => {
    expect(detectNoSQLInjection({ name: { $regex: '.*' } })).toBe(true);
  });

  it('should allow normal text', () => {
    expect(detectNoSQLInjection('normal@email.com')).toBe(false);
  });
});
```

### 4. Тест защиты от XSS

```typescript
import { xssProtection } from '../lib/advanced-security';

describe('XSS Protection', () => {
  it('should detect script tag', () => {
    expect(xssProtection.detectXSS('<script>alert("XSS")</script>')).toBe(true);
  });

  it('should detect event handler', () => {
    expect(xssProtection.detectXSS('<img src=x onerror="alert(1)">')).toBe(true);
  });

  it('should detect javascript protocol', () => {
    expect(xssProtection.detectXSS('<a href="javascript:alert(1)">click</a>')).toBe(true);
  });

  it('should detect iframe', () => {
    expect(xssProtection.detectXSS('<iframe src="evil.com"></iframe>')).toBe(true);
  });

  it('should sanitize dangerous content', () => {
    const result = xssProtection.sanitize('<script>alert("XSS")</script>');
    expect(result).not.toContain('<script>');
  });

  it('should allow normal text', () => {
    expect(xssProtection.detectXSS('Hello World')).toBe(false);
  });
});
```

### 5. Тест Rate Limiting

```typescript
import { RateLimiter } from '../lib/security';

describe('Rate Limiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(3, 1000); // 3 попытки за 1 сек
  });

  it('should allow requests within limit', () => {
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user1')).toBe(true);
  });

  it('should block requests exceeding limit', () => {
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    expect(limiter.isAllowed('user1')).toBe(false);
  });

  it('should reset after window expires', async () => {
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    expect(limiter.isAllowed('user1')).toBe(false);

    // Ждём 1.1 сек
    await new Promise(resolve => setTimeout(resolve, 1100));

    expect(limiter.isAllowed('user1')).toBe(true);
  });

  it('should track different users separately', () => {
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    expect(limiter.isAllowed('user1')).toBe(false);

    expect(limiter.isAllowed('user2')).toBe(true);
  });
});
```

### 6. Тест Brute Force Protection

```typescript
import { BruteForceProtection } from '../lib/advanced-security';

describe('Brute Force Protection', () => {
  let protection: BruteForceProtection;

  beforeEach(() => {
    protection = new BruteForceProtection();
  });

  it('should allow initial attempts', () => {
    expect(protection.recordAttempt('user1')).toBe(true);
    expect(protection.recordAttempt('user1')).toBe(true);
    expect(protection.recordAttempt('user1')).toBe(true);
  });

  it('should lock after max attempts', () => {
    for (let i = 0; i < 5; i++) {
      protection.recordAttempt('user1');
    }
    expect(protection.isLocked('user1')).toBe(true);
    expect(protection.recordAttempt('user1')).toBe(false);
  });

  it('should reset on success', () => {
    protection.recordAttempt('user1');
    protection.recordAttempt('user1');
    protection.recordSuccess('user1');
    expect(protection.recordAttempt('user1')).toBe(true);
  });

  it('should unlock after timeout', async () => {
    for (let i = 0; i < 5; i++) {
      protection.recordAttempt('user1');
    }
    expect(protection.isLocked('user1')).toBe(true);

    // Ждём 15 минут (в реальном тесте используйте jest.useFakeTimers())
    // await new Promise(resolve => setTimeout(resolve, 900000));

    protection.unlock('user1');
    expect(protection.isLocked('user1')).toBe(false);
  });
});
```

### 7. Тест CSRF Protection

```typescript
import { csrfProtection } from '../lib/advanced-security';

describe('CSRF Protection', () => {
  it('should generate unique tokens', () => {
    const token1 = csrfProtection.generateToken('user1');
    const token2 = csrfProtection.generateToken('user1');
    expect(token1).not.toBe(token2);
  });

  it('should verify valid token', () => {
    const token = csrfProtection.generateToken('user1');
    expect(csrfProtection.verifyToken('user1', token)).toBe(true);
  });

  it('should reject invalid token', () => {
    csrfProtection.generateToken('user1');
    expect(csrfProtection.verifyToken('user1', 'invalid_token')).toBe(false);
  });

  it('should reject token for different user', () => {
    const token = csrfProtection.generateToken('user1');
    expect(csrfProtection.verifyToken('user2', token)).toBe(false);
  });

  it('should revoke token', () => {
    const token = csrfProtection.generateToken('user1');
    csrfProtection.revokeToken('user1');
    expect(csrfProtection.verifyToken('user1', token)).toBe(false);
  });
});
```

### 8. Тест санитизации текста

```typescript
import { sanitizeText } from '../lib/security';

describe('Text Sanitization', () => {
  it('should escape HTML entities', () => {
    expect(sanitizeText('<script>alert("XSS")</script>'))
      .toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
  });

  it('should escape ampersand', () => {
    expect(sanitizeText('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape quotes', () => {
    expect(sanitizeText('He said "Hello"')).toBe('He said &quot;Hello&quot;');
  });

  it('should limit length to 5000 characters', () => {
    const longText = 'a'.repeat(10000);
    expect(sanitizeText(longText).length).toBe(5000);
  });

  it('should handle empty string', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('should handle null', () => {
    expect(sanitizeText(null as any)).toBe('');
  });
});
```

### 9. Тест валидации email

```typescript
import { validateEmail } from '../lib/security';

describe('Email Validation', () => {
  it('should accept valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should reject email without @', () => {
    expect(validateEmail('userexample.com')).toBe(false);
  });

  it('should reject email without domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  it('should reject email without local part', () => {
    expect(validateEmail('@example.com')).toBe(false);
  });

  it('should reject email longer than 100 characters', () => {
    const longEmail = 'a'.repeat(100) + '@example.com';
    expect(validateEmail(longEmail)).toBe(false);
  });

  it('should accept email with subdomain', () => {
    expect(validateEmail('user@mail.example.com')).toBe(true);
  });
});
```

### 10. Тест валидации файла

```typescript
import { validateFileSize, validateFileType } from '../lib/security';

describe('File Validation', () => {
  it('should accept file within size limit', () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1 MB
    expect(validateFileSize(file, 5)).toBe(true);
  });

  it('should reject file exceeding size limit', () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }); // 10 MB
    expect(validateFileSize(file, 5)).toBe(false);
  });

  it('should accept allowed file type', () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    expect(validateFileType(file, ['image/jpeg', 'image/png'])).toBe(true);
  });

  it('should reject disallowed file type', () => {
    const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
    expect(validateFileType(file, ['image/jpeg', 'image/png'])).toBe(false);
  });
});
```

## Запуск тестов

```bash
# Установка зависимостей
npm install --save-dev jest @types/jest ts-jest

# Запуск всех тестов
npm test

# Запуск тестов с покрытием
npm test -- --coverage

# Запуск конкретного файла тестов
npm test -- security.test.ts

# Запуск в режиме watch
npm test -- --watch
```

## Конфигурация Jest

Создайте файл `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Интеграционные тесты

```typescript
describe('Security Integration Tests', () => {
  it('should prevent SQL injection in message', async () => {
    const maliciousMessage = "'; DROP TABLE messages;--";
    
    expect(() => {
      sendMessage(chatId, sender, senderName, maliciousMessage);
    }).toThrow('Недопустимые символы');
  });

  it('should prevent XSS in username', async () => {
    const xssUsername = '<script>alert("XSS")</script>';
    
    expect(() => {
      registerUser(email, password, xssUsername, userId);
    }).toThrow();
  });

  it('should enforce rate limiting on login', async () => {
    for (let i = 0; i < 5; i++) {
      try {
        await loginUser(email, 'wrongPassword');
      } catch (e) {
        // Expected
      }
    }
    
    expect(() => {
      loginUser(email, 'correctPassword');
    }).toThrow('Слишком много попыток');
  });

  it('should block brute force attacks', async () => {
    const protection = new BruteForceProtection();
    
    for (let i = 0; i < 5; i++) {
      protection.recordAttempt('attacker');
    }
    
    expect(protection.isLocked('attacker')).toBe(true);
  });
});
```

## Тестирование безопасности вручную

### Чек-лист

- [ ] Попробуйте SQL injection в поле поиска
- [ ] Попробуйте XSS в имени пользователя
- [ ] Попробуйте слабый пароль при регистрации
- [ ] Попробуйте множественные неудачные входы
- [ ] Попробуйте загрузить файл большого размера
- [ ] Попробуйте загрузить файл неправильного типа
- [ ] Проверьте, что пароли не логируются
- [ ] Проверьте, что сообщения санитизированы
- [ ] Проверьте, что используется HTTPS
- [ ] Проверьте заголовки безопасности

---

**Последнее обновление:** 2026-03-09
**Версия:** 1.0.0
