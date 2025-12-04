/**
 * Image optimization utilities for standardizing image sizes and reducing file sizes
 */

// Standard image dimensions
export const IMAGE_STANDARDS = {
  LOGO: {
    width: 200,
    height: 200,
    maxSizeKB: 200, // Max file size in KB after compression
    quality: 0.85,
  },
  COVER_PHOTO: {
    width: 1200,
    height: 400,
    maxSizeKB: 500, // Max file size in KB after compression
    quality: 0.85,
  },
  BUSINESS_CARD: {
    width: 400,
    height: 280,
    maxSizeKB: 300, // Max file size in KB after compression
    quality: 0.85,
  },
  GALLERY: {
    width: 800,
    height: 800,
    maxSizeKB: 400, // Max file size in KB after compression
    quality: 0.85,
  },
} as const;

type ImageType = keyof typeof IMAGE_STANDARDS;

/**
 * Resize and compress an image file
 * @param file - The image file to optimize
 * @param type - The type of image (LOGO, COVER_PHOTO, BUSINESS_CARD, GALLERY)
 * @returns Promise<string> - Base64 encoded optimized image
 */
export async function optimizeImage(
  file: File,
  type: ImageType
): Promise<string> {
  const standard = IMAGE_STANDARDS[type];

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate dimensions maintaining aspect ratio
        let width: number = standard.width;
        let height: number = standard.height;
        const aspectRatio = img.width / img.height;

        if (type === 'LOGO' || type === 'GALLERY') {
          // Square images - crop to center
          const minDimension = Math.min(img.width, img.height);
          width = height = Math.min(minDimension, standard.width);
        } else if (type === 'COVER_PHOTO') {
          // Cover photo - maintain width, adjust height
          if (img.width > img.height) {
            width = standard.width;
            height = Math.round(standard.width / aspectRatio);
            if (height > standard.height) {
              height = standard.height;
              width = Math.round(standard.height * aspectRatio);
            }
          } else {
            height = standard.height;
            width = Math.round(standard.height * aspectRatio);
            if (width > standard.width) {
              width = standard.width;
              height = Math.round(standard.width / aspectRatio);
            }
          }
        } else if (type === 'BUSINESS_CARD') {
          // Business card - maintain aspect ratio within bounds
          if (img.width / img.height > standard.width / standard.height) {
            width = standard.width;
            height = Math.round(standard.width / aspectRatio);
          } else {
            height = standard.height;
            width = Math.round(standard.height * aspectRatio);
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression
        let quality: number = standard.quality;
        let base64 = canvas.toDataURL('image/jpeg', quality);

        // If still too large, reduce quality further
        const sizeKB = (base64.length * 3) / 4 / 1024; // Approximate size in KB
        if (sizeKB > standard.maxSizeKB) {
          quality = Math.max(0.5, standard.maxSizeKB / sizeKB * quality);
          base64 = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(base64);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error('Failed to read file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Convert file to base64 without optimization (for non-image files)
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        resolve(reader.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

