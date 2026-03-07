const IMGBB_API_KEY = '680420c6ba4e6359f73a825d3a91cb0d';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

export const uploadImageToImgBB = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', IMGBB_API_KEY);

    console.log('Uploading file to ImgBB:', file.name, file.size, file.type);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });

    const responseText = await response.text();
    console.log('ImgBB response status:', response.status);

    if (!response.ok) {
      console.error('ImgBB error:', response.status, responseText);
      throw new Error(`Upload failed with status ${response.status}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      throw new Error('Invalid response format from ImgBB');
    }
    
    if (!data.data || !data.data.url) {
      console.error('No URL in response:', data);
      throw new Error('No file URL in response');
    }

    const fileUrl = data.data.url;
    console.log('File uploaded successfully:', fileUrl);
    return fileUrl;
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};
