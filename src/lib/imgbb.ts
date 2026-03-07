const API_KEY = '37c466cc-6525-459f-b7c5-43ab4e007686';
const API_URL = 'https://api.gifs.ru/api/v1/upload';

export const uploadImageToGifs = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    console.log('Загрузка на gifs.ru:', file.name);
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('gifs.ru Error Details:', data);
      throw new Error(data.message || 'Ошибка загрузки на gifs.ru');
    }

    const finalUrl = data.url || data.data?.url;
    if (!finalUrl) {
      throw new Error('Сервер не вернул ссылку на файл');
    }

    console.log('Успех! Ссылка:', finalUrl);
    return finalUrl;
  } catch (error: any) {
    console.error('Ошибка загрузки:', error.message);
    throw error;
  }
};

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
