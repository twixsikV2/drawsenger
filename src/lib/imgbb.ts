export const uploadImageToPixeldrain = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    console.log('Uploading file to Pixeldrain:', file.name, file.size, file.type);

    const response = await fetch('https://pixeldrain.com/api/file', {
      method: 'POST',
      body: formData
    });

    const responseText = await response.text();
    console.log('Pixeldrain response status:', response.status);
    console.log('Pixeldrain response:', responseText);

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      throw new Error('Invalid response format from Pixeldrain');
    }
    
    // Проверяем разные возможные форматы ответа
    if (!data.id) {
      console.error('No ID in response:', data);
      throw new Error('No file ID in response');
    }

    // Возвращаем URL для просмотра файла
    const fileUrl = `https://pixeldrain.com/u/${data.id}`;
    console.log('File uploaded successfully:', fileUrl);
    return fileUrl;
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};

// Оставляю старую функцию для совместимости
export const uploadImageToImgBB = uploadImageToPixeldrain;
