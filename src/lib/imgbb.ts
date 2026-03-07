export const uploadImageToImgBB = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('filename', file);
    formData.append('username', 'DrawSenger');
    formData.append('access', 'true');

    console.log('Uploading file to 4file:', file.name, file.size, file.type);

    const response = await fetch('https://4-files.ru/api/upload.php', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    console.log('4file response:', data);

    // API возвращает direct_url или url
    const fileUrl = data.direct_url || data.url || data.link;
    
    if (!fileUrl) {
      console.error('No URL in response:', data);
      throw new Error('No file URL in response');
    }

    console.log('File uploaded successfully:', fileUrl);
    return fileUrl;
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};
