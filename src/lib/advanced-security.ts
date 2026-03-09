// ============ ПРОДВИНУТЫЕ ЗАЩИТЫ ============

import { logSecurityEvent } from "./security";

// ============ ЗАЩИТА ОТ CSRF ============

export class CSRFProtection {
  private tokens: Map<string, { token: string; createdAt: number }> = new Map();
  private tokenExpiry: number = 3600000; // 1 час

  generateToken(userId: string): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    this.tokens.set(userId, {
      token,
      createdAt: Date.now()
    });
    
    return token;
  }

  verifyToken(userId: string, token: string): boolean {
    const stored = this.tokens.get(userId);
    
    if (!stored) {
      logSecurityEvent('CSRF_TOKEN_NOT_FOUND', { userId }, 'high');
      return false;
    }
    
    // Проверяем срок действия
    if (Date.now() - stored.createdAt > this.tokenExpiry) {
      logSecurityEvent('CSRF_TOKEN_EXPIRED', { userId }, 'medium');
      this.tokens.delete(userId);
      return false;
    }
    
    // Проверяем совпадение
    const isValid = token === stored.token;
    
    if (!isValid) {
      logSecurityEvent('CSRF_TOKEN_MISMATCH', { userId }, 'high');
    }
    
    return isValid;
  }

  revokeToken(userId: string): void {
    this.tokens.delete(userId);
  }
}

// ============ ЗАЩИТА ОТ TIMING ATTACKS ============

export const constantTimeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};

// ============ ЗАЩИТА ОТ BRUTE FORCE ============

export class BruteForceProtection {
  private attempts: Map<string, { count: number; lastAttempt: number; locked: boolean }> = new Map();
  private maxAttempts: number = 5;
  private lockoutDuration: number = 900000; // 15 минут
  private resetWindow: number = 3600000; // 1 час

  recordAttempt(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record) {
      this.attempts.set(key, {
        count: 1,
        lastAttempt: now,
        locked: false
      });
      return true;
    }
    
    // Проверяем, заблокирован ли аккаунт
    if (record.locked) {
      if (now - record.lastAttempt > this.lockoutDuration) {
        // Разблокируем после истечения времени
        this.attempts.set(key, {
          count: 1,
          lastAttempt: now,
          locked: false
        });
        return true;
      } else {
        logSecurityEvent('BRUTE_FORCE_LOCKED', { key }, 'high');
        return false;
      }
    }
    
    // Сбрасываем счётчик если прошло достаточно времени
    if (now - record.lastAttempt > this.resetWindow) {
      this.attempts.set(key, {
        count: 1,
        lastAttempt: now,
        locked: false
      });
      return true;
    }
    
    // Увеличиваем счётчик
    record.count++;
    record.lastAttempt = now;
    
    if (record.count >= this.maxAttempts) {
      record.locked = true;
      logSecurityEvent('BRUTE_FORCE_LOCKOUT', { key, attempts: record.count }, 'critical');
      return false;
    }
    
    return true;
  }

  recordSuccess(key: string): void {
    this.attempts.delete(key);
  }

  isLocked(key: string): boolean {
    const record = this.attempts.get(key);
    return record?.locked || false;
  }

  unlock(key: string): void {
    this.attempts.delete(key);
  }
}

// ============ ЗАЩИТА ОТ XSS ============

export class XSSProtection {
  private dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<img[^>]*on/gi,
    /<svg[^>]*on/gi
  ];

  detectXSS(input: string): boolean {
    return this.dangerousPatterns.some(pattern => pattern.test(input));
  }

  sanitize(input: string): string {
    let sanitized = input;
    
    // Удаляем опасные паттерны
    this.dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized;
  }
}

// ============ ЗАЩИТА ОТ CLICKJACKING ============

export class ClickjackingProtection {
  static setHeaders(): void {
    // Эти заголовки должны быть установлены на сервере
    // X-Frame-Options: DENY
    // Content-Security-Policy: frame-ancestors 'none'
  }

  static detectFraming(): boolean {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  static preventFraming(): void {
    if (this.detectFraming()) {
      window.top!.location.href = window.self.location.href;
    }
  }
}

// ============ ЗАЩИТА ДАННЫХ ============

export class DataProtection {
  // Удаление чувствительных данных из памяти
  static clearSensitiveData(obj: any): void {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (key.toLowerCase().includes('password') || 
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('secret')) {
          obj[key] = null;
        }
      }
    }
  }

  // Безопасное копирование данных
  static secureCopy(data: any): any {
    return JSON.parse(JSON.stringify(data));
  }

  // Проверка целостности данных
  static calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  static verifyChecksum(data: string, checksum: string): boolean {
    return this.calculateChecksum(data) === checksum;
  }
}

// ============ МОНИТОРИНГ БЕЗОПАСНОСТИ ============

export interface SecurityAlert {
  id: string;
  type: 'warning' | 'critical';
  message: string;
  timestamp: number;
  details: any;
}

export class SecurityMonitor {
  private alerts: SecurityAlert[] = [];
  private maxAlerts: number = 1000;

  recordAlert(type: 'warning' | 'critical', message: string, details: any): void {
    const alert: SecurityAlert = {
      id: `alert_${Date.now()}_${Math.random()}`,
      type,
      message,
      timestamp: Date.now(),
      details
    };
    
    this.alerts.push(alert);
    
    // Ограничиваем размер массива
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }
    
    // Логируем критические события
    if (type === 'critical') {
      logSecurityEvent('SECURITY_ALERT', alert, 'critical');
    }
  }

  getAlerts(limit: number = 100): SecurityAlert[] {
    return this.alerts.slice(-limit);
  }

  clearAlerts(): void {
    this.alerts = [];
  }
}

// ============ ПРОВЕРКА ЦЕЛОСТНОСТИ ============

export class IntegrityChecker {
  private hashes: Map<string, string> = new Map();

  registerFile(fileName: string, content: string): void {
    const hash = this.calculateHash(content);
    this.hashes.set(fileName, hash);
  }

  verifyFile(fileName: string, content: string): boolean {
    const expectedHash = this.hashes.get(fileName);
    if (!expectedHash) {
      logSecurityEvent('FILE_NOT_REGISTERED', { fileName }, 'medium');
      return false;
    }
    
    const actualHash = this.calculateHash(content);
    const isValid = expectedHash === actualHash;
    
    if (!isValid) {
      logSecurityEvent('FILE_INTEGRITY_CHECK_FAILED', { fileName }, 'critical');
    }
    
    return isValid;
  }

  private calculateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
    }
    return Math.abs(hash).toString(16);
  }
}

// ============ ГЛОБАЛЬНЫЕ ЭКЗЕМПЛЯРЫ ============

export const csrfProtection = new CSRFProtection();
export const bruteForceProtection = new BruteForceProtection();
export const xssProtection = new XSSProtection();
export const securityMonitor = new SecurityMonitor();
export const integrityChecker = new IntegrityChecker();
