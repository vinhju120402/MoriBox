import { getSupabase } from './supabase';

const BUCKET = 'product-images';
const MAX_SIDE = 1600;

// Downscale a photo so a phone picture (often 5–10 MB) becomes a few hundred KB.
async function dataUrlToBlob(dataUrl: string): Promise<{ blob: Blob; ext: string }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('image_decode_failed'));
    el.src = dataUrl;
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (const [type, ext] of [['image/webp', 'webp'], ['image/jpeg', 'jpg']] as const) {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, 0.85));
    if (blob && blob.type === type) return { blob, ext };
  }
  throw new Error('encode_failed');
}

// Uploads a data-URL photo to Supabase Storage and returns its public URL.
export async function uploadProductImage(dataUrl: string): Promise<string> {
  const { blob, ext } = await dataUrlToBlob(dataUrl);
  const path = `${crypto.randomUUID()}.${ext}`;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: '31536000',
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Replaces any data-URL image with an uploaded one. If Storage isn't available
// (e.g. the bucket SQL has not been run yet) the photo is kept inline so saving
// still works.
export async function resolveImage(src: string): Promise<string> {
  if (!src.startsWith('data:')) return src;
  try {
    return await uploadProductImage(src);
  } catch (e) {
    console.warn('Image upload failed, keeping the photo inline', e);
    return src;
  }
}
