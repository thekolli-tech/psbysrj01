/**
 * Client-side avatar upload preparation utility.
 * Downscales and compresses user-selected images before upload to ensure
 * rapid transfer, low payload sizes, and high sharpness (up to 512x512).
 */

export const MAX_AVATAR_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB
export const ALLOWED_AVATAR_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];

export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
    return { valid: false, error: 'Image file must be 2MB or smaller.' };
  }

  if (!ALLOWED_AVATAR_UPLOAD_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Please upload a JPEG, PNG, WebP, or GIF image.'
    };
  }

  return { valid: true };
}

export function prepareAvatarUpload(file: File): Promise<string> {
  if (file.type === 'image/gif') {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(rawDataUrl);
      img.onload = () => {
        try {
          const MAX_DIM = 512;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (!width || !height) {
            resolve(rawDataUrl);
            return;
          }

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const compressed = canvas.toDataURL(outputType, 0.88);
          resolve(compressed);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}
