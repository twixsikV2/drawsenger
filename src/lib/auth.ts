import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth, database } from "./firebase";
import { ref, set, get, remove } from "firebase/database";
import { uploadImageToImgBB } from "./imgbb";
import { 
  validateEmail, 
  validatePassword, 
  validateUsername,
  RateLimiter,
  logSecurityEvent,
  hashPassword,
  generateTOTPSecret,
  verifyTOTPCode,
  SessionManager
} from "./security";
import { emailVerificationService } from "./email-verification";

// Инициализируем rate limiters
const loginRateLimiter = new RateLimiter(5, 60000); // 5 попыток за 60 сек
const registerRateLimiter = new RateLimiter(3, 300000); // 3 попытки за 5 минут
const sessionManager = new SessionManager();

export const registerUser = async (email: string, password: string, username: string, userId: string) => {
  try {
    // Проверяем rate limit
    if (!registerRateLimiter.isAllowed(`register_${email}`)) {
      logSecurityEvent('REGISTRATION_RATE_LIMIT', { email }, 'high');
      throw new Error('Слишком много попыток регистрации. Попробуйте позже');
    }

    // Валидируем входные данные
    if (!validateEmail(email)) {
      logSecurityEvent('INVALID_EMAIL_FORMAT', { email }, 'low');
      throw new Error('Неверный формат email');
    }

    if (!validatePassword(password)) {
      throw new Error('Пароль должен содержать минимум 8 символов, заглавные, строчные буквы, цифры и спецсимволы');
    }

    if (!validateUsername(username)) {
      throw new Error('Неверный формат имени пользователя');
    }

    // Проверяем что userId не занят
    const existingUser = await get(ref(database, 'users'));
    let userIdExists = false;
    existingUser.forEach((child) => {
      if (child.val().userId === userId) {
        userIdExists = true;
      }
    });
    
    if (userIdExists) {
      logSecurityEvent('DUPLICATE_USER_ID', { userId }, 'medium');
      throw new Error('Этот ID уже занят');
    }

    // Отправляем код подтверждения на email
    await emailVerificationService.sendVerificationCode(email);

    logSecurityEvent('REGISTRATION_STARTED', { email, userId }, 'low');
    
    // Возвращаем информацию о том, что нужно подтвердить email
    return {
      status: 'verification_required',
      email,
      message: 'Код подтверждения отправлен на ваш email. Введите его для завершения регистрации'
    };
  } catch (error: any) {
    const errorCode = error.code;
    let message = 'Ошибка регистрации';
    
    if (errorCode === 'auth/email-already-in-use') {
      message = 'Этот email уже зарегистрирован';
      logSecurityEvent('DUPLICATE_EMAIL', { email }, 'medium');
    } else if (errorCode === 'auth/weak-password') {
      message = 'Пароль слишком слабый';
    } else if (errorCode === 'auth/invalid-email') {
      message = 'Неверный формат email';
    } else if (errorCode === 'auth/operation-not-allowed') {
      message = 'Регистрация временно недоступна';
    } else if (errorCode === 'auth/too-many-requests') {
      message = 'Слишком много попыток. Попробуйте позже';
      logSecurityEvent('AUTH_TOO_MANY_REQUESTS', { email }, 'high');
    } else if (error.message === 'Этот ID уже занят') {
      message = 'Этот ID уже занят';
    }
    
    throw new Error(message);
  }
};

// Подтверждение email кодом
export const confirmEmailVerification = async (email: string, code: string, password: string, username: string, userId: string) => {
  try {
    // Проверяем код подтверждения
    if (!emailVerificationService.verifyCode(email, code)) {
      throw new Error('Неверный код подтверждения');
    }

    // Создаём пользователя в Firebase
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Генерируем TOTP секрет для 2FA
    const totpSecret = generateTOTPSecret();
    
    // Сохраняем профиль пользователя в БД с хешем пароля
    const passwordHash = await hashPassword(password);
    
    await set(ref(database, `users/${user.uid}`), {
      email,
      username,
      userId,
      role: 'user',
      createdAt: new Date().toISOString(),
      passwordHash,
      totpSecret,
      twoFactorEnabled: false,
      lastLogin: null,
      loginAttempts: 0,
      accountLocked: false,
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString()
    });
    
    // Очищаем код подтверждения
    emailVerificationService.clearVerification(email);
    
    logSecurityEvent('USER_REGISTERED', { userId: user.uid, email }, 'low');
    return user;
  } catch (error: any) {
    logSecurityEvent('EMAIL_VERIFICATION_FAILED', { email, error: error.message }, 'medium');
    throw error;
  }
};

