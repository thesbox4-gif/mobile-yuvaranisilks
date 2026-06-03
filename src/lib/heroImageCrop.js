/** Hero saree photo: free crop region → 3:4 listing frame (web canvas). */

export const LISTING_ASPECT = 3 / 4;
const OUTPUT_W = 1200;
const OUTPUT_H = 1600;
const PAD_COLOR = '#fef7f0';

export function loadHtmlImage(uri) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image for crop'));
    img.src = uri;
  });
}

/** Image bounds when `resizeMode: contain` inside a box. */
export function containLayout(containerW, containerH, imgW, imgH) {
  if (!containerW || !containerH || !imgW || !imgH) return null;
  const scale = Math.min(containerW / imgW, containerH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return {
    x: (containerW - width) / 2,
    y: (containerH - height) / 2,
    width,
    height,
    scale,
  };
}

/** Normalized crop { left, top, right, bottom } in 0–1 image space. */
export function clampCrop(rect, minSpan = 0.08) {
  let { left, top, right, bottom } = rect;
  left = Math.max(0, Math.min(left, 1 - minSpan));
  top = Math.max(0, Math.min(top, 1 - minSpan));
  right = Math.max(left + minSpan, Math.min(right, 1));
  bottom = Math.max(top + minSpan, Math.min(bottom, 1));
  return { left, top, right, bottom };
}

export const FULL_CROP = { left: 0, top: 0, right: 1, bottom: 1 };

/** Display px → normalized image coords. */
export function displayToNorm(px, py, layout) {
  if (!layout?.width) return null;
  const nx = (px - layout.x) / layout.width;
  const ny = (py - layout.y) / layout.height;
  if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return null;
  return { nx, ny };
}

export function normToDisplay(rect, layout) {
  return {
    left: layout.x + rect.left * layout.width,
    top: layout.y + rect.top * layout.height,
    width: (rect.right - rect.left) * layout.width,
    height: (rect.bottom - rect.top) * layout.height,
  };
}

/**
 * Crop selection from image, then letterbox/cover into 3:4 (matches backend cover).
 */
export function renderCropTo34Canvas(img, crop) {
  const { left, top, right, bottom } = clampCrop(crop);
  const sx = Math.round(img.naturalWidth * left);
  const sy = Math.round(img.naturalHeight * top);
  const sw = Math.max(1, Math.round(img.naturalWidth * (right - left)));
  const sh = Math.max(1, Math.round(img.naturalHeight * (bottom - top)));

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_W;
  canvas.height = OUTPUT_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PAD_COLOR;
  ctx.fillRect(0, 0, OUTPUT_W, OUTPUT_H);

  const scale = Math.max(OUTPUT_W / sw, OUTPUT_H / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (OUTPUT_W - dw) / 2;
  const dy = (OUTPUT_H - dh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  return canvas;
}

export async function buildCroppedHeroAsset(previewUri, crop) {
  const img = await loadHtmlImage(previewUri);
  const canvas = renderCropTo34Canvas(img, crop);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Crop export failed'))),
      'image/jpeg',
      0.92
    );
  });
  const name = `saree-${Date.now()}.jpg`;
  const file = new File([blob], name, { type: 'image/jpeg' });
  return { file, name, uri: URL.createObjectURL(blob) };
}
