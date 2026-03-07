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
    throw new Error(error.message);
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
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
