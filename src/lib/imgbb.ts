const CLOUD_NAME = 'dw0f44be';
const UPLOAD_PRESET = 'ml_default';

export const uploadImageToImgBB = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cloudinary Error Details:', data);
      throw new Error(data.error?.message || 'Ошибка загрузки');
    }

    console.log('Успех! Ссылка на фото:', data.secure_url);
    return data.secure_url;
  } catch (error: any) {
    console.error('Ошибка в функции:', error.message);
    throw error;
  }
};
