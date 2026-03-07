export const uploadImageToImgBB = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('filename', file);
    formData.append('access', 'true');

    console.log('Uploading file to 4file:', file.name, file.size, file.type);

    const response = await fetch('https://4-files.ru/api/upload.php', {
      method: 'POST',
      body: formData
    });

    const responseText = await response.text();
    console.log('4file response status:', response.status);
    console.log('4file full response:', responseText);
    console.log('4file response length:', responseText.length);

    if (!response.ok) {
      console.error('4file error:', response.status, responseText);
      throw new Error(`Upload failed with status ${response.status}`);
    }

    // Пытаемся парсить как JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed as JSON:', data);
      
      if (data.url) {
        const fileUrl = `https://4-files.ru${data.url}`;
        console.log('File uploaded successfully (JSON):', fileUrl);
        return fileUrl;
      }
    } catch (e) {
      console.log('Not JSON, trying to extract URL from text');
    }

    // Если не JSON, пытаемся извлечь URL из текста
    const urlMatch = responseText.match(/https?:\/\/[^\s"<>]+/);
    if (urlMatch) {
      const fileUrl = urlMatch[0];
      console.log('File uploaded successfully (extracted):', fileUrl);
      return fileUrl;
    }

    // Если ничего не сработало, выводим весь ответ
    console.error('Could not extract URL from response:', responseText);
    throw new Error('No file URL found in response');
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};
