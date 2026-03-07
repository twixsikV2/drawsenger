import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth, database } from "./firebase";
import { ref, set, get } from "firebase/database";
import { uploadImageToImgBB } from "./imgbb";

export const registerUser = async (email: string, password: string, username: string, userId: string) => {
  try {
    // Проверяем что ID не занят
    const existingUser = await get(ref(database, 'users'));
    let idExists = false;
    existingUser.forEach((child) => {
      if (child.val().userId === userId) {
        idExists = true;
      }
    });
    
    if (idExists) {
      throw new Error('Этот ID уже занят');
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Сохраняем профиль пользователя в БД
    await set(ref(database, `users/${user.uid}`), {
      email,
      username,
      userId,
      role: 'user',
      createdAt: new Date().toISOString()
    });
    
    return user;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Этот email уже зарегистрирован');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Пароль слишком слабый (минимум 6 символов)');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Неверный формат email');
    }
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('Пользователь не найден');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Неверный пароль');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Неверный формат email');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Слишком много попыток входа. Попробуйте позже');
    }
    throw new Error('Ошибка входа');
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
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
