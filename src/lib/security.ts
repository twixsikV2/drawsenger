// ============ КРИПТОГРАФИЯ ============

// Генерация криптографически стойкого ключа
export const generateSecureKey = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Хеширование пароля (используется для дополнительной проверки)
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Шифрование сообщения (AES-GCM)
export const encryptMessage = async (message: string, key: string): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Генерируем IV (инициализационный вектор)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Импортируем ключ
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(key.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // Шифруем
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );
    
    // Объединяем IV и зашифрованные данные
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return Array.from(combined, byte => byte.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    logSecurityEvent('ENCRYPTION_FAILED', error);
    throw new Error('Ошибка шифрования сообщения');
  }
};

// Расшифровка сообщения
export const decryptMessage = async (encryptedMessage: string, key: string): Promise<string> => {
  try {
    const combined = new Uint8Array(encryptedMessage.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(key.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    logSecurityEvent('DECRYPTION_FAILED', error);
    throw new Error('Ошибка расшифровки сообщения');
  }
};

// ============ САНИТИЗАЦИЯ И ВАЛИДАЦИЯ ============

// Санитизация текста от XSS атак
export const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .substring(0, 5000); // Ограничиваем длину
};

// Валидация ID пользователя
export const validateUserId = (userId: string): boolean => {
  if (!userId || typeof userId !== 'string') return false;
  if (userId.length < 3 || userId.length > 50) return false;
  // Только буквы, цифры, подчеркивание, дефис
  return /^[a-zA-Z0-9_-]+$/.test(userId);
};

// Валидация email с более строгими правилами
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 100;
};

// Валидация пароля с требованиями безопасности
export const validatePassword = (password: string): boolean => {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 128) return false;
  
  // Требует: заглавные, строчные, цифры, спецсимволы
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
};

// Валидация имени пользователя
export const validateUsername = (username: string): boolean => {
  if (!username || typeof username !== 'string') return false;
  if (username.length < 2 || username.length > 50) return false;
  // Буквы, цифры, пробелы, подчеркивание
  return /^[a-zA-Z0-9_\s]+$/.test(username);
};

// Валидация названия группы
export const validateGroupName = (name: string): boolean => {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 1 || name.length > 100) return false;
  return /^[a-zA-Z0-9_\s\-]+$/.test(name);
};

// Валидация размера файла
export const validateFileSize = (file: File, maxSizeMB: number = 5): boolean => {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
};

// Валидация типа файла
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

// Защита от Rate Limiting
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Удаляем старые попытки
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { key, attempts: recentAttempts.length });
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// ============ ДВУХФАКТОРНАЯ АУТЕНТИФИКАЦИЯ ============

// Генерация TOTP секрета
export const generateTOTPSecret = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
};

// Проверка TOTP кода
export const verifyTOTPCode = (secret: string, code: string): boolean => {
  if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
    return false;
  }
  
  // Базовая проверка (в продакшене используйте speakeasy или similar)
  const time = Math.floor(Date.now() / 30000);
  const expectedCode = generateTOTPCode(secret, time);
  
  // Проверяем текущий и соседние временные окна
  return (
    code === expectedCode ||
    code === generateTOTPCode(secret, time - 1) ||
    code === generateTOTPCode(secret, time + 1)
  );
};

// Генерация TOTP кода (упрощённая версия)
const generateTOTPCode = (secret: string, time: number): string => {
  // В продакшене используйте полную реализацию HMAC-SHA1
  const hash = Math.abs(
    secret.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0) + time
  );
  return String(hash % 1000000).padStart(6, '0');
};

// ============ ЗАЩИТА ОТ CSRF ============

// Генерация CSRF токена
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Проверка CSRF токена
export const verifyCSRFToken = (token: string, storedToken: string): boolean => {
  if (!token || !storedToken) return false;
  return token === storedToken;
};

// ============ АУДИТ И ЛОГИРОВАНИЕ ============

