# 🔒 Конфигурация безопасности сервера

## HTTP заголовки безопасности

Добавьте эти заголовки в конфигурацию вашего сервера (Express, Nginx и т.д.):

### Express.js пример

```javascript
const express = require('express');
const helmet = require('helmet');
const app = express();

// Используем helmet для установки заголовков безопасности
app.use(helmet());

// Дополнительные заголовки
app.use((req, res, next) => {
  // Защита от Clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';"
  );
  
  // Защита от MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Защита от XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );
  
  // HSTS (HTTP Strict Transport Security)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  next();
});

app.listen(3000);
```

### Nginx пример

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL сертификаты
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # SSL конфигурация
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Заголовки безопасности
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';" always;
    
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;

    # Отключаем server signature
    server_tokens off;

    # Ограничиваем размер тела запроса
    client_max_body_size 10M;

    # Таймауты
    client_body_timeout 10s;
    client_header_timeout 10s;
    keepalive_timeout 5s 5s;
    send_timeout 10s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Редирект с HTTP на HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}
```

## CORS конфигурация

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 86400 // 24 часа
}));
```

## Rate Limiting на сервере

```javascript
const rateLimit = require('express-rate-limit');

// Общий rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов за окно
  message: 'Слишком много запросов, попробуйте позже',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter для входа
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 5, // максимум 5 попыток
  skipSuccessfulRequests: true,
  message: 'Слишком много попыток входа, попробуйте позже',
});

// Rate limiter для регистрации
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 3, // максимум 3 попытки
  message: 'Слишком много попыток регистрации, попробуйте позже',
});

app.use('/api/', generalLimiter);
app.post('/api/auth/login', loginLimiter, loginHandler);
app.post('/api/auth/register', registerLimiter, registerHandler);
```

## Валидация входных данных на сервере

```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/messages/send', [
  body('text')
    .trim()
    .notEmpty().withMessage('Сообщение не может быть пустым')
    .isLength({ max: 5000 }).withMessage('Сообщение слишком длинное')
    .escape(), // Санитизируем HTML
  body('chatId')
    .notEmpty().withMessage('ID чата обязателен')
    .isLength({ min: 1, max: 100 }).withMessage('Неверный ID чата'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Обрабатываем запрос
});
```

## Защита от SQL Injection (если используется SQL БД)

```javascript
// ❌ НЕПРАВИЛЬНО - уязвимо для SQL injection
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ ПРАВИЛЬНО - используем параметризованные запросы
const query = 'SELECT * FROM users WHERE email = ?';
db.query(query, [email], (err, results) => {
  // ...
});
```

## Защита от NoSQL Injection (MongoDB)

```javascript
// ❌ НЕПРАВИЛЬНО - уязвимо для NoSQL injection
db.collection('users').findOne({ email: req.body.email });

// ✅ ПРАВИЛЬНО - валидируем входные данные
const email = String(req.body.email).trim();
db.collection('users').findOne({ email: email });
```

## Логирование безопасности

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'security.log' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Логируем события безопасности
app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      logger.warn({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
    }
  });
  next();
});
```

## Переменные окружения

Создайте файл `.env`:

```env
# Сервер
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://example.com,https://www.example.com

# База данных
DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/dbname

# Firebase
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# JWT
JWT_SECRET=your_very_long_random_secret_key_here
JWT_EXPIRY=7d

# Email (для отправки уведомлений)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Логирование
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Безопасность
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_key
CSRF_TOKEN_EXPIRY=3600000
```

## Проверка безопасности

### Используйте OWASP ZAP

```bash
# Установка
brew install owasp-zap

# Запуск
zaproxy

# Сканирование вашего приложения
# Используйте UI для сканирования https://localhost:3000
```

### Используйте npm audit

```bash
# Проверка уязвимостей в зависимостях
npm audit

# Автоматическое исправление
npm audit fix

# Исправление с обновлением версий
npm audit fix --force
```

### Используйте Snyk

```bash
# Установка
npm install -g snyk

# Проверка
snyk test

# Мониторинг
snyk monitor
```

## Регулярные проверки

### Еженедельно
- [ ] Проверка логов безопасности
- [ ] Проверка попыток входа
- [ ] Проверка аномальной активности

### Ежемесячно
- [ ] Обновление зависимостей
- [ ] Проверка уязвимостей (npm audit)
- [ ] Проверка SSL сертификата
- [ ] Резервная копия базы данных

### Ежеквартально
- [ ] Полный аудит безопасности
- [ ] Тестирование на проникновение
- [ ] Обновление политик безопасности
- [ ] Обучение команды

### Ежегодно
- [ ] Сертификация безопасности
- [ ] Обновление SSL сертификата
- [ ] Полный пересмотр архитектуры безопасности

## Инцидент-менеджмент

### План реагирования на инциденты

1. **Обнаружение** - Мониторинг и алерты
2. **Анализ** - Определение типа и масштаба инцидента
3. **Содержание** - Остановка распространения
4. **Искоренение** - Удаление причины
5. **Восстановление** - Восстановление систем
6. **Уроки** - Анализ и улучшение

### Контакты для инцидентов

- Главный администратор: admin@example.com
- Команда безопасности: security@example.com
- Экстренная линия: +1-XXX-XXX-XXXX

## Ресурсы

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Последнее обновление:** 2026-03-09
**Версия:** 1.0.0
