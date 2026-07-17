const MAX_EDGE = 480;
const JPEG_QUALITY = 0.82;
const MAX_BYTES = 120_000;

/** 실사 초상 업로드 — P2P hello에 실을 수 있도록 압축 */
export function compressPortrait(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('image load failed'));
      img.onload = () => {
        try {
          resolve(canvasToJpegDataUrl(img));
        } catch (e) {
          reject(e);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function canvasToJpegDataUrl(img: HTMLImageElement): string {
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unsupported');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  let q = JPEG_QUALITY;
  let url = canvas.toDataURL('image/jpeg', q);
  while (url.length > MAX_BYTES * 1.37 && q > 0.45) {
    q -= 0.08;
    url = canvas.toDataURL('image/jpeg', q);
  }
  if (url.length > MAX_BYTES * 1.37) {
    throw new Error('사진이 너무 큽니다. 더 작은 이미지를 사용해 주세요.');
  }
  return url;
}
