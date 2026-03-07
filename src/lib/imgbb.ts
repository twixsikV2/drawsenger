const IMGBB_API_KEY = '680420c6ba4e6359f73a825d3a91cb0d';

export const uploadImageToImgBB = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', IMGBB_API_KEY);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return data.data.url;
  } catch (error: any) {
    throw new Error(`Image upload failed: ${error.message}`);
  }
};
