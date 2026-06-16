import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/** Fast picker defaults — smaller files, no EXIF, no built-in crop UI. */
export const FAST_PICKER_OPTIONS = {
  mediaTypes: ['images'],
  quality: 0.62,
  exif: false,
  allowsEditing: false,
};

const MAX_DIMENSION = 1600;
const WEB_JPEG_QUALITY = 0.78;

function loadHtmlImage(uri) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = uri;
  });
}

async function canvasToAsset(canvas, name = 'photo.jpg') {
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not compress image'))),
      'image/jpeg',
      WEB_JPEG_QUALITY,
    );
  });
  const file = new File([blob], name, { type: 'image/jpeg' });
  const uri = URL.createObjectURL(blob);
  return {
    uri,
    file,
    name: file.name,
    width: canvas.width,
    height: canvas.height,
    mimeType: 'image/jpeg',
    type: 'image',
  };
}

async function compressWebImage(img, name) {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  return canvasToAsset(canvas, name);
}

/**
 * Resize + compress before upload. Native relies on picker quality; web uses canvas JPEG.
 */
export async function prepareImageForUpload(asset) {
  if (!asset?.uri) return asset;

  if (Platform.OS === 'web') {
    try {
      if (asset.file) {
        const img = await loadHtmlImage(URL.createObjectURL(asset.file));
        return await compressWebImage(img, asset.file.name || asset.fileName || 'photo.jpg');
      }
      const img = await loadHtmlImage(asset.uri);
      return await compressWebImage(img, asset.fileName || 'photo.jpg');
    } catch {
      return asset;
    }
  }

  return asset;
}

/** Merge fast defaults with optional crop overrides for hero slots. */
export function buildPickerOptions({ forceCrop = false } = {}) {
  if (!forceCrop) return { ...FAST_PICKER_OPTIONS };

  return {
    ...FAST_PICKER_OPTIONS,
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.72,
  };
}

/** Legacy MediaTypeOptions alias for older call sites. */
export const PICKER_MEDIA_TYPES = ImagePicker.MediaTypeOptions?.Images ?? ['images'];
