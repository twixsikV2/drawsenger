import { database, storage } from "./firebase";
import { ref, push, set, get, onValue, remove } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export interface Message {
  id: string;
  sender: string;
  senderName: string;
  text?: string;
  photoUrl?: string;
  timestamp: number;
  type: 'text' | 'sticker' | 'voice' | 'call' | 'photo';
  stickerId?: string;
  voiceData?: { duration: number; url: string };
  callDuration?: number;
}

export interface Chat {
  id: string;
  name: string;
  type: 'private' | 'group' | 'channel';
  createdAt: number;
  members: string[];
}

// Создать новый чат
export const createChat = async (chatName: string, chatType: 'private' | 'group' | 'channel', members: string[]) => {
  try {
    const chatsRef = ref(database, 'chats');
    const newChatRef = push(chatsRef);
    
    await set(newChatRef, {
      name: chatName,
      type: chatType,
      createdAt: Date.now(),
      members
    });
    
    return newChatRef.key;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Отправить сообщение
export const sendMessage = async (chatId: string, sender: string, senderName: string, text: string) => {
  try {
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);
    
    await set(newMessageRef, {
      sender,
      senderName,
      text,
      timestamp: Date.now(),
      type: 'text'
    });
    
    return newMessageRef.key;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Получить все сообщения чата
export const getMessages = async (chatId: string): Promise<Message[]> => {
  try {
    const snapshot = await get(ref(database, `chats/${chatId}/messages`));
    const messages: Message[] = [];
    
    snapshot.forEach((childSnapshot) => {
      messages.push({
        id: childSnapshot.key || '',
        ...childSnapshot.val()
      });
    });
    
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Слушать сообщения в реальном времени
export const listenToMessages = (chatId: string, callback: (messages: Message[]) => void) => {
  const messagesRef = ref(database, `chats/${chatId}/messages`);
  
  return onValue(messagesRef, (snapshot) => {
    const messages: Message[] = [];
    
    snapshot.forEach((childSnapshot) => {
      messages.push({
        id: childSnapshot.key || '',
        ...childSnapshot.val()
      });
    });
    
    // Сортируем по timestamp, потом по ID для стабильности
    callback(messages.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return a.id.localeCompare(b.id);
    }));
  });
};

// Удалить сообщение
export const deleteMessage = async (chatId: string, messageId: string) => {
  try {
    await remove(ref(database, `chats/${chatId}/messages/${messageId}`));
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Получить все чаты пользователя
export const getUserChats = async (userId: string): Promise<Chat[]> => {
  try {
    const snapshot = await get(ref(database, 'chats'));
    const chats: Chat[] = [];
    
    snapshot.forEach((childSnapshot) => {
      const chat = childSnapshot.val();
      if (chat.members && chat.members.includes(userId)) {
        chats.push({
          id: childSnapshot.key || '',
          ...chat
        });
      }
    });
    
    return chats;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Поиск пользователя по email, username или ID
export const searchUser = async (query: string) => {
  try {
    const snapshot = await get(ref(database, 'users'));
    let foundUser = null;
    
    snapshot.forEach((childSnapshot) => {
      const user = childSnapshot.val();
      const userId = childSnapshot.key || '';
      
      if (user.email === query || 
          user.username?.toLowerCase() === query.toLowerCase() || 
          userId === query) {
        foundUser = {
          id: userId,
          ...user
        };
      }
    });
    
    return foundUser;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Создать приватный чат с пользователем
export const createPrivateChat = async (userId: string, otherUserId: string, otherUserName: string) => {
  try {
    // Проверяем, есть ли уже чат между этими пользователями
    const snapshot = await get(ref(database, 'chats'));
    let existingChat = null;
    
    snapshot.forEach((childSnapshot) => {
      const chat = childSnapshot.val();
      if (chat.type === 'private' && 
          chat.members && 
          chat.members.includes(userId) && 
          chat.members.includes(otherUserId)) {
        existingChat = {
          id: childSnapshot.key || '',
          ...chat
        };
      }
    });
    
    if (existingChat) {
      return existingChat;
    }
    
    // Создаем новый приватный чат
    const chatsRef = ref(database, 'chats');
    const newChatRef = push(chatsRef);
    
    await set(newChatRef, {
      name: otherUserName,
      type: 'private',
      createdAt: Date.now(),
      members: [userId, otherUserId]
    });
    
    return {
      id: newChatRef.key || '',
      name: otherUserName,
      type: 'private',
      createdAt: Date.now(),
      members: [userId, otherUserId]
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
};


// Отправить фото
export const sendPhoto = async (chatId: string, sender: string, senderName: string, file: File) => {
  try {
    const fileName = `${Date.now()}_${file.name}`;
    const photoRef = storageRef(storage, `chats/${chatId}/photos/${fileName}`);
    
    await uploadBytes(photoRef, file);
    const photoUrl = await getDownloadURL(photoRef);
    
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);
    
    await set(newMessageRef, {
      sender,
      senderName,
      photoUrl,
      timestamp: Date.now(),
      type: 'photo'
    });
    
    return newMessageRef.key;
  } catch (error: any) {
    throw new Error(error.message);
  }
};


// Отправить стикер
export const sendSticker = async (chatId: string, sender: string, senderName: string, stickerId: string) => {
  try {
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);
    
    await set(newMessageRef, {
      sender,
      senderName,
      stickerId,
      timestamp: Date.now(),
      type: 'sticker'
    });
    
    return newMessageRef.key;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Отправить голосовое сообщение
export const sendVoiceMessage = async (chatId: string, sender: string, senderName: string, duration: number, audioBlob: Blob) => {
  try {
    const fileName = `${Date.now()}_voice.wav`;
    const voiceRef = storageRef(storage, `chats/${chatId}/voice/${fileName}`);
    
    await uploadBytes(voiceRef, audioBlob);
    const voiceUrl = await getDownloadURL(voiceRef);
    
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);
    
    await set(newMessageRef, {
      sender,
      senderName,
      voiceData: { duration, url: voiceUrl },
      timestamp: Date.now(),
      type: 'voice'
    });
    
    return newMessageRef.key;
  } catch (error: any) {
    throw new Error(error.message);
  }
};
