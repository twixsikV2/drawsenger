export const uploadImageToPixeldrain = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://pixeldrain.com/api/file', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    const data = await response.json();
    // Возвращаем URL для просмотра файла
    return `https://pixeldrain.com/u/${data.id}`;
  } catch (error: any) {
    throw new Error(`File upload failed: ${error.message}`);
  }
};

// Оставляю старую функцию для совместимости
export const uploadImageToImgBB = uploadImageToPixeldrain;
