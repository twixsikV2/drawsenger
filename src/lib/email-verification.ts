// ============ ВЕРИФИКАЦИЯ EMAIL ============

import { logSecurityEvent } from "./security";

export interface VerificationCode {
  code: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

export class EmailVerificationService {
  private codes: Map<string, VerificationCode> = new Map();
  private codeExpiry: number = 15 * 60 * 1000; // 15 минут
  private maxAttempts: number = 5;
  private sentEmails: Map<string, number[]> = new Map(); // Для rate limiting
  private maxEmailsPerHour: number = 3;

  /**
   * Генерирует 6-значный код подтверждения
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Отправляет код подтверждения на email
   */
  async sendVerificationCode(email: string): Promise<boolean> {
    try {
      // Проверяем rate limiting
      const now = Date.now();
      const sentTimes = this.sentEmails.get(email) || [];
      const recentSends = sentTimes.filter(time => now - time < 3600000); // За последний час

      if (recentSends.length >= this.maxEmailsPerHour) {
        logSecurityEvent('EMAIL_VERIFICATION_RATE_LIMIT', { email }, 'medium');
        throw new Error('Слишком много попыток отправки кода. Попробуйте позже');
      }

      // Генерируем код
      const code = this.generateCode();
      const expiresAt = now + this.codeExpiry;

      // Сохраняем код
      this.codes.set(email, {
        code,
        email,
        createdAt: now,
        expiresAt,
        attempts: 0,
        verified: false
      });

      // Обновляем счётчик отправок
      recentSends.push(now);
      this.sentEmails.set(email, recentSends);

      // Отправляем email (в реальном приложении используйте Nodemailer, SendGrid и т.д.)
      await this.sendEmail(email, code);

      logSecurityEvent('VERIFICATION_CODE_SENT', { email }, 'low');
      return true;
    } catch (error: any) {
      logSecurityEvent('VERIFICATION_CODE_SEND_ERROR', { email, error: error.message }, 'high');
      throw error;
    }
  }

  /**
   * Проверяет код подтверждения
   */
  verifyCode(email: string, code: string): boolean {
    try {
      const verification = this.codes.get(email);

      if (!verification) {
        logSecurityEvent('VERIFICATION_CODE_NOT_FOUND', { email }, 'medium');
        throw new Error('Код подтверждения не найден. Запросите новый код');
      }

      // Проверяем срок действия
      if (Date.now() > verification.expiresAt) {
        logSecurityEvent('VERIFICATION_CODE_EXPIRED', { email }, 'medium');
        this.codes.delete(email);
        throw new Error('Код подтверждения истёк. Запросите новый код');
      }

      // Проверяем количество попыток
      if (verification.attempts >= this.maxAttempts) {
        logSecurityEvent('VERIFICATION_CODE_MAX_ATTEMPTS', { email }, 'high');
        this.codes.delete(email);
        throw new Error('Слишком много неверных попыток. Запросите новый код');
      }

      // Проверяем код
      if (code !== verification.code) {
        verification.attempts++;
        logSecurityEvent('VERIFICATION_CODE_INVALID', { email, attempts: verification.attempts }, 'medium');
        throw new Error(`Неверный код. Осталось попыток: ${this.maxAttempts - verification.attempts}`);
      }

      // Код верный
      verification.verified = true;
      logSecurityEvent('VERIFICATION_CODE_VERIFIED', { email }, 'low');
      return true;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Проверяет, верифицирован ли email
   */
  isEmailVerified(email: string): boolean {
    const verification = this.codes.get(email);
    return verification?.verified || false;
  }

  /**
   * Удаляет код подтверждения
   */
  clearVerification(email: string): void {
    this.codes.delete(email);
  }

  /**
   * Отправляет email с кодом
   * В разработке используется console.log, в продакшене нужен реальный сервис
   */
  private async sendEmail(email: string, code: string): Promise<void> {
    try {
      // Проверяем, что это не тестовый email
      if (email.includes('govno') || email.includes('test@test') || email.includes('fake')) {
        logSecurityEvent('SUSPICIOUS_EMAIL_DETECTED', { email }, 'high');
        throw new Error('Недопустимый email адрес');
      }

      // В разработке логируем код в консоль
      console.log(`[DEV] Verification code for ${email}: ${code}`);
      console.log(`[DEV] Используйте этот код для подтверждения email`);
      
      // Показываем alert с кодом в разработке
      if (process.env.NODE_ENV === 'development') {
        // Используем setTimeout чтобы не блокировать выполнение
        setTimeout(() => {
          alert(`Код подтверждения для ${email}:\n\n${code}\n\nЭто сообщение только в разработке`);
        }, 100);
      }
      
      // В продакшене используйте реальный сервис отправки email
      // Пример с Nodemailer (на сервере):
      // const transporter = nodemailer.createTransport({
      //   service: 'gmail',
      //   auth: {
      //     user: process.env.EMAIL_USER,
      //     pass: process.env.EMAIL_PASSWORD
      //   }
      // });
      // await transporter.sendMail({
      //   to: email,
      //   subject: 'Код подтверждения DrawSenger',
      //   html: `<p>Ваш код подтверждения: <strong>${code}</strong></p><p>Код действует 15 минут</p>`
      // });

      // Пример с SendGrid (на сервере):
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send({
      //   to: email,
      //   from: 'noreply@drawsenger.com',
      //   subject: 'Код подтверждения DrawSenger',
      //   html: `<p>Ваш код подтверждения: <strong>${code}</strong></p>`
      // });
    } catch (error: any) {
      logSecurityEvent('EMAIL_SEND_ERROR', { email, error: error.message }, 'critical');
      throw new Error('Ошибка отправки email. Попробуйте позже');
    }
  }

  /**
   * Очищает истёкшие коды (вызывать периодически)
   */
  cleanupExpiredCodes(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [email, verification] of this.codes.entries()) {
      if (now > verification.expiresAt) {
        this.codes.delete(email);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired verification codes`);
    }
  }

  /**
   * Получает информацию о коде (для отладки)
   */
  getCodeInfo(email: string): Partial<VerificationCode> | null {
    const verification = this.codes.get(email);
    if (!verification) return null;

    return {
      email: verification.email,
      attempts: verification.attempts,
      verified: verification.verified,
      expiresAt: verification.expiresAt
    };
  }
}

// Глобальный экземпляр
export const emailVerificationService = new EmailVerificationService();

// Периодически очищаем истёкшие коды (каждые 5 минут)
setInterval(() => {
  emailVerificationService.cleanupExpiredCodes();
}, 5 * 60 * 1000);
