const API_KEY = '37c466cc-6525-459f-b7c5-43ab4e007686';
const API_URL = 'https://api.gifs.ru/api/v1/upload';

export const uploadImageToImgBB = async (file: File): Promise<string> => {
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
