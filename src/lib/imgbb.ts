const GOFILE_TOKEN = 'qr3DHIcorZ7NJ5XdErpRHzILbQBI4eYb';

export const uploadImageToImgBB = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('token', GOFILE_TOKEN);

    console.log('Uploading file to Gofile.io:', file.name, file.size, file.type);

    const response = await fetch('https://api.gofile.io/uploadFile', {
      method: 'POST',
      body: formData
    });

    const responseText = await response.text();
    console.log('Gofile.io response status:', response.status);
    console.log('Gofile.io response:', responseText);

    if (!response.ok) {
      console.error('Gofile.io error:', response.status, responseText);
      throw new Error(`Upload failed with status ${response.status}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      throw new Error('Invalid response format from Gofile.io');
    }
    
    if (!data.data || !data.data.fileUrl) {
      console.error('No URL in response:', data);
      throw new Error('No file URL in response');
    }

    const fileUrl = data.data.fileUrl;
    console.log('File uploaded successfully:', fileUrl);
    return fileUrl;
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};
