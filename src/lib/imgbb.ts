const PIXELDRAIN_API_KEY = 'e50f62db-f232-48e5-a4df-8707d823f6e7';

export const uploadImageToImgBB = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    console.log('Uploading file to Pixeldrain:', file.name, file.size, file.type);

    const response = await fetch('https://pixeldrain.com/api/file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PIXELDRAIN_API_KEY}`
      },
      body: formData
    });

    const responseText = await response.text();
    console.log('Pixeldrain response status:', response.status);
    console.log('Pixeldrain response:', responseText);

    if (!response.ok) {
      console.error('Pixeldrain error:', response.status, responseText);
      throw new Error(`Upload failed with status ${response.status}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      throw new Error('Invalid response format from Pixeldrain');
    }
    
    if (!data.id) {
      console.error('No ID in response:', data);
      throw new Error('No file ID in response');
    }

    const fileUrl = `https://pixeldrain.com/u/${data.id}`;
    console.log('File uploaded successfully:', fileUrl);
    return fileUrl;
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};
