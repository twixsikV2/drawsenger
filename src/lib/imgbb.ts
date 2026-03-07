export const uploadImageToImgBB = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('source', file);

    console.log('Uploading file to Freeimage.host:', file.name, file.size, file.type);

    const response = await fetch('https://freeimage.host/api/1/upload', {
      method: 'POST',
      body: formData
    });

    const responseText = await response.text();
    console.log('Freeimage.host response status:', response.status);
    console.log('Freeimage.host response:', responseText);

    if (!response.ok) {
      console.error('Freeimage.host error:', response.status, responseText);
      throw new Error(`Upload failed with status ${response.status}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      throw new Error('Invalid response format from Freeimage.host');
    }
    
    if (!data.image || !data.image.url) {
      console.error('No URL in response:', data);
      throw new Error('No file URL in response');
    }

    const fileUrl = data.image.url;
    console.log('File uploaded successfully:', fileUrl);
    return fileUrl;
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};
