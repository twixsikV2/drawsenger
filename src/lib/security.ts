// Санитизация текста от XSS атак
export const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .substring(0, 5000); // Ограничиваем длину
};

// Валидация ID пользователя
export const validateUserId = (userId: string): boolean => {
  if (!userId || typeof userId !== 'string') return false;
  if (userId.length < 3 || userId.length > 50) return false;
  // Только буквы, цифры, подчеркивание, дефис
  return /^[a-zA-Z0-9_-]+$/.test(userId);
};

// Валидация email
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 100;
};

// Валидация пароля
export const validatePassword = (password: string): boolean => {
  if (!password || typeof password !== 'string') return false;
  // Минимум 6 символов
  return password.length >= 6 && password.length <= 128;
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

// Логирование безопасности
export const logSecurityEvent = (event: string, details: any): void => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[SECURITY] ${event}:`, details);
  }
};
