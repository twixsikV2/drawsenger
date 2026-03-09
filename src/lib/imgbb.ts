export const uploadImageToImgBB = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      console.log('Фото конвертировано в base64, размер:', base64.length);
      resolve(base64);
    };
    
    reader.onerror = () => {
      reject(new Error('Ошибка чтения файла'));
    };
    
    reader.readAsDataURL(file);
  });
};

export const cleanupOldPhotos = async (database: any, ref: any, set: any, remove: any) => {
  try {
    const chatsRef = ref(database, 'chats');
    const snapshot = await new Promise<any>((resolve) => {
      const listener = chatsRef.on('value', (snap: any) => {
        chatsRef.off('value', listener);
        resolve(snap);
      });
    });

    if (!snapshot.val()) return;

    const chats = snapshot.val();
    let totalSize = 0;
    const photoMessages: any[] = [];

    // Собираем все фото с их размерами и временем (только из сообщений, не аватары)
    for (const chatId in chats) {
      const messages = chats[chatId].messages || {};
      for (const msgId in messages) {
        const msg = messages[msgId];
        if (msg.type === 'photo' && msg.photoUrl) {
          const size = msg.photoUrl.length;
          totalSize += size;
          photoMessages.push({
            chatId,
            msgId,
            size,
            timestamp: msg.timestamp || 0,
            photoUrl: msg.photoUrl
          });
        }
      }
    }

    console.log(`Общий размер фото в сообщениях: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

    // Если превышено 950MB, удаляем старые фото
    if (totalSize > 950 * 1024 * 1024) {
      console.log('Превышен лимит 950MB, удаляю старые фото...');
      
      // Сортируем по времени (старые первыми)
      photoMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      let deletedSize = 0;

      for (const photo of photoMessages) {
        // Не удаляем фото моложе недели
        if (photo.timestamp > oneWeekAgo) {
          break;
        }

        const msgRef = ref(database, `chats/${photo.chatId}/messages/${photo.msgId}`);
        await remove(msgRef);
        deletedSize += photo.size;
        totalSize -= photo.size;

        console.log(`Удалено фото (${(photo.size / 1024 / 1024).toFixed(2)}MB), осталось: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

        // Если уже очистили до 30MB, останавливаемся
        if (totalSize <= 30 * 1024 * 1024) {
          break;
        }
      }

      console.log(`Очистка завершена. Удалено: ${(deletedSize / 1024 / 1024).toFixed(2)}MB`);
    }
  } catch (error) {
    console.error('Ошибка при очистке фото:', error);
  }
};


export const cleanupLargeMessages = async (database: any, ref: any, remove: any) => {
  try {
    const chatsRef = ref(database, 'chats');
    const snapshot = await new Promise<any>((resolve) => {
      const listener = chatsRef.on('value', (snap: any) => {
        chatsRef.off('value', listener);
        resolve(snap);
      });
    });

    if (!snapshot.val()) return;

    const chats = snapshot.val();
    let totalSize = 0;
    const allMessages: any[] = [];

    // Собираем все сообщения с их размерами
    for (const chatId in chats) {
      const messages = chats[chatId].messages || {};
      for (const msgId in messages) {
        const msg = messages[msgId];
        let size = 0;
        
        if (msg.photoUrl) {
          size = msg.photoUrl.length;
        } else if (msg.voiceData?.url) {
          size = msg.voiceData.url.length;
        } else if (msg.text) {
          size = msg.text.length;
        }
        
        if (size > 0) {
          totalSize += size;
          allMessages.push({
            chatId,
            msgId,
            size,
            timestamp: msg.timestamp || 0,
            type: msg.type
          });
        }
      }
    }

    console.log(`Общий размер сообщений: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

    // Если превышено 950MB, удаляем самые большие старые сообщения
    if (totalSize > 950 * 1024 * 1024) {
      console.log('Превышен лимит 950MB, удаляю большие старые сообщения...');
      
      // Сортируем по размеру (большие первыми) и времени (старые первыми)
      allMessages.sort((a, b) => {
        if (b.size !== a.size) return b.size - a.size;
        return a.timestamp - b.timestamp;
      });
      
      let deletedSize = 0;

      for (const msg of allMessages) {
        const msgRef = ref(database, `chats/${msg.chatId}/messages/${msg.msgId}`);
        await remove(msgRef);
        deletedSize += msg.size;
        totalSize -= msg.size;

        console.log(`Удалено сообщение (${(msg.size / 1024 / 1024).toFixed(2)}MB), осталось: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

        // Если очистили до 30MB, останавливаемся
        if (totalSize <= 30 * 1024 * 1024) {
          break;
        }
      }

      console.log(`Очистка завершена. Удалено: ${(deletedSize / 1024 / 1024).toFixed(2)}MB`);
    }
  } catch (error) {
    console.error('Ошибка при очистке сообщений:', error);
  }
};

export const scheduleWeeklyCleanup = (database: any, ref: any, remove: any) => {
  // Функция отключена - используется Firestore вместо Realtime Database
  console.log('Weekly cleanup disabled - using Firestore');
};
