export const uploadImageToImgBB = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('fileToUpload', file);
    formData.append('reqtype', 'fileupload');

    console.log('Uploading file to Catbox.moe:', file.name, file.size, file.type);

    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData
    });

    const responseText = await response.text();
    console.log('Catbox.moe response status:', response.status);
    console.log('Catbox.moe response:', responseText);

    if (!response.ok) {
      console.error('Catbox.moe error:', response.status, responseText);
      throw new Error(`Upload failed with status ${response.status}`);
    }

    // Catbox возвращает просто URL в текстовом формате
    const fileUrl = responseText.trim();
    
    if (!fileUrl || !fileUrl.startsWith('http')) {
      console.error('Invalid URL in response:', fileUrl);
      throw new Error('Invalid file URL in response');
    }

    console.log('File uploaded successfully:', fileUrl);
    return fileUrl;
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};
