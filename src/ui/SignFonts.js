let ready = false;

export const LOCAL_SIGN_FONT = '"Noto Sans Sinhala", "Noto Sans Tamil", Arial, sans-serif';

export async function loadSignFonts() {
  if (typeof document === 'undefined') return false;
  try {
    await Promise.all([
      document.fonts.load('700 48px "Noto Sans Sinhala"', 'බස් නැවතුම'),
      document.fonts.load('700 48px "Noto Sans Tamil"', 'பேருந்து நிறுத்தம்'),
    ]);
    ready = document.fonts.check('700 48px "Noto Sans Sinhala"', 'බස්')
      && document.fonts.check('700 48px "Noto Sans Tamil"', 'பேருந்து');
  } catch {
    ready = false;
  }
  return ready;
}

export function hasLocalSignFonts() {
  return ready;
}
