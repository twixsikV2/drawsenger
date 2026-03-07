const CLOUD_NAME = 'dvy0f64be';
const UPLOAD_PRESET = 'ml_default';

export const uploadImageToImgBB = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    console.log('Uploading file to Cloudinary:', file.name, file.size, file.type);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Ошибка загрузки в Cloudinary');
    }

    console.log('Успешно загружено:', data.secure_url);
    return data.secure_url;
  } catch (error: any) {
    console.error('Ошибка при загрузке файла:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};
