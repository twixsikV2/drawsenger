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
    console.log('4file response:', responseText);

    if (!response.ok) {
      console.error('4file error:', response.status, responseText);
      throw new Error(`Upload failed with status ${response.status}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      throw new Error('Invalid response format from 4file');
    }
    
    if (!data.url) {
      console.error('No URL in response:', data);
      throw new Error('No file URL in response');
    }

    const fileUrl = `https://4-files.ru${data.url}`;
    console.log('File uploaded successfully:', fileUrl);
    return fileUrl;
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};