// Повторная отправка кода подтверждения
export const resendVerificationCode = async (email: string) => {
  try {
    if (!validateEmail(email)) {
      throw new Error('Неверный формат email');
    }

    await emailVerificationService.sendVerificationCode(email);
    
    logSecurityEvent('VERIFICATION_CODE_RESENT', { email }, 'low');
    return { message: 'Код подтверждения отправлен на ваш email' };
  } catch (error: any) {
    logSecurityEvent('VERIFICATION_CODE_RESEND_ERROR', { email, error: error.message }, 'medium');
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    // Проверяем rate limit
    if (!loginRateLimiter.isAllowed(`login_${email}`)) {
      logSecurityEvent('LOGIN_RATE_LIMIT', { email }, 'high');
      throw new Error('Слишком много попыток входа. Попробуйте позже');
    }

    // Валидируем email
    if (!validateEmail(email)) {
      logSecurityEvent('INVALID_LOGIN_EMAIL', { email }, 'low');
      throw new Error('Неверный формат email');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Обновляем информацию о входе
    await set(ref(database, `users/${user.uid}/lastLogin`), new Date().toISOString());
    await set(ref(database, `users/${user.uid}/loginAttempts`), 0);
    
    logSecurityEvent('USER_LOGIN', { userId: user.uid, email }, 'low');
    return user;
  } catch (error: any) {
    const errorCode = error.code;
    let message = 'Ошибка входа';
    
    if (errorCode === 'auth/user-not-found') {
      message = 'Пользователь не найден';
      logSecurityEvent('LOGIN_USER_NOT_FOUND', { email }, 'low');
    } else if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
      message = 'Неверный пароль';
      logSecurityEvent('LOGIN_WRONG_PASSWORD', { email }, 'medium');
    } else if (errorCode === 'auth/invalid-email') {
      message = 'Неверный формат email';
    } else if (errorCode === 'auth/too-many-requests') {
      message = 'Слишком много попыток входа. Попробуйте позже';
      logSecurityEvent('LOGIN_TOO_MANY_REQUESTS', { email }, 'high');
    } else if (errorCode === 'auth/user-disabled') {
      message = 'Аккаунт отключен';
      logSecurityEvent('LOGIN_DISABLED_ACCOUNT', { email }, 'high');
    } else if (errorCode === 'auth/invalid-login-credentials') {
      message = 'Неверный email или пароль';
    }
    
    throw new Error(message);
  }
};

export const logoutUser = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      logSecurityEvent('USER_LOGOUT', { userId: user.uid }, 'low');
    }
    await signOut(auth);
  } catch (error: any) {
    logSecurityEvent('LOGOUT_ERROR', { error: error.message }, 'medium');
    throw new Error(error.message);
  }
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const getUserProfile = async (userId: string) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}`));
    return snapshot.val();
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getUserUsername = async (userId: string): Promise<string> => {
  try {
    const profile = await getUserProfile(userId);
    return profile?.username || 'Unknown';
  } catch (error: any) {
    return 'Unknown';
  }
};


export const setUserRole = async (userId: string, role: 'user' | 'developer' | 'admin') => {
  try {
    await set(ref(database, `users/${userId}/role`), role);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getUserRole = async (userId: string) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/role`));
    return snapshot.val() || 'user';
  } catch (error: any) {
    throw new Error(error.message);
  }
};


