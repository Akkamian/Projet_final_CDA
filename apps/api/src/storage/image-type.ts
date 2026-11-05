export type ImageType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Extension déduite du type détecté : jamais de celle du nom d'origine (RG-PHO-03). */
export const EXTENSIONS: Record<ImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Type de l'image d'après les octets d'en-tête (RG-PHO-01) ; l'en-tête HTTP et le nom du fichier ne comptent pas. */
export function detectImageType(buffer: Buffer): ImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((byte, i) => buffer[i] === byte)) return 'image/png';
  // WebP : conteneur RIFF « RIFF ???? WEBP » (un WAV a aussi RIFF mais « WAVE »).
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
