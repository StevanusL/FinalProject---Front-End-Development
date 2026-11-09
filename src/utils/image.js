// Memperkecil foto dari kamera HP sebelum dikirim ke AI / disimpan ke db.json.
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => reject(new Error('File bukan gambar yang valid.'));
    img.src = url;
  });
}

function draw(img, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/** @returns {{ forAi: string, thumbnail: string, mimeType: string }} forAi = base64 tanpa prefiks */
export async function prepareLabelPhoto(file) {
  const img = await loadImage(file);
  const aiDataUrl = draw(img, 1280, 0.85);
  const thumbnail = draw(img, 480, 0.6);
  return { forAi: aiDataUrl.split(',')[1], thumbnail, mimeType: 'image/jpeg' };
}
