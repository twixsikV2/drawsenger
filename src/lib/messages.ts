import { database } from "./firebase";
import { ref, push, set, get, onValue, remove } from "firebase/database";
import { uploadImageToImgBB } from "./imgbb";

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
  reactions?: { [emoji: string]: string[] }; // emoji -> array of user IDs
  isEdited?: boolean;
  editedAt?: number;
  isRead?: boolean;
  readAt?: number;
  replyTo?: {
    messageId: string;
    senderName: string;
    text: string;
  };
}

export interface Chat {
  id: string;
  name: string;
  type: 'private' | 'group' | 'channel' | 'favorites';
  createdAt: number;
  members: string[];
  messages: Message[];
  avatarUrl?: string;
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
export const sendMessage = async (chatId: string, sender: string, senderName: string, text: string, replyTo?: { messageId: string; senderName: string; text: string }) => {
  try {
    // Проверяем блокировку - получаем членов чата
    const chatRef = ref(database, `chats/${chatId}`);
    const chatSnapshot = await get(chatRef);
    const chat = chatSnapshot.val();
    
    if (chat && chat.type === 'private' && chat.members) {
      const otherUserId = chat.members.find((id: string) => id !== sender);
      if (otherUserId) {
        const { isUserBlocked } = await import('./auth');
        const blocked = await isUserBlocked(otherUserId, sender);
        if (blocked) {
          throw new Error('Вы заблокированы этим пользователем');
        }
      }
    }
    
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);
    
    const messageData: any = {
      sender,
      senderName,
      text,
      timestamp: Date.now(),
      type: 'text'
    };
    
    if (replyTo) {
      messageData.replyTo = replyTo;
    }
    
    await set(newMessageRef, messageData);

    // Проверяем размер и удаляем большие старые сообщения если нужно
    const { cleanupLargeMessages } = await import('./imgbb');
    cleanupLargeMessages(database, ref, remove).catch(err => console.error('Cleanup error:', err));
    
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

// Поиск пользователя только по ID
export const searchUser = async (query: string) => {
  try {
    const snapshot = await get(ref(database, 'users'));
    let foundUser = null;
    
    snapshot.forEach((childSnapshot) => {
      const user = childSnapshot.val();
      const userId = childSnapshot.key || '';
      
      // Ищем только по userId (ID отображения) и проверяем что пользователь не скрыт
      if (user.userId === query && !user.isHidden) {
        foundUser = {
          id: userId,
          username: user.username,
          userId: user.userId,
          avatarUrl: user.avatarUrl
        };
      }
    });
    
    return foundUser;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Создать приватный чат с пользователем
export const createPrivateChat = async (userId: string, otherUserId: string, otherUserName: string): Promise<Chat> => {
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
    
    // Создаём новый чат в Firebase
    const chatId = `${userId}_${otherUserId}`;
    const chatData = {
      name: otherUserName,
      type: 'private',
      createdAt: Date.now(),
      members: [userId, otherUserId],
      messages: {}
    };
    
    await set(ref(database, `chats/${chatId}`), chatData);
    
    // Добавляем чат в список чатов пользователя
    await set(ref(database, `userChats/${userId}/${chatId}`), true);
    await set(ref(database, `userChats/${otherUserId}/${chatId}`), true);
    
    return {
      id: chatId,
      name: otherUserName,
      type: 'private',
      createdAt: Date.now(),
      members: [userId, otherUserId],
      messages: []
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Убедиться, что оба пользователя имеют чат (вызывается при отправке сообщения)
export const ensurePrivateChatExists = async (userId: string, otherUserId: string, otherUserName: string, currentUserName: string) => {
  try {
    // Проверяем, есть ли уже чат между этими пользователями
    const snapshot = await get(ref(database, 'chats'));
    let existingChatId: string | null = null;
    
    snapshot.forEach((childSnapshot) => {
      const chat = childSnapshot.val();
      if (chat.type === 'private' && 
          chat.members && 
          chat.members.includes(userId) && 
          chat.members.includes(otherUserId)) {
        existingChatId = childSnapshot.key || '';
      }
    });
    
    if (existingChatId) {
      return existingChatId;
    }
    
    // Создаем новый приватный чат если его нет
    const chatsRef = ref(database, 'chats');
    const newChatRef = push(chatsRef);
    
    await set(newChatRef, {
      name: otherUserName,
      type: 'private',
      createdAt: Date.now(),
      members: [userId, otherUserId]
    });
    
    return newChatRef.key || '';
  } catch (error: any) {
    throw new Error(error.message);
  }
};


// Отправить фото
export const sendPhoto = async (chatId: string, sender: string, senderName: string, file: File) => {
  try {
    const photoUrl = await uploadImageToImgBB(file);
    
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);
    
    await set(newMessageRef, {
      sender,
      senderName,
      photoUrl,
      timestamp: Date.now(),
      type: 'photo'
    });

    // Проверяем размер и удаляем большие старые сообщения если нужно
    const { cleanupLargeMessages } = await import('./imgbb');
    cleanupLargeMessages(database, ref, remove).catch(err => console.error('Cleanup error:', err));
    
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

    // Проверяем размер и удаляем большие старые сообщения если нужно
    const { cleanupLargeMessages } = await import('./imgbb');
    cleanupLargeMessages(database, ref, remove).catch(err => console.error('Cleanup error:', err));
    
    return newMessageRef.key;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Отправить голосовое сообщение
export const sendVoiceMessage = async (chatId: string, sender: string, senderName: string, duration: number, audioBlob: Blob) => {
  try {
    const file = new File([audioBlob], `${Date.now()}_voice.wav`, { type: 'audio/wav' });
    const voiceUrl = await uploadImageToImgBB(file);
    
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);
    
    await set(newMessageRef, {
      sender,
      senderName,
      voiceData: { duration, url: voiceUrl },
      timestamp: Date.now(),
      type: 'voice'
    });

    // Проверяем размер и удаляем большие старые сообщения если нужно
    const { cleanupLargeMessages } = await import('./imgbb');
    cleanupLargeMessages(database, ref, remove).catch(err => console.error('Cleanup error:', err));
    
    return newMessageRef.key;
  } catch (error: any) {
    throw new Error(error.message);
  }
};


// Слушать изменения в списке чатов пользователя
export const listenToUserChats = (userId: string, callback: (chats: Chat[]) => void) => {
  const chatsRef = ref(database, 'chats');
  
  const unsubscribe = onValue(chatsRef, async (snapshot) => {
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
    
    callback(chats);
  });
  
  return unsubscribe;
};


// Удалить чат у пользователя
export const deleteUserChat = async (userId: string, chatId: string) => {
  try {
    const userChatsRef = ref(database, `users/${userId}/chats/${chatId}`);
    await remove(userChatsRef);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Удалить чат полностью (для всех)
export const deleteChat = async (chatId: string) => {
  try {
    const chatRef = ref(database, `chats/${chatId}`);
    await remove(chatRef);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Закрепить/открепить чат
export const togglePinChat = async (userId: string, chatId: string, isPinned: boolean) => {
  try {
    const pinnedRef = ref(database, `users/${userId}/pinnedChats/${chatId}`);
    if (isPinned) {
      await set(pinnedRef, true);
    } else {
      await remove(pinnedRef);
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Получить закрепленные чаты
export const getPinnedChats = async (userId: string): Promise<string[]> => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/pinnedChats`));
    if (!snapshot.val()) return [];
    return Object.keys(snapshot.val());
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Создать группу
export const createGroup = async (groupName: string, creatorId: string, members: string[]) => {
  try {
    const chatsRef = ref(database, 'chats');
    const newChatRef = push(chatsRef);
    
    await set(newChatRef, {
      name: groupName,
      type: 'group',
      createdAt: Date.now(),
      members: [creatorId, ...members],
      creator: creatorId
    });
    
    return {
      id: newChatRef.key || '',
      name: groupName,
      type: 'group',
      createdAt: Date.now(),
      members: [creatorId, ...members]
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Пригласить пользователя в группу
export const inviteUserToGroup = async (chatId: string, userId: string) => {
  try {
    const chatRef = ref(database, `chats/${chatId}`);
    const snapshot = await get(chatRef);
    const chat = snapshot.val();
    
    if (!chat) {
      throw new Error('Чат не найден');
    }
    
    const members = chat.members || [];
    if (members.includes(userId)) {
      throw new Error('Пользователь уже в группе');
    }
    
    members.push(userId);
    await set(chatRef, {
      ...chat,
      members
    });
    
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Удалить пользователя из группы
export const removeUserFromGroup = async (chatId: string, userId: string) => {
  try {
    const chatRef = ref(database, `chats/${chatId}`);
    const snapshot = await get(chatRef);
    const chat = snapshot.val();
    
    if (!chat) {
      throw new Error('Чат не найден');
    }
    
    const members = (chat.members || []).filter((id: string) => id !== userId);
    await set(chatRef, {
      ...chat,
      members
    });
    
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Получить членов группы
export const getGroupMembers = async (chatId: string) => {
  try {
    const snapshot = await get(ref(database, `chats/${chatId}/members`));
    return snapshot.val() || [];
  } catch (error: any) {
    throw new Error(error.message);
  }
};


// Получить информацию о группе
export const getGroupInfo = async (chatId: string) => {
  try {
    const snapshot = await get(ref(database, `chats/${chatId}`));
    return snapshot.val();
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Удалить группу
export const deleteGroup = async (chatId: string) => {
  try {
    await remove(ref(database, `chats/${chatId}`));
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Обновить имя группы
export const updateGroupName = async (chatId: string, newName: string) => {
  try {
    const chatRef = ref(database, `chats/${chatId}`);
    const snapshot = await get(chatRef);
    const chat = snapshot.val();
    
    if (!chat) {
      throw new Error('Группа не найдена');
    }
    
    await set(chatRef, {
      ...chat,
      name: newName
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Инициализировать чат "Избранное" для пользователя
export const initializeFavoritesChat = async (userId: string): Promise<string> => {
  try {
    // Проверяем, есть ли уже чат "Избранное" для этого пользователя
    const snapshot = await get(ref(database, 'chats'));
    let favoritesId: string | null = null;
    
    snapshot.forEach((childSnapshot) => {
      const chat = childSnapshot.val();
      if (chat.type === 'favorites' && chat.members && chat.members.includes(userId)) {
        favoritesId = childSnapshot.key || '';
      }
    });
    
    if (favoritesId) {
      return favoritesId;
    }
    
    // Создаём новый чат "Избранное"
    const chatsRef = ref(database, 'chats');
    const newChatRef = push(chatsRef);
    
    await set(newChatRef, {
      name: 'Избранное',
      type: 'favorites',
      createdAt: Date.now(),
      members: [userId]
    });
    
    return newChatRef.key || '';
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Добавить реакцию на сообщение
export const addReaction = async (chatId: string, messageId: string, emoji: string, userId: string) => {
  try {
    const reactionsRef = ref(database, `chats/${chatId}/messages/${messageId}/reactions/${emoji}`);
    const snapshot = await get(reactionsRef);
    const users = snapshot.val() || [];
    
    if (!users.includes(userId)) {
      users.push(userId);
      await set(reactionsRef, users);
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Удалить реакцию с сообщения
export const removeReaction = async (chatId: string, messageId: string, emoji: string, userId: string) => {
  try {
    const reactionsRef = ref(database, `chats/${chatId}/messages/${messageId}/reactions/${emoji}`);
    const snapshot = await get(reactionsRef);
    const users = snapshot.val() || [];
    
    const filtered = users.filter((id: string) => id !== userId);
    if (filtered.length === 0) {
      await remove(reactionsRef);
    } else {
      await set(reactionsRef, filtered);
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Редактировать сообщение
export const editMessage = async (chatId: string, messageId: string, newText: string) => {
  try {
    const messageRef = ref(database, `chats/${chatId}/messages/${messageId}`);
    const snapshot = await get(messageRef);
    const message = snapshot.val();
    
    await set(messageRef, {
      ...message,
      text: newText,
      isEdited: true,
      editedAt: Date.now()
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Отметить сообщение как прочитанное
export const markMessageAsRead = async (chatId: string, messageId: string, userId: string) => {
  try {
    const readRef = ref(database, `chats/${chatId}/messages/${messageId}/readBy/${userId}`);
    await set(readRef, Date.now());
  } catch (error: any) {
    throw new Error(error.message);
  }
};