export const updateUserProfile = async (userId: string, username: string, userIdDisplay?: string, avatarUrl?: string, isHidden?: boolean) => {
  try {
    const currentProfile = await get(ref(database, `users/${userId}`)).then(s => s.val());
    const updates: any = { username };
    if (userIdDisplay) {
      updates.userId = userIdDisplay;
    }
    if (avatarUrl) {
      updates.avatarUrl = avatarUrl;
    }
    if (isHidden !== undefined) {
      updates.isHidden = isHidden;
    }
    await set(ref(database, `users/${userId}`), {
      ...currentProfile,
      ...updates
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const uploadAvatar = async (userId: string, file: File) => {
  try {
    const avatarUrl = await uploadImageToImgBB(file);
    const currentProfile = await get(ref(database, `users/${userId}`)).then(s => s.val());
    await set(ref(database, `users/${userId}`), {
      ...currentProfile,
      avatarUrl
    });
    return avatarUrl;
  } catch (error: any) {
    throw new Error(error.message);
  }
};


// Заблокировать пользователя
export const blockUser = async (userId: string, blockedUserId: string) => {
  try {
    const currentBlocked = await get(ref(database, `users/${userId}/blockedUsers`)).then(s => s.val() || {});
    await set(ref(database, `users/${userId}/blockedUsers/${blockedUserId}`), true);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Разблокировать пользователя
export const unblockUser = async (userId: string, blockedUserId: string) => {
  try {
    await remove(ref(database, `users/${userId}/blockedUsers/${blockedUserId}`));
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Получить список заблокированных пользователей
export const getBlockedUsers = async (userId: string) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/blockedUsers`));
    if (!snapshot.val()) return [];
    return Object.keys(snapshot.val());
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Проверить заблокирован ли пользователь
export const isUserBlocked = async (userId: string, otherUserId: string) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/blockedUsers/${otherUserId}`));
    return snapshot.val() === true;
  } catch (error: any) {
    return false;
  }
};

// ============ ДВУХФАКТОРНАЯ АУТЕНТИФИКАЦИЯ ============

// Включить 2FA
export const enable2FA = async (userId: string): Promise<string> => {
  try {
    const totpSecret = generateTOTPSecret();
    await set(ref(database, `users/${userId}/totpSecret`), totpSecret);
    logSecurityEvent('2FA_ENABLED', { userId }, 'low');
    return totpSecret;
  } catch (error: any) {
    logSecurityEvent('2FA_ENABLE_FAILED', { userId, error: error.message }, 'high');
    throw new Error('Ошибка включения 2FA');
  }
};

// Отключить 2FA
export const disable2FA = async (userId: string): Promise<void> => {
  try {
    await set(ref(database, `users/${userId}/twoFactorEnabled`), false);
    logSecurityEvent('2FA_DISABLED', { userId }, 'low');
  } catch (error: any) {
    logSecurityEvent('2FA_DISABLE_FAILED', { userId, error: error.message }, 'high');
    throw new Error('Ошибка отключения 2FA');
  }
};

// Подтвердить 2FA
export const confirm2FA = async (userId: string, code: string): Promise<boolean> => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/totpSecret`));
    const secret = snapshot.val();
    
    if (!secret) {
      logSecurityEvent('2FA_NO_SECRET', { userId }, 'high');
      return false;
    }
    
    const isValid = verifyTOTPCode(secret, code);
    
    if (isValid) {
      await set(ref(database, `users/${userId}/twoFactorEnabled`), true);
      logSecurityEvent('2FA_CONFIRMED', { userId }, 'low');
    } else {
      logSecurityEvent('2FA_INVALID_CODE', { userId }, 'medium');
    }
    
    return isValid;
  } catch (error: any) {
    logSecurityEvent('2FA_CONFIRM_ERROR', { userId, error: error.message }, 'high');
    return false;
  }
};

// Проверить 2FA при входе
export const verify2FALogin = async (userId: string, code: string): Promise<boolean> => {
  try {
    const snapshot = await get(ref(database, `users/${userId}`));
    const user = snapshot.val();
    
    if (!user?.twoFactorEnabled) {
      return true; // 2FA не включена
    }
    
    const isValid = verifyTOTPCode(user.totpSecret, code);
    
    if (!isValid) {
      logSecurityEvent('2FA_LOGIN_FAILED', { userId }, 'high');
    }
    
    return isValid;
  } catch (error: any) {
    logSecurityEvent('2FA_LOGIN_ERROR', { userId, error: error.message }, 'high');
    return false;
  }
};
