import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadImageToImgBB = async (file: File): Promise<string> => {
  try {
    console.log('Uploading file to Firebase Storage:', file.name, file.size, file.type);

    // Создаем уникальное имя файла
    const fileName = `${Date.now()}_${file.name}`;
    const fileRef = ref(storage, `uploads/${fileName}`);

    // Загружаем файл
    await uploadBytes(fileRef, file);

    // Получаем URL для скачивания
    const downloadURL = await getDownloadURL(fileRef);
    console.log('File uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};
