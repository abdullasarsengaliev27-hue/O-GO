import * as ImageManipulator from 'expo-image-manipulator';

// Сжимает фото любого размера до base64, который гарантированно
// помещается в лимит документа Firestore (1 МБ).
export async function compressToBase64(
  uri: string,
  opts: { maxWidth?: number; maxBytes?: number } = {}
): Promise<string> {
  const maxBytes = opts.maxBytes ?? 420 * 1024;
  let width = opts.maxWidth ?? 1280;
  let quality = 0.7;

  for (let attempt = 0; attempt < 8; attempt++) {
    const out = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    const b64 = out.base64 || '';
    const bytes = Math.floor(b64.length * 0.75);
    if (bytes <= maxBytes) return `data:image/jpeg;base64,${b64}`;
    // Слишком тяжёлое: сначала снижаем качество, затем размер
    if (quality > 0.35) quality -= 0.15;
    else width = Math.floor(width * 0.8);
  }
  throw new Error('Не удалось уменьшить фото. Выбери другое.');
}
