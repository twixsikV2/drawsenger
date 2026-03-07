import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth, database, storage } from "./firebase";
import { ref, set, get } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export const registerUser = async (email: string, password: string, username: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Сохраняем профиль пользователя в БД
    await set(ref(database, `users/${user.uid}`), {
      email,
      username,
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


export const updateUserProfile = async (userId: string, username: string, avatarUrl?: string) => {
  try {
    const updates: any = { username };
    if (avatarUrl) {
      updates.avatarUrl = avatarUrl;
    }
    await set(ref(database, `users/${userId}`), {
      ...await get(ref(database, `users/${userId}`)).then(s => s.val()),
      ...updates
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const uploadAvatar = async (userId: string, file: File) => {
  try {
    const fileName = `${userId}_avatar.jpg`;
    const avatarRef = storageRef(storage, `avatars/${fileName}`);
    
    await uploadBytes(avatarRef, file);
    const avatarUrl = await getDownloadURL(avatarRef);
    
    await updateUserProfile(userId, '', avatarUrl);
    return avatarUrl;
  } catch (error: any) {
    throw new Error(error.message);
  }
};
