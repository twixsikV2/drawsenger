import { database } from "./firebase";
import { ref, push, set, get, query, orderByChild, onValue, remove } from "firebase/database";

export interface Message {
  id: string;
  sender: string;
  senderName: string;
  text?: string;
  timestamp: number;
  type: 'text' | 'sticker' | 'voice' | 'call';
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
    
    callback(messages.sort((a, b) => a.timestamp - b.timestamp));
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