export interface SecurityLog {
  timestamp: string;
  event: string;
  userId?: string;
  ipAddress?: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Логирование безопасности с деталями
export const logSecurityEvent = (event: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void => {
  const log: SecurityLog = {
    timestamp: new Date().toISOString(),
    event,
    details,
    severity,
    ipAddress: getClientIP()
  };
  
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[SECURITY - ${severity.toUpperCase()}] ${event}:`, details);
  }
  
  // Отправляем критические события на сервер
  if (severity === 'critical' || severity === 'high') {
    sendSecurityLogToServer(log);
  }
};

// Получение IP адреса клиента (упрощённо)
const getClientIP = (): string => {
  return 'client-ip';
};

// Отправка логов на сервер
const sendSecurityLogToServer = async (log: SecurityLog): Promise<void> => {
  try {
    // Отправляем на ваш сервер для анализа
    await fetch('/api/security-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    });
  } catch (error) {
    console.error('Failed to send security log:', error);
  }
};

// ============ ЗАЩИТА ОТ INJECTION АТАК ============

// Проверка на SQL injection паттерны
export const detectSQLInjection = (input: string): boolean => {
  const sqlPatterns = [
    /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(-{2}|\/\*|\*\/|;)/g,
    /(OR|AND)\s*1\s*=\s*1/gi
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

// Проверка на NoSQL injection
export const detectNoSQLInjection = (input: string): boolean => {
  const noSqlPatterns = [
    /[\$\{\}]/g,
    /\$where/gi,
    /\$ne/gi,
    /\$gt/gi,
    /\$regex/gi
  ];
  
  return noSqlPatterns.some(pattern => pattern.test(input));
};

// ============ ЗАЩИТА ФАЙЛОВ ============

// Валидация размера файла
export const validateFileSize = (file: File, maxSizeMB: number = 5): boolean => {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
};

// Валидация типа файла с проверкой MIME
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  if (!allowedTypes.includes(file.type)) {
    logSecurityEvent('INVALID_FILE_TYPE', { fileName: file.name, type: file.type }, 'medium');
    return false;
  }
  return true;
};

// Проверка расширения файла
export const validateFileExtension = (fileName: string, allowedExtensions: string[]): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return allowedExtensions.includes(extension);
};

// ============ ЗАЩИТА СЕССИИ ============

export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private sessionTimeout: number = 30 * 60 * 1000; // 30 минут

  interface SessionData {
    userId: string;
    token: string;
    createdAt: number;
    lastActivity: number;
    ipAddress: string;
  }

  createSession(userId: string, ipAddress: string): string {
    const token = generateSecureKey();
    const now = Date.now();
    
    this.sessions.set(token, {
      userId,
      token,
      createdAt: now,
      lastActivity: now,
      ipAddress
    });
    
    return token;
  }

  validateSession(token: string, ipAddress: string): boolean {
    const session = this.sessions.get(token);
    
    if (!session) {
      logSecurityEvent('INVALID_SESSION_TOKEN', { token }, 'high');
      return false;
    }
    
    // Проверяем IP адрес
    if (session.ipAddress !== ipAddress) {
      logSecurityEvent('SESSION_IP_MISMATCH', { token, expectedIP: session.ipAddress, actualIP: ipAddress }, 'critical');
      this.sessions.delete(token);
      return false;
    }
    
    // Проверяем timeout
    if (Date.now() - session.lastActivity > this.sessionTimeout) {
      logSecurityEvent('SESSION_TIMEOUT', { token }, 'low');
      this.sessions.delete(token);
      return false;
    }
    
    // Обновляем время последней активности
    session.lastActivity = Date.now();
    return true;
  }

  destroySession(token: string): void {
    this.sessions.delete(token);
  }
}

// ============ ВАЛИДАЦИЯ ГРУПП ============

// Валидация названия группы
export const validateGroupName = (name: string): boolean => {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 1 || name.length > 100) return false;
  return /^[a-zA-Z0-9_\s\-]+$/.test(name);
};
